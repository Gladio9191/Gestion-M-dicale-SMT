import { useRef, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { pdf } from "@react-pdf/renderer";
import { FicheDocument, FicheData, NoteEntry } from "@/components/FichePDF";
import { generateWordBlob } from "@/components/FicheWord";
import {
  Upload, FileSpreadsheet, Download, Loader2, CheckCircle,
  RefreshCw, ChevronDown, ChevronUp, Database,
  AlertTriangle, FileText, X, Star, Info, Search,
  UserCheck, UserX, AlertCircle, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */
type RawRow = Record<string, string>;
type UploadedFile = { file: File; isGlobal: boolean; wb?: XLSX.WorkBook };

type ResolvedResult =
  | { status: "found";     input: string; fiche: FicheData }
  | { status: "corrected"; input: string; fiche: FicheData; correctedTo: string }
  | { status: "not_found"; input: string };

type KnownField =
  | "matricule" | "nom" | "prenom" | "direction" | "service"
  | "posteActuel" | "dateEmbauche" | "dateNaissance"
  | "dateVisite" | "motif" | "examensCliniques" | "observations"
  | "orientation" | "decisionAptitude" | "recommandations";

/* ═══════════════════════════════════════════════════════════════════════════
   FIELD DETECTION
═══════════════════════════════════════════════════════════════════════════ */
const SYNONYMS: Record<KnownField, string[]> = {
  matricule:        ["mle", "mat", "matricule", "matricul", "immatriculation", "numero", "num"],
  nom:              ["nom", "name", "lastname", "last", "familyname"],
  prenom:           ["prenom", "prénom", "firstname", "first", "given"],
  direction:        ["dir", "direction", "département", "departement", "dept"],
  service:          ["service", "svc", "sect", "section"],
  posteActuel:      ["fonction", "poste", "post", "emploi", "job", "titre", "grade"],
  dateEmbauche:     ["embauche", "embauché", "recrutement", "anciennete", "dembauche", "recru"],
  dateNaissance:    ["naissance", "datenaissance", "dn", "né", "nee", "ddn", "naiss", "datedenaissance"],
  dateVisite:       ["date", "dates", "datevisite", "visite", "vm", "datevm", "dateexamen", "datecons"],
  motif:            ["motif", "motifvisite", "raison", "raisonde", "motifdela"],
  examensCliniques: ["examen", "examens", "clinique", "explorations", "bilan", "exam", "typeexamen", "examenscliniques"],
  observations:     ["obs", "observation", "observations", "remarque", "remarques", "constat"],
  orientation:      ["orientation", "typeorientation", "typevisite", "typecons", "typedevisite"],
  decisionAptitude: ["decision", "aptitude", "décision", "apte", "avis", "decisionaptitude", "apt"],
  recommandations:  ["recommandation", "recommandations", "conseil", "conseils", "suivi"],
};
const ALL_FIELDS = Object.keys(SYNONYMS) as KnownField[];

function normalize(s: string): string {
  return s.toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}
function detectField(colName: string): KnownField | null {
  const n = normalize(colName);
  for (const field of ALL_FIELDS) {
    if (SYNONYMS[field].some((s) => { const sn = normalize(s); return n === sn || n.startsWith(sn) || sn.startsWith(n); })) return field;
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   SPECIAL SHEET DETECTION
═══════════════════════════════════════════════════════════════════════════ */
function sheetRole(name: string): "restrictions" | "maladies" | "global" | "normal" {
  const n = normalize(name);
  if (n.includes("restriction")) return "restrictions";
  if (n.includes("maladie") || n.includes("chronique")) return "maladies";
  if (n.includes("global") || n.includes("personnel") || n.includes("effectif")) return "global";
  return "normal";
}

/* ═══════════════════════════════════════════════════════════════════════════
   AGE CALCULATION
═══════════════════════════════════════════════════════════════════════════ */
function calcAge(dateStr: string): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age > 0 && age < 120 ? age : null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   EMPTY FICHE FACTORY
═══════════════════════════════════════════════════════════════════════════ */
function emptyFiche(matricule: string): FicheData {
  return {
    employee: { matricule, nom: "", prenom: "", age: null, dateNaissance: null, dateEmbauche: null, direction: null, service: null, posteActuel: null, anamnese: null, decisionsImportantes: null },
    antecedents: [], restrictions: [], expertises: [], visites: [],
    restrictionsMedicales: [], maladiesChroniques: [], notes: [], corrections: [],
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   MULTI-FILE PARSER
═══════════════════════════════════════════════════════════════════════════ */
type ParsedDirectory = {
  byMat: Map<string, FicheData>;
  nameLookup: Map<string, string>;
};

function parseWorkbooks(uploadedFiles: UploadedFile[]): ParsedDirectory {
  const byMat = new Map<string, FicheData>();
  const nameLookup = new Map<string, string>();
  const sorted = [...uploadedFiles.filter((f) => f.isGlobal), ...uploadedFiles.filter((f) => !f.isGlobal)];

  for (const uf of sorted) {
    if (!uf.wb) continue;
    for (const sheetName of uf.wb.SheetNames) {
      const role = sheetRole(sheetName);
      const ws = uf.wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: "", raw: false });
      if (rows.length === 0) continue;

      const headers = Object.keys(rows[0]);
      const colMap = new Map<string, KnownField>();
      for (const h of headers) {
        const field = detectField(h);
        if (field && ![...colMap.values()].includes(field)) colMap.set(h, field);
      }
      const get = (row: RawRow, field: KnownField): string => {
        const col = [...colMap.entries()].find(([, f]) => f === field)?.[0];
        return col ? (row[col] ?? "").toString().trim() : "";
      };
      const matCol = [...colMap.entries()].find(([, f]) => f === "matricule")?.[0];

      if (role === "restrictions" && matCol) {
        for (const row of rows) {
          const mat = row[matCol]?.toString().trim(); if (!mat) continue;
          if (!byMat.has(mat)) byMat.set(mat, emptyFiche(mat));
          const fiche = byMat.get(mat)!;
          const descCol = [...colMap.entries()].find(([, f]) => !["matricule", "dateVisite"].includes(f))?.[0];
          const description = descCol ? row[descCol]?.toString().trim() : "";
          if (description) { fiche.restrictionsMedicales = fiche.restrictionsMedicales ?? []; fiche.restrictionsMedicales.push({ description, dateDebut: get(row, "dateVisite") || null, dateFin: null, source: sheetName }); }
        }
        continue;
      }
      if (role === "maladies" && matCol) {
        for (const row of rows) {
          const mat = row[matCol]?.toString().trim(); if (!mat) continue;
          if (!byMat.has(mat)) byMat.set(mat, emptyFiche(mat));
          const fiche = byMat.get(mat)!;
          const descCol = [...colMap.entries()].find(([, f]) => f !== "matricule")?.[0];
          const description = descCol ? row[descCol]?.toString().trim() : "";
          if (description) { fiche.maladiesChroniques = fiche.maladiesChroniques ?? []; fiche.maladiesChroniques.push({ description, traitement: get(row, "recommandations") || null, dateDebut: get(row, "dateNaissance") || null, source: sheetName }); }
        }
        continue;
      }
      if (!matCol) continue;

      for (const row of rows) {
        const mat = row[matCol]?.toString().trim(); if (!mat) continue;
        if (!byMat.has(mat)) byMat.set(mat, emptyFiche(mat));
        const fiche = byMat.get(mat)!;
        const nom = get(row, "nom"); const prenom = get(row, "prenom");
        if ((uf.isGlobal || role === "global") && nom && prenom) nameLookup.set(normalize(`${nom} ${prenom}`), mat);

        const mergeF = (field: KnownField, target: keyof FicheData["employee"]) => {
          const val = get(row, field);
          if (val && !fiche.employee[target as keyof typeof fiche.employee]) (fiche.employee as Record<string, unknown>)[target] = val;
        };
        mergeF("nom", "nom"); mergeF("prenom", "prenom"); mergeF("direction", "direction");
        mergeF("service", "service"); mergeF("posteActuel", "posteActuel");
        mergeF("dateEmbauche", "dateEmbauche"); mergeF("dateNaissance", "dateNaissance");
        if (fiche.employee.dateNaissance && !fiche.employee.age) fiche.employee.age = calcAge(fiche.employee.dateNaissance);

        const dateVisite = get(row, "dateVisite");
        if (dateVisite) {
          const motif = get(row, "motif") || null; const examensClin = get(row, "examensCliniques") || null;
          const observations = get(row, "observations") || null; const orientation = get(row, "orientation") || null;
          const decision = get(row, "decisionAptitude") || null; const recomm = get(row, "recommandations") || null;
          if (!fiche.visites.some((v) => v.dateVisite === dateVisite && v.examensCliniques === examensClin))
            fiche.visites.push({ dateVisite, typeVisite: null, motif, examensCliniques: examensClin, observations, orientation, recommandations: recomm, decisionAptitude: decision });
        }
        const mappedCols = new Set([...colMap.keys()]);
        for (const h of headers) {
          if (mappedCols.has(h)) continue;
          const val = row[h]?.toString().trim(); if (!val) continue;
          if (!fiche.notes!.some((n) => n.sheet === sheetName && n.label === h && n.value === val)) fiche.notes!.push({ sheet: sheetName, label: h, value: val });
        }
      }
    }
  }
  for (const fiche of byMat.values()) {
    fiche.visites.sort((a, b) => a.dateVisite.localeCompare(b.dateVisite));
    if (!fiche.notes?.length) fiche.notes = undefined;
    if (!fiche.restrictionsMedicales?.length) fiche.restrictionsMedicales = undefined;
    if (!fiche.maladiesChroniques?.length) fiche.maladiesChroniques = undefined;
    if (!fiche.corrections?.length) fiche.corrections = undefined;
  }
  return { byMat, nameLookup };
}

/* ═══════════════════════════════════════════════════════════════════════════
   MATRICULE RESOLUTION
═══════════════════════════════════════════════════════════════════════════ */
function resolveMatricule(input: string, byMat: Map<string, FicheData>, nameLookup: Map<string, string>): { fiche: FicheData; corrected: boolean; correctedTo?: string } | null {
  const mat = input.trim();
  if (byMat.has(mat)) return { fiche: byMat.get(mat)!, corrected: false };
  const normInput = normalize(mat);
  for (const [nameKey, realMat] of nameLookup.entries()) {
    if (nameKey === normInput || nameKey.includes(normInput) || normInput.includes(nameKey)) {
      const fiche = byMat.get(realMat);
      if (fiche) return { fiche: { ...fiche, corrections: [...(fiche.corrections ?? []), { matricule: mat, method: "Recherche par Nom/Prénom", details: `"${mat}" → matricule correct : ${realMat}` }] }, corrected: true, correctedTo: realMat };
    }
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DB FETCH + MERGE
═══════════════════════════════════════════════════════════════════════════ */
async function fetchFromDB(matricule: string): Promise<FicheData | null> {
  try {
    const res = await fetch(`/api/employees/${encodeURIComponent(matricule)}/fiche`);
    if (!res.ok) return null;
    return res.json() as Promise<FicheData>;
  } catch { return null; }
}
function mergeDB(excel: FicheData, db: FicheData): FicheData {
  return {
    employee: { ...excel.employee, nom: excel.employee.nom || db.employee.nom, prenom: excel.employee.prenom || db.employee.prenom, age: excel.employee.age ?? db.employee.age, dateNaissance: excel.employee.dateNaissance || db.employee.dateNaissance, dateEmbauche: excel.employee.dateEmbauche || db.employee.dateEmbauche, direction: excel.employee.direction || db.employee.direction, service: excel.employee.service || db.employee.service, posteActuel: excel.employee.posteActuel || db.employee.posteActuel, anamnese: db.employee.anamnese || excel.employee.anamnese, decisionsImportantes: db.employee.decisionsImportantes || excel.employee.decisionsImportantes },
    antecedents: db.antecedents.length ? db.antecedents : excel.antecedents,
    restrictions: db.restrictions,
    expertises: db.expertises.length ? db.expertises : excel.expertises,
    visites: [...db.visites, ...excel.visites.filter((ev) => !db.visites.some((dv) => dv.dateVisite === ev.dateVisite))].sort((a, b) => a.dateVisite.localeCompare(b.dateVisite)),
    restrictionsMedicales: [...(excel.restrictionsMedicales ?? []), ...(db.restrictions.map((r) => ({ description: `${r.typeRestriction}: ${r.motifMedical}`, dateDebut: r.dateDebut, dateFin: r.dateFin })))],
    maladiesChroniques: excel.maladiesChroniques,
    notes: excel.notes, corrections: excel.corrections,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function GenererFiches() {
  const { toast } = useToast();
  const dropRef = useRef<HTMLInputElement>(null);

  /* ── States ─────────────────────────────────────────────────────────────── */
  const [dragging, setDragging]         = useState(false);
  const [files, setFiles]               = useState<UploadedFile[]>([]);
  const [directory, setDirectory]       = useState<ParsedDirectory | null>(null);
  const [showFiles, setShowFiles]       = useState(true);
  const [enrichDB, setEnrichDB]         = useState(false);

  const [searchInput, setSearchInput]   = useState("");
  const [searching, setSearching]       = useState(false);
  const [results, setResults]           = useState<ResolvedResult[] | null>(null);

  const [generating, setGenerating]     = useState<"pdf" | "word" | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  /* ── File loading ───────────────────────────────────────────────────────── */
  const reparse = useCallback((updatedFiles: UploadedFile[]) => {
    const loaded = updatedFiles.filter((f) => f.wb);
    setDirectory(loaded.length === 0 ? null : parseWorkbooks(loaded));
  }, []);

  const loadFile = useCallback((file: File, isGlobal: boolean) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target?.result, { type: "array", cellDates: true });
      setFiles((prev) => {
        const base = prev.find((f) => f.file.name === file.name)
          ? prev.map((f) => f.file.name === file.name ? { ...f, wb, isGlobal } : f)
          : [...prev, { file, wb, isGlobal }];
        const next = base.map((f) => ({ ...f, isGlobal: f.isGlobal || normalize(f.file.name).includes("global") || normalize(f.file.name).includes("personnel") || normalize(f.file.name).includes("effectif") }));
        reparse(next);
        return next;
      });
    };
    reader.readAsArrayBuffer(file);
  }, [reparse]);

  const onDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(false); Array.from(e.dataTransfer.files).forEach((f) => loadFile(f, false)); }, [loadFile]);
  const toggleGlobal = (idx: number) => setFiles((prev) => { const next = prev.map((f, i) => i === idx ? { ...f, isGlobal: !f.isGlobal } : f); reparse(next); return next; });
  const removeFile = (idx: number) => setFiles((prev) => { const next = prev.filter((_, i) => i !== idx); reparse(next); return next; });

  /* ── SEARCH ─────────────────────────────────────────────────────────────── */
  const handleSearch = async () => {
    const mats = searchInput.split(/[\n,;\t]+/).map((s) => s.trim()).filter(Boolean);
    if (mats.length === 0) return;
    setSearching(true);
    setResults(null);
    setPdfPreviewUrl(null);

    const resolved: ResolvedResult[] = [];
    for (const input of mats) {
      // 1) Excel files
      if (directory) {
        const r = resolveMatricule(input, directory.byMat, directory.nameLookup);
        if (r) {
          let fiche = r.fiche;
          if (enrichDB) { const db = await fetchFromDB(fiche.employee.matricule); if (db) fiche = mergeDB(fiche, db); }
          resolved.push(r.corrected
            ? { status: "corrected", input, fiche, correctedTo: r.correctedTo! }
            : { status: "found", input, fiche });
          continue;
        }
      }
      // 2) Database
      const db = await fetchFromDB(input);
      if (db) { resolved.push({ status: "found", input, fiche: db }); continue; }
      // 3) Not found
      resolved.push({ status: "not_found", input });
    }
    setResults(resolved);
    setSearching(false);
  };

  /* ── GENERATE ───────────────────────────────────────────────────────────── */
  const foundFiches = results?.filter((r): r is Extract<ResolvedResult, { fiche: FicheData }> => r.status !== "not_found").map((r) => r.fiche) ?? [];

  const generateWord = async () => {
    if (!foundFiches.length) return;
    setGenerating("word");
    try {
      const blob = await generateWordBlob(foundFiches);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = foundFiches.length === 1 ? `fiche_${foundFiches[0].employee.matricule}.docx` : `fiches_medicales_${new Date().toISOString().slice(0, 10)}.docx`;
      a.click(); URL.revokeObjectURL(url);
      toast({ title: `${foundFiches.length} fiche(s) Word téléchargée(s) ✓` });
    } catch (err) { console.error(err); toast({ title: "Erreur Word", variant: "destructive" }); }
    setGenerating(null);
  };

  const generatePDF = async () => {
    if (!foundFiches.length) return;
    setGenerating("pdf");
    setPdfPreviewUrl(null);
    try {
      const blob = await pdf(<FicheDocument fiches={foundFiches} />).toBlob();
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
      toast({ title: `${foundFiches.length} fiche(s) prête(s) — cliquez pour ouvrir ou télécharger` });
    } catch (err) { console.error(err); toast({ title: "Erreur PDF", variant: "destructive" }); }
    setGenerating(null);
  };

  const downloadPDF = () => {
    if (!pdfPreviewUrl) return;
    const a = document.createElement("a"); a.href = pdfPreviewUrl;
    a.download = foundFiches.length === 1 ? `fiche_${foundFiches[0].employee.matricule}.pdf` : `fiches_medicales_${new Date().toISOString().slice(0, 10)}.pdf`;
    a.click();
  };

  /* ── Derived ────────────────────────────────────────────────────────────── */
  const hasFiles     = files.length > 0;
  const hasGlobal    = files.some((f) => f.isGlobal);
  const matCount     = searchInput.split(/[\n,;\t]+/).map((s) => s.trim()).filter(Boolean).length;
  const canSearch    = matCount > 0;
  const canGenerate  = !!results && foundFiches.length > 0 && !generating;
  const foundCount   = results?.filter((r) => r.status !== "not_found").length ?? 0;
  const notFoundCount= results?.filter((r) => r.status === "not_found").length ?? 0;
  const corrCount    = results?.filter((r) => r.status === "corrected").length ?? 0;

  /* ════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-5">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Générer Fiches Techniques</h1>
        <p className="text-muted-foreground text-sm mt-1">Recherchez un ou plusieurs agents pour générer leurs fiches en PDF ou Word</p>
      </div>

      {/* ══ ÉTAPE 1 — Fichiers Excel (optionnel, pour enrichissement) ══════ */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-foreground"
          onClick={() => setShowFiles((v) => !v)}
        >
          <span className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
            Fichiers Excel <span className="font-normal text-muted-foreground">(optionnel — pour croiser les données)</span>
            {hasFiles && <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{files.length} fichier(s)</span>}
          </span>
          {showFiles ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showFiles && (
          <div className="border-t border-border">
            {/* Drop zone */}
            <div
              className={cn("m-4 border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-colors", dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/20")}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => dropRef.current?.click()}
            >
              <input ref={dropRef} type="file" accept=".xlsx,.xls,.csv" multiple className="hidden"
                onChange={(e) => Array.from(e.target.files ?? []).forEach((f) => loadFile(f, false))} />
              <Upload className={cn("w-6 h-6", hasFiles ? "text-primary" : "text-muted-foreground")} />
              <p className="text-sm text-center text-muted-foreground">
                {hasFiles ? `${files.length} fichier(s) — cliquez pour en ajouter` : "Déposez vos fichiers Excel ici"}
              </p>
            </div>

            {/* File list */}
            {hasFiles && (
              <div className="mx-4 mb-4 border border-border rounded-xl divide-y divide-border">
                {files.map((uf, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-4 py-2.5">
                    <FileSpreadsheet className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{uf.file.name}</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {(uf.wb?.SheetNames ?? []).map((s) => {
                          const role = sheetRole(s);
                          return <span key={s} className={cn("text-xs px-1.5 py-0.5 rounded", role === "restrictions" ? "bg-red-50 text-red-600" : role === "maladies" ? "bg-orange-50 text-orange-600" : role === "global" ? "bg-purple-50 text-purple-600" : "bg-muted text-muted-foreground")}>{s}</span>;
                        })}
                      </div>
                    </div>
                    <button onClick={() => toggleGlobal(idx)} className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-colors shrink-0", uf.isGlobal ? "bg-amber-50 border-amber-300 text-amber-700" : "border-border text-muted-foreground hover:border-amber-300 hover:text-amber-600")}>
                      <Star className={cn("w-3 h-3", uf.isGlobal ? "fill-amber-500 text-amber-500" : "")} />
                      {uf.isGlobal ? "Global" : "Global?"}
                    </button>
                    <button onClick={() => removeFile(idx)} className="text-muted-foreground hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                {!hasGlobal && (
                  <div className="px-4 py-2 bg-amber-50/50 flex items-center gap-2 text-xs text-amber-700 rounded-b-xl">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Marquez le fichier de référence comme "Global" pour activer la correction automatique par Nom/Prénom
                  </div>
                )}
              </div>
            )}

            {/* Enrich toggle */}
            <div className="mx-4 mb-4 flex items-center gap-3 px-4 py-3 bg-muted/20 rounded-xl border border-border">
              <div className={cn("relative w-9 h-5 rounded-full cursor-pointer transition-colors shrink-0", enrichDB ? "bg-primary" : "bg-muted")} onClick={() => setEnrichDB((v) => !v)}>
                <span className={cn("absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform", enrichDB ? "translate-x-4" : "translate-x-0")} />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground flex items-center gap-1.5"><Database className="w-3 h-3" />Enrichir depuis la base de données</p>
                <p className="text-xs text-muted-foreground">Ajoute ATCD, Anamnèse et Expertises déjà enregistrés</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ ÉTAPE 2 — Saisie des matricules ══════════════════════════════ */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
          <span className="text-sm font-semibold text-foreground">Chercher un ou plusieurs matricules</span>
        </div>
        <div className="p-5">
          <textarea
            className="w-full h-40 rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none transition-colors"
            placeholder={"Entrez les matricules — un par ligne :\n\nMAT-2016-001\nMAT-2017-042\nMAT-2019-108\n\n(ou collez directement depuis Excel)"}
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setResults(null); setPdfPreviewUrl(null); }}
          />
          {matCount > 0 && (
            <p className="text-xs text-muted-foreground mt-2">{matCount} matricule(s) détecté(s)</p>
          )}
          <div className="mt-3 flex gap-2">
            <Button
              onClick={handleSearch}
              disabled={!canSearch || searching}
              className="gap-2 min-w-40"
              size="default"
            >
              {searching
                ? <><Loader2 className="w-4 h-4 animate-spin" />Recherche en cours…</>
                : <><Search className="w-4 h-4" />Rechercher</>}
            </Button>
            {results && (
              <Button variant="ghost" size="default" className="gap-2" onClick={() => { setResults(null); setSearchInput(""); setPdfPreviewUrl(null); }}>
                <RefreshCw className="w-3.5 h-3.5" />Réinitialiser
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ══ ÉTAPE 3 — Résultats ══════════════════════════════════════════ */}
      {results && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
              <span className="text-sm font-semibold text-foreground">Résultats</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {foundCount > 0 && <span className="flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium"><UserCheck className="w-3 h-3" />{foundCount} trouvé(s)</span>}
              {corrCount  > 0 && <span className="flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-medium"><AlertCircle className="w-3 h-3" />{corrCount} corrigé(s)</span>}
              {notFoundCount > 0 && <span className="flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-full font-medium"><UserX className="w-3 h-3" />{notFoundCount} introuvable(s)</span>}
            </div>
          </div>

          <div className="divide-y divide-border">
            {results.map((r, i) => {
              if (r.status === "not_found") return (
                <div key={i} className="flex items-center gap-3 px-5 py-3 bg-red-50/40">
                  <UserX className="w-4 h-4 text-red-400 shrink-0" />
                  <div className="flex-1">
                    <span className="font-mono text-sm font-medium text-red-700">{r.input}</span>
                    <span className="ml-2 text-xs text-red-500">Introuvable dans les fichiers ni dans la base de données</span>
                  </div>
                </div>
              );
              const { fiche } = r;
              const nom = [fiche.employee.nom, fiche.employee.prenom].filter(Boolean).join(" ");
              return (
                <div key={i} className={cn("flex items-start gap-3 px-5 py-3", r.status === "corrected" ? "bg-blue-50/30" : "")}>
                  {r.status === "corrected"
                    ? <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    : <UserCheck className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-foreground">{fiche.employee.matricule}</span>
                      {nom && <span className="text-sm text-foreground">{nom}</span>}
                      {fiche.employee.age && <span className="text-xs text-muted-foreground">{fiche.employee.age} ans</span>}
                      {r.status === "corrected" && <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">corrigé depuis "{r.input}"</span>}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                      {fiche.employee.direction && <span>📁 {fiche.employee.direction}</span>}
                      {fiche.employee.service   && <span>🏢 {fiche.employee.service}</span>}
                      {fiche.employee.posteActuel && <span>💼 {fiche.employee.posteActuel}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {fiche.visites.length > 0 && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{fiche.visites.length} visite(s)</span>}
                      {(fiche.restrictionsMedicales?.length ?? 0) > 0 && <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">⚠ Restrictions</span>}
                      {(fiche.maladiesChroniques?.length ?? 0) > 0 && <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">Maladies chroniques</span>}
                      {fiche.antecedents.length > 0 && <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">ATCD</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ ÉTAPE 4 — Générer ════════════════════════════════════════════ */}
      {results && foundCount > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">4</span>
            <span className="text-sm font-semibold text-foreground">Générer les fiches</span>
            <span className="text-xs text-muted-foreground">— {foundCount} fiche(s) prête(s)</span>
          </div>
          <div className="p-5 space-y-3">
            {/* Word */}
            <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-blue-50/30">
              <FileText className="w-5 h-5 text-blue-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Format Word (.docx)</p>
                <p className="text-xs text-muted-foreground">Document modifiable — vous pouvez le compléter manuellement</p>
              </div>
              <Button
                onClick={generateWord}
                disabled={!canGenerate}
                className="gap-2 bg-blue-600 hover:bg-blue-700 shrink-0"
              >
                {generating === "word" ? <><Loader2 className="w-4 h-4 animate-spin" />En cours…</> : <><Download className="w-4 h-4" />Télécharger</>}
              </Button>
            </div>

            {/* PDF */}
            <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/20">
              <Eye className="w-5 h-5 text-foreground shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Format PDF</p>
                <p className="text-xs text-muted-foreground">Aperçu dans le navigateur + téléchargement</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {pdfPreviewUrl && (
                  <>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open(pdfPreviewUrl, "_blank")}>
                      <Eye className="w-3.5 h-3.5" />Ouvrir
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadPDF}>
                      <Download className="w-3.5 h-3.5" />Télécharger
                    </Button>
                  </>
                )}
                {!pdfPreviewUrl && (
                  <Button
                    onClick={generatePDF}
                    disabled={!canGenerate}
                    variant="outline"
                    className="gap-2"
                  >
                    {generating === "pdf" ? <><Loader2 className="w-4 h-4 animate-spin" />En cours…</> : <><Eye className="w-4 h-4" />Générer</>}
                  </Button>
                )}
              </div>
            </div>

            {pdfPreviewUrl && (
              <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                PDF généré — cliquez <strong>Ouvrir</strong> pour le visualiser dans le navigateur ou <strong>Télécharger</strong> pour le sauvegarder
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Aide ────────────────────────────────────────────────────────── */}
      {!results && !searching && (
        <div className="bg-muted/20 rounded-xl border border-border p-4">
          <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5"><Info className="w-3.5 h-3.5 text-primary" />Comment ça fonctionne</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Chargez vos fichiers Excel (étape 1) pour croiser les données entre plusieurs sources</li>
            <li>• Entrez les matricules (étape 2) — un par ligne ou copiés depuis Excel</li>
            <li>• Cliquez <strong>Rechercher</strong> — l'app cherche dans vos fichiers, puis dans la base de données</li>
            <li>• Les boutons de génération s'activent uniquement après la recherche</li>
            <li>• Pour le PDF : bouton <strong>Ouvrir</strong> pour voir dans le navigateur, <strong>Télécharger</strong> pour sauvegarder</li>
          </ul>
        </div>
      )}
    </div>
  );
}
