import { useRef, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { pdf } from "@react-pdf/renderer";
import { FicheDocument, FicheData } from "@/components/FichePDF";
import {
  Upload, FileSpreadsheet, FileText, Download,
  Loader2, CheckCircle, XCircle, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useGetEmployeeFiche } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

type MatriculeStatus = { matricule: string; status: "pending" | "loading" | "ok" | "error"; message?: string };

// ── Fetch one fiche directly (outside React Query hooks) ──────────────────
async function fetchFiche(matricule: string): Promise<FicheData> {
  const res = await fetch(`/api/employees/${encodeURIComponent(matricule)}/fiche`);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<FicheData>;
}

// ── Extract matricules from Excel ─────────────────────────────────────────
function extractMatricules(rows: Record<string, string>[]): string[] {
  if (rows.length === 0) return [];
  const headers = Object.keys(rows[0]);
  const matCol = headers.find((h) => {
    const n = h.toLowerCase().trim();
    return ["mle", "mat", "matricule"].some((s) => n === s || n.startsWith(s));
  });
  if (!matCol) return [];
  return [...new Set(rows.map((r) => String(r[matCol] ?? "").trim()).filter(Boolean))];
}

export default function GenererFiches() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [matricules, setMatricules] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<MatriculeStatus[]>([]);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  const setStatus = (matricule: string, patch: Partial<MatriculeStatus>) =>
    setStatuses((prev) => prev.map((s) => s.matricule === matricule ? { ...s, ...patch } : s));

  const parseFile = useCallback((file: File) => {
    setFileName(file.name);
    setDone(false);
    setStatuses([]);
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target?.result, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "", raw: false });
      const mats = extractMatricules(rows);
      if (mats.length === 0) {
        toast({ title: "Matricules introuvables", description: "Vérifiez que la colonne s'appelle Mle ou Matricule.", variant: "destructive" });
        return;
      }
      setMatricules(mats);
      setStatuses(mats.map((m) => ({ matricule: m, status: "pending" })));
    };
    reader.readAsArrayBuffer(file);
  }, [toast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const generate = async () => {
    if (matricules.length === 0) return;
    setGenerating(true);
    setDone(false);

    const fiches: FicheData[] = [];

    for (const mat of matricules) {
      setStatus(mat, { status: "loading" });
      try {
        const fiche = await fetchFiche(mat);
        fiches.push(fiche);
        setStatus(mat, { status: "ok" });
      } catch (err) {
        setStatus(mat, { status: "error", message: `Introuvable` });
      }
    }

    if (fiches.length === 0) {
      toast({ title: "Aucune fiche générée", description: "Aucun matricule trouvé dans la base de données.", variant: "destructive" });
      setGenerating(false);
      return;
    }

    try {
      const blob = await pdf(<FicheDocument fiches={fiches} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const name = fiches.length === 1
        ? `fiche_${fiches[0].employee.matricule}_${fiches[0].employee.nom}.pdf`
        : `fiches_medicales_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      setDone(true);
      toast({ title: `${fiches.length} fiche(s) générée(s) avec succès` });
    } catch (err) {
      toast({ title: "Erreur de génération PDF", variant: "destructive" });
    }

    setGenerating(false);
  };

  const ok = statuses.filter((s) => s.status === "ok").length;
  const errors = statuses.filter((s) => s.status === "error").length;
  const hasFile = matricules.length > 0;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Générer Fiches Techniques</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Importez un fichier Excel contenant les matricules pour générer les fiches médicales en PDF
        </p>
      </div>

      {/* Drop zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors mb-6",
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }}
        />
        {hasFile ? (
          <>
            <FileSpreadsheet className="w-10 h-10 text-primary" />
            <div className="text-center">
              <p className="font-semibold text-foreground">{fileName}</p>
              <p className="text-sm text-muted-foreground">
                {matricules.length} matricule(s) détecté(s) — cliquez pour changer
              </p>
            </div>
          </>
        ) : (
          <>
            <Upload className="w-10 h-10 text-muted-foreground" />
            <div className="text-center">
              <p className="font-semibold text-foreground">Déposez le fichier Excel ici</p>
              <p className="text-sm text-muted-foreground">
                La colonne matricule doit s'appeler <strong>Mle</strong> ou <strong>Matricule</strong>
              </p>
            </div>
          </>
        )}
      </div>

      {hasFile && (
        <>
          {/* Matricule list */}
          <div className="bg-card border border-card-border rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">
                  {matricules.length} matricule(s) à traiter
                </h2>
              </div>
              {done && (
                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Téléchargement réussi
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto">
              {statuses.map(({ matricule, status, message }) => (
                <div
                  key={matricule}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm border",
                    status === "ok" && "bg-green-50 border-green-200 text-green-800",
                    status === "error" && "bg-red-50 border-red-200 text-red-700",
                    status === "loading" && "bg-blue-50 border-blue-200 text-blue-700",
                    status === "pending" && "bg-muted/30 border-border text-muted-foreground",
                  )}
                >
                  {status === "ok" && <CheckCircle className="w-3.5 h-3.5 shrink-0" />}
                  {status === "error" && <XCircle className="w-3.5 h-3.5 shrink-0" />}
                  {status === "loading" && <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />}
                  {status === "pending" && <FileText className="w-3.5 h-3.5 shrink-0" />}
                  <span className="font-mono text-xs truncate" title={message}>{matricule}</span>
                </div>
              ))}
            </div>

            {(ok > 0 || errors > 0) && !generating && (
              <div className="mt-3 pt-3 border-t border-border flex gap-4 text-xs text-muted-foreground">
                <span className="text-green-600 font-medium">{ok} trouvé(s)</span>
                {errors > 0 && <span className="text-red-500 font-medium">{errors} introuvable(s)</span>}
              </div>
            )}
          </div>

          {/* Generate button */}
          <div className="flex gap-3">
            <Button
              onClick={generate}
              disabled={generating}
              className="gap-2 min-w-52"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Génération en cours…
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Générer {matricules.length} fiche(s) PDF
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFileName(null);
                setMatricules([]);
                setStatuses([]);
                setDone(false);
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              Réinitialiser
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
