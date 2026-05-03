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
  typeTheorique: string | null;
  risque: string | null;
  examensCliniques: string | null;
  observations: string | null;
  decisionAptitude: string | null;
  orientationSoins: string | null;
  examenRadio: string | null;
  bilan: string | null;
};
type RegistreRow = {
  id: number; matricule: string; nom: string; prenom: string;
  direction: string | null; service: string | null; posteActuel: string | null;
  age: number | null;
  latestVisite: LatestVisite | null;
};
type RegistreResponse = { total: number; rows: RegistreRow[]; directions: string[] };

/* ═══════════════════════════════════════════════════════════════════════════
   ABRÉVIATIONS
═══════════════════════════════════════════════════════════════════════════ */
type AbrevEntry = { abbr: string; label: string; signification: string; color: string; keywords?: string[] };

const ABREVIATIONS: AbrevEntry[] = [
  { abbr: "S",               label: "S",               signification: "Agents sédentaires",                                                  color: "slate"                                            },
  { abbr: "A",               label: "A",               signification: "Agents actifs",                                                       color: "slate"                                            },
  { abbr: "VMA",             label: "VMA",             signification: "Visite médicale annuelle",                                            color: "blue",   keywords: ["ANNUEL","PERIODIQUE ANNUEL"] },
  { abbr: "VMSLE",           label: "VMSle",           signification: "Visite médicale semestrielle",                                        color: "purple", keywords: ["SEMEST","BIMESTR","BIANNUEL"] },
  { abbr: "VMC",             label: "VMC",             signification: "Visite Médicale Circonstancielle",                                    color: "orange", keywords: ["CIRCONSTAN"]                  },
  { abbr: "CV",              label: "CV",              signification: "Contrôle Visite",                                                     color: "teal",   keywords: ["CONTROLE VISITE"]             },
  { abbr: "VM SPONTANEE",    label: "VM Spontanée",    signification: "Visite Médicale Spontanée",                                           color: "gray",   keywords: ["SPONTAN","A LA DEMANDE","DEMANDE"] },
  { abbr: "EMBAUCHE",        label: "Embauche",        signification: "Visite d'embauche",                                                   color: "teal",   keywords: ["EMBAUCHE","EMBAUCH"]          },
  { abbr: "REPRISE",         label: "Reprise",         signification: "Visite de reprise",                                                   color: "indigo", keywords: ["REPRISE"]                     },
  { abbr: "HE",              label: "HE",              signification: "Habilitation électrique, manœuvres et travaux",                       color: "amber"                                            },
  { abbr: "HMEC",            label: "HMEC",            signification: "Habilitation mécanique",                                              color: "amber"                                            },
  { abbr: "HTH",             label: "HTH",             signification: "Habilitation aux travaux en hauteur",                                 color: "amber"                                            },
  { abbr: "HCVS",            label: "HCVS",            signification: "Habilitation à la conduite des véhicules de service",                 color: "amber"                                            },
  { abbr: "PP",              label: "PP",              signification: "Pourvoi de Poste",                                                    color: "indigo"                                           },
  { abbr: "TITUL",           label: "TITUL",           signification: "Titularisation",                                                      color: "indigo"                                           },
  { abbr: "CA",              label: "CA",              signification: "Contrôle d'aptitude",                                                 color: "emerald"                                          },
  { abbr: "CA ANTICIPEE",    label: "CA Anticipée",    signification: "Contrôle d'aptitude — Retraite Anticipée",                            color: "emerald"                                          },
  { abbr: "CA PROLONGATION", label: "CA Prolongation", signification: "Contrôle d'aptitude — Prolongation d'activité",                       color: "emerald"                                          },
  { abbr: "CA MATERNITE",    label: "CA Maternité",    signification: "Contrôle d'aptitude — Après congé de maternité",                      color: "emerald"                                          },
  { abbr: "CA ABS 21 JRS",   label: "CA Abs-21 jrs",   signification: "Contrôle d'aptitude — Après absence pour raison de santé (> 21 j)",   color: "emerald"                                          },
  { abbr: "CA AT",           label: "CA AT",           signification: "Contrôle d'aptitude — Après accident du travail",                     color: "emerald"                                          },
  { abbr: "CA RM TEMP",      label: "CA-RM Temp",      signification: "Contrôle d'aptitude — Après restriction médicale temporaire",         color: "emerald"                                          },
  { abbr: "CA REGISSEUR",    label: "CA-Régisseur",    signification: "Contrôle d'aptitude — Nomination au poste de régisseur de caisse",    color: "emerald"                                          },
  { abbr: "CA MUTATION",     label: "CA-Mutation",     signification: "Contrôle d'aptitude — Mutation",                                      color: "emerald"                                          },
  { abbr: "CA CHGT FONCTION",label: "CA Chgt-Fonction",signification: "Contrôle d'aptitude — Changement de fonction",                        color: "emerald"                                          },
  { abbr: "CA ABS REPET",    label: "CA Abs-Répét",    signification: "Contrôle d'aptitude — Absences répétées",                             color: "emerald"                                          },
  { abbr: "CMLD",            label: "CMLD",            signification: "Congé de maladie de longue durée",                                    color: "red"                                              },
];

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
  slate:   "bg-slate-100 text-slate-500 border-slate-200",
};

function normalizeAbr(s: string) {
  return s.toUpperCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]/g, " ").replace(/[^A-Z0-9 ]/g, "").trim();
}

function matchAbrev(typeVisite: string): AbrevEntry | null {
  const n = normalizeAbr(typeVisite);
  const exact = ABREVIATIONS.find((a) => a.abbr === n);
  if (exact) return exact;
  const sorted = [...ABREVIATIONS].sort((a, b) => b.abbr.length - a.abbr.length);
  for (const a of sorted) {
    if (n.startsWith(a.abbr) || a.abbr.startsWith(n)) return a;
  }
  const withKw = ABREVIATIONS.filter((a) => a.keywords?.length).sort(
    (a, b) => Math.max(...(b.keywords!.map((k) => k.length))) - Math.max(...(a.keywords!.map((k) => k.length)))
  );
  for (const a of withKw) {
    if (a.keywords!.some((kw) => n.includes(kw))) return a;
  }
  for (const a of sorted) { if (n.includes(a.abbr)) return a; }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   BADGE HELPERS
═══════════════════════════════════════════════════════════════════════════ */
function DecisionBadge({ d }: { d: string | null }) {
  if (!d) return <span className="text-xs text-muted-foreground">—</span>;
  const map: Record<string, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
    APTE:              { label: "APTE",              cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle2 },
    INAPTE:            { label: "INAPTE",            cls: "bg-red-50 text-red-700 border-red-200",             Icon: XCircle },
    APTE_SOUS_RESERVE: { label: "APT. SOUS RÉSERVE", cls: "bg-amber-50 text-amber-700 border-amber-200",       Icon: AlertCircle },
  };
  const m = map[d];
  if (!m) return <span className="text-xs text-muted-foreground">{d}</span>;
  const { Icon } = m;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap", m.cls)}>
      <Icon className="w-3 h-3" />{m.label}
    </span>
  );
}

function VisitTypeBadge({ t }: { t: string | null }) {
  if (!t) return <span className="text-xs text-muted-foreground">—</span>;
  const match = matchAbrev(t);
  if (!match) return <span className="text-xs text-muted-foreground font-mono">{t}</span>;
  return (
    <span className={cn("inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap", COLOR_CLS[match.color])}>
      {match.label}
    </span>
  );
}

/* Short cell text helper */
function Cell({ v, mono }: { v: string | null | undefined; mono?: boolean }) {
  if (!v) return <span className="text-muted-foreground/50 text-xs">—</span>;
  return (
    <span
      className={cn("text-xs text-foreground leading-snug", mono && "font-mono")}
      title={v}
    >
      {v.length > 28 ? v.slice(0, 26) + "…" : v}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LÉGENDE COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
const GROUPS = [
  { title: "Profils", colors: ["slate"] },
  { title: "Visites de suivi", colors: ["blue", "purple", "orange", "teal", "gray", "indigo"] },
  { title: "Habilitations", colors: ["amber"] },
  { title: "Contrôles d'aptitude (CA)", colors: ["emerald"] },
  { title: "Congé maladie", colors: ["red"] },
];

function Legende() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted/20 transition-colors"
      >
        <span className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          Abréviations — Terminologie officielle
          <span className="text-xs font-normal text-muted-foreground">({ABREVIATIONS.length} entrées)</span>
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t border-border p-5 space-y-4">
          {GROUPS.map((grp) => {
            const items = ABREVIATIONS.filter((a) => grp.colors.includes(a.color));
            if (!items.length) return null;
            return (
              <div key={grp.title}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{grp.title}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-1.5">
                  {items.map((a) => (
                    <div key={a.abbr} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50">
                      <span className={cn("inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 mt-0.5", COLOR_CLS[a.color])}>
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

  /* Column headers */
  const TH = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <th className={cn("text-left px-3 py-2.5 font-semibold whitespace-nowrap text-[10px] uppercase tracking-wide text-muted-foreground", className)}>
      {children}
    </th>
  );

  return (
    <div className="p-6 max-w-full mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Registre des Activités Médicales
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {data ? `${data.total} agent(s) enregistré(s)` : "Chargement…"}
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
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            value={direction}
            onChange={(e) => { setDirection(e.target.value); setPage(1); }}
            className="pl-9 pr-8 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none min-w-44"
          >
            <option value="">Toutes les directions</option>
            {data?.directions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Table — horizontal scroll */}
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
            <table className="w-full text-sm border-collapse">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <TH>Matricule</TH>
                  <TH>Date VM</TH>
                  <TH>Dir</TH>
                  <TH>Service</TH>
                  <TH>Fonction</TH>
                  <TH>Risque</TH>
                  <TH>VMC</TH>
                  <TH>Ex. Clinique</TH>
                  <TH>Décision &amp; Observations</TH>
                  <TH className="max-w-32">Orientation Cs MT / Soins</TH>
                  <TH>Examen Radio</TH>
                  <TH>Bilan (bio)</TH>
                  <TH></TH>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {data.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/20 transition-colors group">
                    {/* Matricule + nom (stacked) */}
                    <td className="px-3 py-2.5 min-w-[120px]">
                      <p className="font-mono text-xs font-bold text-primary">{row.matricule}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{row.nom} {row.prenom}</p>
                    </td>
                    {/* Date VM */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {row.latestVisite
                        ? <span className="text-xs font-medium">{row.latestVisite.dateVisite}</span>
                        : <span className="text-xs text-muted-foreground/50 italic">—</span>}
                    </td>
                    {/* Dir */}
                    <td className="px-3 py-2.5 min-w-[80px]">
                      <Cell v={row.direction} />
                    </td>
                    {/* Service */}
                    <td className="px-3 py-2.5 min-w-[90px]">
                      <Cell v={row.service} />
                    </td>
                    {/* Fonction */}
                    <td className="px-3 py-2.5 min-w-[110px]">
                      <Cell v={row.posteActuel} />
                    </td>
                    {/* Risque */}
                    <td className="px-3 py-2.5 min-w-[90px]">
                      <Cell v={row.latestVisite?.risque ?? null} />
                    </td>
                    {/* VMC — type théorique calculé + type saisi */}
                    <td className="px-3 py-2.5 min-w-[110px]">
                      {row.latestVisite ? (
                        <div className="flex flex-col gap-1">
                          {/* Computed type — always shown */}
                          <div className="flex items-center gap-1">
                            <VisitTypeBadge t={row.latestVisite.typeTheorique} />
                            <span className="text-[9px] text-muted-foreground/60">calc.</span>
                          </div>
                          {/* Stored type — only if different from computed */}
                          {row.latestVisite.typeVisite &&
                           row.latestVisite.typeVisite !== row.latestVisite.typeTheorique && (
                            <div className="flex items-center gap-1">
                              <VisitTypeBadge t={row.latestVisite.typeVisite} />
                              <span className="text-[9px] text-amber-500">saisi</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50 text-xs">—</span>
                      )}
                    </td>
                    {/* Ex. clinique */}
                    <td className="px-3 py-2.5 min-w-[120px]">
                      <Cell v={row.latestVisite?.examensCliniques ?? null} />
                    </td>
                    {/* Décision & observations */}
                    <td className="px-3 py-2.5 min-w-[160px]">
                      <div className="space-y-1">
                        <DecisionBadge d={row.latestVisite?.decisionAptitude ?? null} />
                        {row.latestVisite?.observations && (
                          <p className="text-[11px] text-muted-foreground leading-snug" title={row.latestVisite.observations}>
                            {row.latestVisite.observations.length > 40
                              ? row.latestVisite.observations.slice(0, 38) + "…"
                              : row.latestVisite.observations}
                          </p>
                        )}
                      </div>
                    </td>
                    {/* Orientation */}
                    <td className="px-3 py-2.5 min-w-[120px]">
                      <Cell v={row.latestVisite?.orientationSoins ?? null} />
                    </td>
                    {/* Examen radio */}
                    <td className="px-3 py-2.5 min-w-[100px]">
                      <Cell v={row.latestVisite?.examenRadio ?? null} />
                    </td>
                    {/* Bilan bio */}
                    <td className="px-3 py-2.5 min-w-[100px]">
                      <Cell v={row.latestVisite?.bilan ?? null} />
                    </td>
                    {/* Fiche link */}
                    <td className="px-3 py-2.5">
                      <Link href={`/employees/${row.matricule}`}
                        className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
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

      {/* Légende */}
      <Legende />
    </div>
  );
}
