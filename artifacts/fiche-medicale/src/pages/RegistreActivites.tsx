import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import {
  Search, ChevronLeft, ChevronRight, Loader2, Users,
  Filter, ChevronRight as Arrow, CheckCircle2, XCircle, AlertCircle,
  ClipboardList,
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
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  direction: string | null;
  service: string | null;
  posteActuel: string | null;
  dateNaissance: string | null;
  dateEmbauche: string | null;
  age: number | null;
  latestVisite: LatestVisite | null;
};

type RegistreResponse = {
  total: number;
  rows: RegistreRow[];
  directions: string[];
};

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */
function decisionBadge(d: string | null) {
  if (!d) return null;
  const map: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
    APTE:            { label: "APTE",            cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    INAPTE:          { label: "INAPTE",          cls: "bg-red-50 text-red-700 border-red-200",             icon: XCircle },
    APTE_SOUS_RESERVE:{ label: "APT. SOUS RÉSERVE", cls: "bg-amber-50 text-amber-700 border-amber-200",  icon: AlertCircle },
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

function visitTypeBadge(t: string | null) {
  if (!t) return <span className="text-xs text-muted-foreground">—</span>;
  const n = t.toUpperCase();
  if (n.includes("SEMI") || n.includes("BIEST") || n.includes("6"))
    return <span className="text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">Semestrielle</span>;
  if (n.includes("ANN") || n.includes("ANNUEL"))
    return <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">Annuelle</span>;
  if (n.includes("EMBAUCH") || n.includes("EMBAUCHE"))
    return <span className="text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">Embauche</span>;
  if (n.includes("REPRISE"))
    return <span className="text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">Reprise</span>;
  return <span className="text-xs text-muted-foreground">{t}</span>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
const LIMIT = 20;

export default function RegistreActivites() {
  const [search, setSearch]         = useState("");
  const [direction, setDirection]   = useState("");
  const [page, setPage]             = useState(1);
  const [data, setData]             = useState<RegistreResponse | null>(null);
  const [loading, setLoading]       = useState(true);

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

  useEffect(() => {
    setPage(1);
    load(debouncedSearch, direction, 1);
  }, [debouncedSearch, direction, load]);

  useEffect(() => {
    load(debouncedSearch, direction, page);
  }, [page]); // eslint-disable-line

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
            Suivi des visites médicales par agent — {data ? `${data.total} agent(s) enregistré(s)` : "Chargement…"}
          </p>
        </div>
        <Link href="/employees/new">
          <Button variant="outline" size="sm" className="gap-2">
            <Users className="w-4 h-4" />
            Nouvel agent
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Nom, prénom ou matricule…"
            value={search}
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
            {data?.directions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
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
                    <td className="px-4 py-3 font-mono text-xs font-medium text-primary">
                      {row.matricule}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-foreground">
                        {row.nom} {row.prenom}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {row.direction ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {row.service ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs max-w-36 truncate text-muted-foreground">
                      {row.posteActuel ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-center text-muted-foreground">
                      {row.age ? `${row.age} ans` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {row.latestVisite
                        ? <span className="font-medium">{row.latestVisite.dateVisite}</span>
                        : <span className="text-muted-foreground italic">Aucune</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {visitTypeBadge(row.latestVisite?.typeVisite ?? null)}
                    </td>
                    <td className="px-4 py-3">
                      {row.latestVisite
                        ? decisionBadge(row.latestVisite.decisionAptitude)
                        : <span className="text-xs text-muted-foreground">—</span>
                      }
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
    </div>
  );
}
