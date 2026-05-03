import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Plus, Loader2, Trash2, Download, Calendar, MapPin, Building2, BarChart2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { generateHygieneWordBlob, VisiteHygieneData } from "@/components/VisiteHygieneWord";

type VisiteRow = {
  id: number;
  dateVisite: string;
  direction: string;
  site: string;
  data: string;
  scoreGlobal: number | null;
  createdAt: string;
};

export default function HistoriqueHygiene() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [rows, setRows] = useState<VisiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [generating, setGenerating] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hygiene");
      if (res.ok) setRows(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cette visite ?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/hygiene/${id}`, { method: "DELETE" });
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Visite supprimée" });
    } catch { toast({ title: "Erreur suppression", variant: "destructive" }); }
    setDeleting(null);
  };

  const handleDownload = async (row: VisiteRow) => {
    setGenerating(row.id);
    try {
      const data: VisiteHygieneData = JSON.parse(row.data);
      const blob = await generateHygieneWordBlob({ ...data, synthese: { ...data.synthese, scoreGlobal: row.scoreGlobal } });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `visite_hygiene_${row.site}_${row.dateVisite}.docx`;
      a.click(); URL.revokeObjectURL(url);
    } catch { toast({ title: "Erreur génération", variant: "destructive" }); }
    setGenerating(null);
  };

  const scoreColor = (s: number | null) => {
    if (s === null) return "text-muted-foreground";
    return s >= 80 ? "text-emerald-600" : s >= 60 ? "text-orange-500" : "text-red-600";
  };
  const scoreBg = (s: number | null) => {
    if (s === null) return "bg-muted/30";
    return s >= 80 ? "bg-emerald-50 border-emerald-200" : s >= 60 ? "bg-orange-50 border-orange-200" : "bg-red-50 border-red-200";
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Historique des Visites d'Hygiène</h1>
          <p className="text-muted-foreground text-sm mt-1">{rows.length} visite(s) enregistrée(s)</p>
        </div>
        <Button onClick={() => navigate("/hygiene/new")} className="gap-2">
          <Plus className="w-4 h-4" />Nouvelle visite
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucune visite enregistrée</p>
          <p className="text-sm mt-1">Créez votre première visite d'hygiène</p>
          <Button onClick={() => navigate("/hygiene/new")} className="mt-4 gap-2">
            <Plus className="w-4 h-4" />Nouvelle visite
          </Button>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="grid gap-4">
          {rows.map((row) => {
            let nonConformes = 0;
            try {
              const d: VisiteHygieneData = JSON.parse(row.data);
              const all = [...d.sanitaires, ...d.locauxTravail, ...d.locauxTechAdmin, ...d.securite, ...d.urgenceSecourisme];
              nonConformes = all.filter((i) => i.presence === "NON").length;
            } catch { /* ignore */ }

            return (
              <div key={row.id} className="bg-card border border-border rounded-xl p-5 flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Score */}
                  <div className={cn("flex flex-col items-center px-3 py-2 rounded-xl border min-w-16 text-center shrink-0", scoreBg(row.scoreGlobal))}>
                    <span className={cn("text-2xl font-bold", scoreColor(row.scoreGlobal))}>
                      {row.scoreGlobal !== null ? `${row.scoreGlobal}%` : "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">score</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{row.site}</span>
                      {nonConformes > 0 && (
                        <span className="flex items-center gap-1 text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" />{nonConformes} non-conformité(s)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{row.dateVisite}</span>
                      <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{row.direction}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{row.site}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleDownload(row)} disabled={generating === row.id}>
                    {generating === row.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    Word
                  </Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-red-500" onClick={() => handleDelete(row.id)} disabled={deleting === row.id}>
                    {deleting === row.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
