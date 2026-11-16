import { useRef, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Upload, RefreshCw, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { detectSheetType, SHEET_TYPE_LABELS, type SheetType } from "@/lib/sheetClassification";
import { validateSheetRows, type SheetValidation } from "@/lib/importValidation";

type SheetPreview = {
  name: string;
  type: SheetType;
  rowCount: number;
  columns: string[];
  included: boolean;
  validations: Record<SheetType, SheetValidation>;
};

const TYPES: SheetType[] = ["visites", "personnel", "restrictions", "campagne", "inconnu"];
const MAX_BYTES = 15 * 1024 * 1024;
const MAX_SHEETS = 100;

/** Only aggregate counts are shown. Never reveal clinical record contents. */
function validationNotice(sheet: SheetPreview): string {
  if (sheet.type === "inconnu") return "Affectez un type pour effectuer les contrôles.";
  const result = sheet.validations[sheet.type];
  const notes: string[] = [];
  if (result.missingMatricule) notes.push(result.missingMatricule + " matricule(s) absent(s)");
  if (sheet.type === "visites") {
    if (result.missingVisitDate) notes.push(result.missingVisitDate + " date(s) manquante(s)");
    if (result.invalidVisitDate) notes.push(result.invalidVisitDate + " date(s) non interprétable(s)");
    if (result.duplicateVisits) notes.push(result.duplicateVisits + " visite(s) en doublon potentiel");
  }
  if (sheet.type === "personnel" && result.duplicateMatricules) {
    notes.push(result.duplicateMatricules + " matricule(s) répété(s)");
  }
  return notes.join(" · ") || "Aucune anomalie détectée par les contrôles de base";
}

/**
 * Staging preview of the original Replit multi-sheet import workflow.
 * Deliberately never uploads, logs or persists workbook values.
 * Medical-record writes require an authenticated backend and separate QA.
 */
export default function ImportExcelMultiSheets() {
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [fileName, setFileName] = useState("");
  const [working, setWorking] = useState(false);
  const [sheets, setSheets] = useState<SheetPreview[]>([]);

  const parse = useCallback(async (file: File) => {
    if (!/\.(xlsx|xls)$/i.test(file.name) || file.size > MAX_BYTES) {
      toast({ title: "Fichier non accepté", description: "Choisissez un fichier XLS/XLSX de 15 Mo maximum.", variant: "destructive" });
      return;
    }
    setWorking(true);
    setSheets([]);
    setFileName("");
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
      if (!workbook.SheetNames.length || workbook.SheetNames.length > MAX_SHEETS) {
        throw new Error("Nombre de feuilles invalide (maximum 100)");
      }
      const previews = workbook.SheetNames.map((name) => {
        const ws = workbook.Sheets[name];
        const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: true });
        const [head, ...body] = data;
        const columns = (head ?? []).map((value) => String(value ?? "").trim()).filter(Boolean);
        const rowCount = body.filter((row) => Array.isArray(row) && row.some((v) => v !== "" && v !== null && v !== undefined)).length;
        const type = detectSheetType(name);
        // Scan workbook in memory, discard row values immediately after the preview.
        const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });
        const validations = Object.fromEntries(
          TYPES.map((kind) => [kind, validateSheetRows(kind, records)])
        ) as Record<SheetType, SheetValidation>;
        return { name, type, rowCount, columns, included: type !== "inconnu" && rowCount > 0, validations };
      });
      setFileName(file.name);
      setSheets(previews);
    } catch {
      toast({ title: "Lecture Excel impossible", description: "Vérifiez le format et l'intégrité du classeur.", variant: "destructive" });
    } finally {
      setWorking(false);
    }
  }, [toast]);

  const reset = () => {
    setFileName("");
    setSheets([]);
    if (fileRef.current) fileRef.current.value = "";
  };
  const included = sheets.filter((sheet) => sheet.included && sheet.type !== "inconnu");
  const total = included.reduce((acc, sheet) => acc + sheet.rowCount, 0);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-7">
        <Link href="/import" className="text-sm text-primary hover:underline">← Retour à l'import Excel classique</Link>
        <h1 className="text-2xl font-bold mt-3">Import Excel — multi-feuilles</h1>
        <p className="text-muted-foreground text-sm mt-1">Détection et préparation des feuilles Personnel, Visites médicales, Restrictions et Campagnes.</p>
      </div>
      <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 shrink-0" />
        <div className="text-sm">
          <strong>Aperçu uniquement : aucune donnée n'est envoyée ni enregistrée.</strong>
          <p className="mt-1">L'importation multi-feuilles sera activée après validation de l'authentification et des tests du serveur.</p>
        </div>
      </div>
      <div
        className={cn("mb-5 border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer", "border-border hover:border-primary/50 hover:bg-muted/30")}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) void parse(e.dataTransfer.files[0]); }}
      >
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { if (e.target.files?.[0]) void parse(e.target.files[0]); }} />
        {fileName ? <FileSpreadsheet className="w-10 h-10 text-primary" /> : <Upload className="w-10 h-10 text-muted-foreground" />}
        <p className="font-semibold text-center">{working ? "Analyse du classeur…" : fileName || "Déposez votre fichier Excel ici"}</p>
        <p className="text-xs text-muted-foreground">.xlsx / .xls · 15 Mo maximum · traitement uniquement dans le navigateur</p>
      </div>
      {sheets.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-5">
          <div className="px-5 py-4 border-b border-border flex justify-between gap-4 items-center">
            <div>
              <h2 className="font-semibold">Feuilles détectées</h2>
              <p className="text-muted-foreground text-xs mt-1">{included.length} feuille(s) sélectionnée(s) · {total} ligne(s) · aperçu sans importation</p>
            </div>
            <Button variant="outline" size="sm" onClick={reset}><RefreshCw className="w-4 h-4 mr-2" /> Réinitialiser</Button>
          </div>
          <div className="divide-y divide-border">
            {sheets.map((sheet, index) => (
              <div className={cn("px-5 py-4", !sheet.included && "opacity-65")} key={`${sheet.name}-${index}`}>
                <div className="flex gap-3 items-center">
                  <input type="checkbox" aria-label={`Inclure ${sheet.name}`} checked={sheet.included} disabled={sheet.type === "inconnu" || sheet.rowCount === 0} onChange={(e) => setSheets((prev) => prev.map((s, i) => i === index ? { ...s, included: e.target.checked } : s))} />
                  <span className="font-medium flex-1 break-all">{sheet.name}</span>
                  <select aria-label={`Type de la feuille ${sheet.name}`} value={sheet.type} className="text-xs border rounded-lg bg-background p-2" onChange={(e) => setSheets((prev) => prev.map((s, i) => i === index ? { ...s, type: e.target.value as SheetType, included: e.target.value !== "inconnu" && s.rowCount > 0 } : s))}>
                    {TYPES.map((type) => <option key={type} value={type}>{SHEET_TYPE_LABELS[type]}</option>)}
                  </select>
                  <span className="text-sm tabular-nums">{sheet.rowCount} ligne(s)</span>
                </div>
                <p className="mt-2 ml-6 text-xs text-muted-foreground truncate">Colonnes : {sheet.columns.join(" · ") || "Aucune"}</p>
                <p className="mt-1 ml-6 text-xs text-amber-700">Contrôles préalables : {validationNotice(sheet)}</p>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-border bg-muted/20 flex gap-2 items-center text-sm">
            <CheckCircle2 className="text-emerald-600 w-4 h-4" /> Aperçu prêt. Aucun envoi au serveur n'a été effectué.
          </div>
        </div>
      )}
    </div>
  );
}
