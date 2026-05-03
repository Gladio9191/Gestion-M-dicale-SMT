import { useRef, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, SkipForward, AlertCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const TARGET_FIELDS = [
  { key: "matricule", label: "Matricule", required: true },
  { key: "nom", label: "Nom", required: true },
  { key: "prenom", label: "Prénom", required: true },
  { key: "dateNaissance", label: "Date de naissance", required: false },
  { key: "dateEmbauche", label: "Date d'embauche", required: false },
  { key: "service", label: "Service", required: false },
  { key: "posteActuel", label: "Poste actuel", required: false },
  { key: "anamnese", label: "Anamnèse", required: false },
  { key: "decisionsImportantes", label: "Décisions importantes", required: false },
  { key: "dateVisite", label: "Date visite", required: false },
  { key: "typeVisite", label: "Type visite", required: false },
  { key: "decisionAptitude", label: "Décision aptitude", required: false },
] as const;

type TargetKey = typeof TARGET_FIELDS[number]["key"];

type ImportRecord = Record<TargetKey, string | null>;

type RowResult = { matricule: string; status: "created" | "updated" | "skipped" | "error"; message?: string | null };
type ImportResult = { created: number; updated: number; skipped: number; errors: number; total: number; details: RowResult[] };

function autoMap(headers: string[]): Record<TargetKey, string> {
  const synonyms: Record<TargetKey, string[]> = {
    matricule: ["matricule", "mat", "n°", "numero", "numéro", "id", "immatriculation"],
    nom: ["nom", "name", "family", "famille", "last"],
    prenom: ["prénom", "prenom", "first", "given"],
    dateNaissance: ["naissance", "birth", "né", "ddn", "date naissance", "date_naissance"],
    dateEmbauche: ["embauche", "embaucage", "recrutement", "entrée", "entree", "date embauche", "date_embauche"],
    service: ["service", "département", "departement", "dept", "direction"],
    posteActuel: ["poste", "fonction", "emploi", "job", "titre", "title"],
    anamnese: ["anamnèse", "anamnese", "antécédents", "antecedents", "historique"],
    decisionsImportantes: ["décisions", "decisions", "décision importante", "decision"],
    dateVisite: ["visite", "date visite", "date_visite", "consultation", "examen"],
    typeVisite: ["type visite", "type_visite", "nature visite"],
    decisionAptitude: ["aptitude", "décision aptitude", "decision aptitude", "avis médical", "avis"],
  };

  const mapping: Record<string, string> = {};
  for (const [field, syns] of Object.entries(synonyms) as [TargetKey, string[]][]) {
    for (const h of headers) {
      const norm = h.toLowerCase().trim();
      if (syns.some((s) => norm.includes(s) || s.includes(norm))) {
        mapping[field] = h;
        break;
      }
    }
  }
  return mapping as Record<TargetKey, string>;
}

export default function ImportExcel() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<TargetKey, string>>({} as Record<TargetKey, string>);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const parseFile = useCallback((file: File) => {
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      const wb = XLSX.read(data, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "", raw: false });
      if (jsonRows.length === 0) {
        toast({ title: "Fichier vide", description: "Le fichier ne contient aucune ligne.", variant: "destructive" });
        return;
      }
      const hdrs = Object.keys(jsonRows[0]);
      setHeaders(hdrs);
      setRows(jsonRows);
      setMapping(autoMap(hdrs));
    };
    reader.readAsArrayBuffer(file);
  }, [toast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const getMappedRows = (): ImportRecord[] =>
    rows.map((row) => {
      const rec: Record<string, string | null> = {};
      for (const { key } of TARGET_FIELDS) {
        const col = mapping[key];
        rec[key] = col && row[col] !== "" ? String(row[col]).trim() : null;
      }
      return rec as ImportRecord;
    });

  const handleImport = async () => {
    const missingRequired = TARGET_FIELDS.filter((f) => f.required && !mapping[f.key]);
    if (missingRequired.length > 0) {
      toast({
        title: "Champs obligatoires manquants",
        description: `Veuillez mapper : ${missingRequired.map((f) => f.label).join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    const employees = getMappedRows();
    setImporting(true);
    setResult(null);
    try {
      const res = await fetch("/api/employees/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employees, updateExisting }),
      });
      const data: ImportResult = await res.json();
      setResult(data);
      toast({
        title: `Import terminé — ${data.created} créé(s), ${data.updated} mis à jour, ${data.skipped} ignoré(s), ${data.errors} erreur(s)`,
      });
    } catch {
      toast({ title: "Erreur lors de l'import", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const previewRows = getMappedRows().slice(0, 8);
  const hasFile = headers.length > 0;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Import Excel</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Importez des employés depuis un fichier Excel (.xlsx / .xls)
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
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileChange} />
        {hasFile ? (
          <>
            <FileSpreadsheet className="w-10 h-10 text-primary" />
            <div className="text-center">
              <p className="font-semibold text-foreground">{fileName}</p>
              <p className="text-sm text-muted-foreground">{rows.length} ligne(s) détectée(s) — cliquez pour changer le fichier</p>
            </div>
          </>
        ) : (
          <>
            <Upload className="w-10 h-10 text-muted-foreground" />
            <div className="text-center">
              <p className="font-semibold text-foreground">Déposez votre fichier ici</p>
              <p className="text-sm text-muted-foreground">ou cliquez pour sélectionner — .xlsx, .xls, .csv</p>
            </div>
          </>
        )}
      </div>

      {hasFile && (
        <>
          {/* Column mapping */}
          <div className="bg-card border border-card-border rounded-xl p-6 mb-6">
            <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
              Correspondance des colonnes
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {TARGET_FIELDS.map(({ key, label, required }) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-44 shrink-0">
                    {label}
                    {required && <span className="text-destructive ml-1">*</span>}
                  </span>
                  <div className="relative flex-1">
                    <select
                      value={mapping[key] ?? ""}
                      onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value }))}
                      className="w-full text-sm border border-input rounded-lg px-3 py-2 pr-8 bg-background appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">— Ignorer —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3 pt-4 border-t border-border">
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={updateExisting}
                  onChange={(e) => setUpdateExisting(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded"
                />
                Mettre à jour les employés existants (par matricule)
              </label>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-card border border-card-border rounded-xl p-6 mb-6 overflow-x-auto">
            <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
              Aperçu — {Math.min(8, rows.length)} / {rows.length} lignes
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {TARGET_FIELDS.filter((f) => mapping[f.key]).map(({ key, label }) => (
                    <th key={key} className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {TARGET_FIELDS.filter((f) => mapping[f.key]).map(({ key }) => (
                      <td key={key} className="py-2 pr-4 text-foreground">
                        {row[key] ?? <span className="text-muted-foreground italic text-xs">vide</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Import button */}
          <div className="flex items-center gap-4">
            <Button
              onClick={handleImport}
              disabled={importing}
              className="min-w-36"
            >
              {importing ? "Import en cours…" : `Importer ${rows.length} ligne(s)`}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFileName(null);
                setHeaders([]);
                setRows([]);
                setMapping({} as Record<TargetKey, string>);
                setResult(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              Réinitialiser
            </Button>
          </div>

          {/* Results */}
          {result && (
            <div className="mt-6 bg-card border border-card-border rounded-xl p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
                Résultats de l'import
              </h2>
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Créés", value: result.created, color: "text-green-600", icon: CheckCircle },
                  { label: "Mis à jour", value: result.updated, color: "text-blue-600", icon: CheckCircle },
                  { label: "Ignorés", value: result.skipped, color: "text-amber-600", icon: SkipForward },
                  { label: "Erreurs", value: result.errors, color: "text-destructive", icon: XCircle },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
                    <Icon className={cn("w-5 h-5", color)} />
                    <div>
                      <p className="text-lg font-bold text-foreground">{value}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
              {result.details.filter((d) => d.status === "error" || d.status === "skipped").length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Détails</p>
                  {result.details.filter((d) => d.status === "error" || d.status === "skipped").map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {d.status === "error"
                        ? <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                        : <SkipForward className="w-4 h-4 text-amber-500 shrink-0" />}
                      <span className="font-mono text-xs text-muted-foreground">{d.matricule}</span>
                      <span className="text-foreground">{d.message ?? d.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
