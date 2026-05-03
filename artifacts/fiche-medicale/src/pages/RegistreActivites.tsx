import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import {
  Search, ChevronLeft, ChevronRight, Loader2, Users,
  Filter, ChevronRight as Arrow, CheckCircle2, XCircle, AlertCircle,
  ClipboardList, BookOpen, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */
type LatestVisite = {
  dateVisite: string;
  typeVisite: string | null;
  decisionAptitude: string | null;
};
type RegistreRow = {
  id: number; matricule: string; nom: string; prenom: string;
  direction: string | null; service: string | null; posteActuel: string | null;
  dateNaissance: string | null; dateEmbauche: string | null; age: number | null;
  latestVisite: LatestVisite | null;
};
type RegistreResponse = { total: number; rows: RegistreRow[]; directions: string[] };

/* ═══════════════════════════════════════════════════════════════════════════
   ABRÉVIATIONS — source : fichier de référence officiel
═══════════════════════════════════════════════════════════════════════════ */
type AbrevEntry = { abbr: string; label: string; signification: string; color: string; keywords?: string[] };

const ABREVIATIONS: AbrevEntry[] = [
  /* Profils */
  { abbr: "S",              label: "S",              signification: "Agents sédentaires",                                                          color: "slate"                                    },
  { abbr: "A",              label: "A",              signification: "Agents actifs",                                                               color: "slate"                                    },
  /* Visites de suivi */
  { abbr: "VMA",            label: "VMA",            signification: "Visite médicale annuelle",                                                    color: "blue",   keywords: ["ANNUEL","PERIODIQUE ANNUEL","VISITE ANNUEL"] },
  { abbr: "VMSLE",          label: "VMSle",          signification: "Visite médicale semestrielle",                                                color: "purple", keywords: ["SEMEST","SEMESTR","BIMESTR","BIANNUEL"]     },
  { abbr: "VMC",            label: "VMC",            signification: "Visite Médicale Circonstancielle",                                           color: "orange", keywords: ["CIRCONSTAN"]                               },
  { abbr: "CV",             label: "CV",             signification: "Contrôle Visite",                                                            color: "teal",   keywords: ["CONTROLE VISITE"]                          },
  { abbr: "VM SPONTANEE",   label: "VM Spontanée",   signification: "Visite Médicale Spontanée",                                                   color: "gray",   keywords: ["SPONTAN","DEMANDE","A LA DEMANDE"]         },
  { abbr: "EMBAUCHE",       label: "Embauche",       signification: "Visite d'embauche",                                                           color: "teal",   keywords: ["EMBAUCHE","EMBAUCH"]                       },
  { abbr: "REPRISE",        label: "Reprise",        signification: "Visite de reprise",                                                           color: "indigo", keywords: ["REPRISE"]                                  },
  /* Habilitations */
  { abbr: "HE",             label: "HE",             signification: "Habilitation électrique, manœuvres et travaux",                              color: "amber"   },
  { abbr: "HMEC",           label: "HMEC",           signification: "Habilitation mécanique",                                                     color: "amber"   },
  { abbr: "HTH",            label: "HTH",            signification: "Habilitation aux travaux en hauteur",                                        color: "amber"   },
  { abbr: "HCVS",           label: "HCVS",           signification: "Habilitation à la conduite des véhicules de service",                        color: "amber"   },
  /* Administratif */
  { abbr: "PP",             label: "PP",             signification: "Pourvoi de Poste",                                                           color: "indigo"  },
  { abbr: "TITUL",          label: "TITUL",          signification: "Titularisation",                                                             color: "indigo"  },
  /* Contrôles d'aptitude */
  { abbr: "CA",             label: "CA",             signification: "Contrôle d'aptitude",                                                       color: "emerald" },
  { abbr: "CA ANTICIPEE",   label: "CA Anticipée",   signification: "Contrôle d'aptitude — Retraite Anticipée",                                   color: "emerald" },
  { abbr: "CA PROLONGATION",label: "CA Prolongation",signification: "Contrôle d'aptitude — Prolongation d'activité",                              color: "emerald" },
  { abbr: "CA MATERNITE",   label: "CA Maternité",   signification: "Contrôle d'aptitude — Après congé de maternité",                             color: "emerald" },
  { abbr: "CA ABS 21 JRS",  label: "CA Abs-21 jrs",  signification: "Contrôle d'aptitude — Après absence pour raison de santé (> 21 jours)",      color: "emerald" },
  { abbr: "CA AT",          label: "CA AT",          signification: "Contrôle d'aptitude — Après accident du travail",                            color: "emerald" },
  { abbr: "CA RM TEMP",     label: "CA-RM Temp",     signification: "Contrôle d'aptitude — Après restriction médicale temporaire",                color: "emerald" },
  { abbr: "CA REGISSEUR",   label: "CA-Régisseur",   signification: "Contrôle d'aptitude — Nomination au poste de régisseur de caisse",           color: "emerald" },
  { abbr: "CA MUTATION",    label: "CA-Mutation",    signification: "Contrôle d'aptitude — Mutation",                                             color: "emerald" },
  { abbr: "CA CHGT FONCTION",label:"CA Chgt-Fonction",signification: "Contrôle d'aptitude — Changement de fonction",                             color: "emerald" },
  { abbr: "CA ABS REPET",   label: "CA Abs-Répét",   signification: "Contrôle d'aptitude — Absences répétées",                                    color: "emerald" },
  /* Congé maladie */
  { abbr: "CMLD",           label: "CMLD",           signification: "Congé de maladie de longue durée",                                           color: "red"     },
];

/* Color → Tailwind classes */
const COLOR_CLS: Record<string, string> = {
  blue:    "bg-blue-50 text-blue-700 border-blue-200",
  purple:  "bg-purple-50 text-purple-700 border-purple-200",
  orange:  "bg-orange-50 text-orange-700 border-orange-200",
  teal:    "bg-teal-50 text-teal-700 border-teal-200",
  gray:    "bg-slate-50 text-slate-600 border-slate-200",
  amber:   "bg-amber-50 text-amber-700 border-amber-200",
  indigo:  "bg-indigo-50 text-indigo-700 border-indigo-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  red:     "bg-red-50 text-red-700 border-red-200",
  slate:   "bg-slate-50 text-slate-500 border-slate-200",
};
const COLOR_HDR: Record<string, string> = {
  blue:    "bg-blue-100 text-blue-800",
  purple:  "bg-purple-100 text-purple-800",
  orange:  "bg-orange-100 text-orange-800",
  teal:    "bg-teal-100 text-teal-800",
  gray:    "bg-slate-100 text-slate-600",
  amber:   "bg-amber-100 text-amber-800",
  indigo:  "bg-indigo-100 text-indigo-800",
  emerald: "bg-emerald-100 text-emerald-800",
  red:     "bg-red-100 text-red-800",
  slate:   "bg-slate-100 text-slate-600",
};

function normalizeAbr(s: string) {
  return s.toUpperCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]/g, " ")
    .replace(/[^A-Z0-9 ]/g, "")
    .trim();
}

function matchAbrev(typeVisite: string): AbrevEntry | null {
  const n = normalizeAbr(typeVisite);
  // 1. Exact abbr match
  const exact = ABREVIATIONS.find((a) => a.abbr === n);
  if (exact) return exact;
  // 2. Starts-with abbr (longest first)
  const sorted = [...ABREVIATIONS].sort((a, b) => b.abbr.length - a.abbr.length);
  for (const a of sorted) {
    if (n.startsWith(a.abbr) || a.abbr.startsWith(n)) return a;
  }
  // 3. Keyword match (longer keywords first to be most specific)
  const withKw = ABREVIATIONS.filter((a) => a.keywords?.length).sort(
    (a, b) => Math.max(...(b.keywords!.map((k) => k.length))) - Math.max(...(a.keywords!.map((k) => k.length)))
  );
  for (const a of withKw) {
    if (a.keywords!.some((kw) => n.includes(kw))) return a;
  }
  // 4. Abbr contains / contained in normalized input
  for (const a of sorted) {
    if (n.includes(a.abbr)) return a;
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   BADGE HELPERS
═══════════════════════════════════════════════════════════════════════════ */
function decisionBadge(d: string | null) {
  if (!d) return null;
  const map: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
    APTE:             { label: "APTE",             cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    INAPTE:           { label: "INAPTE",           cls: "bg-red-50 text-red-700 border-red-200",             icon: XCircle },
    APTE_SOUS_RESERVE:{ label: "APT. SOUS RÉSERVE",cls: "bg-amber-50 text-amber-700 border-amber-200",       icon: AlertCircle },
  };
  const m = map[d];
  if (!m) return <span className="text-xs text-muted-foreground">{d}</span>;
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border", m.cls)}>
      <Icon className="w-3 h-3" />{m.label}
    </span>
  );
}

function VisitTypeBadge({ t }: { t: string | null }) {
  if (!t) return <span className="text-xs text-muted-foreground">—</span>;
  const match = matchAbrev(t);
  if (!match) return <span className="text-xs text-muted-foreground font-mono">{t}</span>;
  return (
    <span className={cn("inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border", COLOR_CLS[match.color])}>
      {match.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LÉGENDE COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
const GROUPS = [
  { title: "Profils agents", colors: ["slate"], label: "text-slate-600" },
  { title: "Visites de suivi", colors: ["blue", "purple", "orange", "teal", "gray"], label: "text-blue-700" },
  { title: "Habilitations", colors: ["amber"], label: "text-amber-700" },
  { title: "Administratif", colors: ["indigo"], label: "text-indigo-700" },
  { title: "Contrôles d'aptitude (CA)", colors: ["emerald"], label: "text-emerald-700" },
  { title: "Congé maladie", colors: ["red"], label: "text-red-700" },
];

function Legende() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-muted/20 transition-colors"
      >
        <span className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          Abréviations — Terminologie officielle
          <span className="text-xs font-normal text-muted-foreground">({ABREVIATIONS.length} entrées)</span>
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border p-5 space-y-5">
          {GROUPS.map((grp) => {
            const items = ABREVIATIONS.filter((a) => grp.colors.includes(a.color));
            if (!items.length) return null;
            const sampleColor = grp.colors[0];
            return (
              <div key={grp.title}>
                <p className={cn("text-xs font-bold uppercase tracking-wider mb-2", grp.label)}>
                  {grp.title}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                  {items.map((a) => (
                    <div key={a.abbr} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-muted/30 border border-border/50">
                      <span className={cn(
                        "inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 mt-0.5",
                        COLOR_CLS[a.color]
                      )}>
                        {a.label}
                      </span>
                      <span className="text-xs text-muted-foreground leading-snug">{a.signification}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
const LIMIT = 20;

export default function RegistreActivites() {
  const [search, setSearch]       = useState("");
  const [direction, setDirection] = useState("");
  const [page, setPage]           = useState(1);
  const [data, setData]           = useState<RegistreResponse | null>(null);
  const [loading, setLoading]     = useState(true);

  const debouncedSearch = useDebounce(search, 350);

  const load = useCallback(async (s: string, dir: string, pg: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg), limit: String(LIMIT) });
      if (s) params.set("search", s);
      if (dir) params.set("direction", dir);
      const res = await fetch(`/api/registre-activites?${params}`);
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { setPage(1); load(debouncedSearch, direction, 1); }, [debouncedSearch, direction, load]);
  useEffect(() => { load(debouncedSearch, direction, page); }, [page]); // eslint-disable-line

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Registre des Activités Médicales
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Suivi des visites par agent — {data ? `${data.total} agent(s) enregistré(s)` : "Chargement…"}
          </p>
        </div>
        <Link href="/employees/new">
          <Button variant="outline" size="sm" className="gap-2">
            <Users className="w-4 h-4" />Nouvel agent
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text" placeholder="Nom, prénom ou matricule…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            value={direction}
            onChange={(e) => { setDirection(e.target.value); setPage(1); }}
            className="pl-9 pr-8 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none min-w-48"
          >
            <option value="">Toutes les directions</option>
            {data?.directions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
        {!loading && data?.rows.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun agent trouvé</p>
          </div>
        )}
        {!loading && data && data.rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-semibold">Matricule</th>
                  <th className="text-left px-4 py-3 font-semibold">Nom & Prénom</th>
                  <th className="text-left px-4 py-3 font-semibold">Direction</th>
                  <th className="text-left px-4 py-3 font-semibold">Service</th>
                  <th className="text-left px-4 py-3 font-semibold">Fonction</th>
                  <th className="text-left px-4 py-3 font-semibold">Âge</th>
                  <th className="text-left px-4 py-3 font-semibold">Dernière visite</th>
                  <th className="text-left px-4 py-3 font-semibold">Type</th>
                  <th className="text-left px-4 py-3 font-semibold">Décision</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {data.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-primary">{row.matricule}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-foreground">{row.nom} {row.prenom}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{row.direction ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{row.service ?? "—"}</td>
                    <td className="px-4 py-3 text-xs max-w-36 truncate text-muted-foreground">{row.posteActuel ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-center text-muted-foreground">
                      {row.age ? `${row.age} ans` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {row.latestVisite
                        ? <span className="font-medium">{row.latestVisite.dateVisite}</span>
                        : <span className="text-muted-foreground italic">Aucune visite</span>}
                    </td>
                    <td className="px-4 py-3">
                      <VisitTypeBadge t={row.latestVisite?.typeVisite ?? null} />
                    </td>
                    <td className="px-4 py-3">
                      {row.latestVisite
                        ? decisionBadge(row.latestVisite.decisionAptitude)
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/employees/${row.matricule}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        Fiche <Arrow className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground text-xs">
            Page {page} / {totalPages} — {data.total} agent(s)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Précédent
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="gap-1">
              Suivant <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Légende des abréviations */}
      <Legende />
    </div>
  );
}
