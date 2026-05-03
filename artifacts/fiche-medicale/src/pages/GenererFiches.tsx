import { useRef, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { pdf } from "@react-pdf/renderer";
import { FicheDocument, FicheData, RestrictionEntry, MaladieEntry, NoteEntry } from "@/components/FichePDF";
import { generateWordBlob } from "@/components/FicheWord";
import {
  Upload, FileSpreadsheet, Download, Loader2, CheckCircle,
  Users, RefreshCw, ChevronDown, ChevronUp, Database,
  AlertTriangle, Layers, FileText, ClipboardList, X,
  Star, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */
type RawRow = Record<string, string>;
type UploadedFile = { file: File; isGlobal: boolean; wb?: XLSX.WorkBook };

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
  nameLookup: Map<string, string>; // "NOM PRENOM" → matricule (from Personnel Global)
};

function parseWorkbooks(uploadedFiles: UploadedFile[]): ParsedDirectory {
  const byMat = new Map<string, FicheData>();
  const nameLookup = new Map<string, string>();

  // Process Personnel Global first, then others
  const sorted = [
    ...uploadedFiles.filter((f) => f.isGlobal),
    ...uploadedFiles.filter((f) => !f.isGlobal),
  ];

  for (const uf of sorted) {
    if (!uf.wb) continue;

    for (const sheetName of uf.wb.SheetNames) {
      const role = sheetRole(sheetName);
      const ws = uf.wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: "", raw: false });
      if (rows.length === 0) continue;

      const headers = Object.keys(rows[0]);
      const colMap = new Map<string, KnownField>(); // col → field
      const unmapped: string[] = [];

      for (const h of headers) {
        const field = detectField(h);
        if (field && ![...colMap.values()].includes(field)) colMap.set(h, field);
        else if (field) unmapped.push(h); // duplicate
        else unmapped.push(h);
      }

      const get = (row: RawRow, field: KnownField): string =>
        (([...colMap.entries()].find(([, f]) => f === field)?.[0]) ? row[[...colMap.entries()].find(([, f]) => f === field)![0]] ?? "" : "").toString().trim();

      const matCol = [...colMap.entries()].find(([, f]) => f === "matricule")?.[0];

      // ── RESTRICTIONS MÉDICALES sheet ────────────────────────────────────
      if (role === "restrictions" && matCol) {
        for (const row of rows) {
          const mat = row[matCol]?.toString().trim();
          if (!mat) continue;
          if (!byMat.has(mat)) byMat.set(mat, emptyFiche(mat));
          const fiche = byMat.get(mat)!;

          const descCol = [...colMap.entries()].find(([, f]) => !["matricule", "dateVisite"].includes(f))?.[0];
          const description = descCol ? row[descCol]?.toString().trim() : "";
          if (description) {
            fiche.restrictionsMedicales = fiche.restrictionsMedicales ?? [];
            const dateDebut = get(row, "dateVisite") || get(row, "dateEmbauche") || null;
            fiche.restrictionsMedicales.push({ description, dateDebut, dateFin: null, source: sheetName });
          }
        }
        continue;
      }

      // ── MALADIES CHRONIQUES sheet ───────────────────────────────────────
      if (role === "maladies" && matCol) {
        for (const row of rows) {
          const mat = row[matCol]?.toString().trim();
          if (!mat) continue;
          if (!byMat.has(mat)) byMat.set(mat, emptyFiche(mat));
          const fiche = byMat.get(mat)!;

          const descCol = [...colMap.entries()].find(([, f]) => !["matricule"].includes(f))?.[0];
          const description = descCol ? row[descCol]?.toString().trim() : "";
          const traitement = get(row, "recommandations") || null;
          const dateDebut = get(row, "dateNaissance") || get(row, "dateEmbauche") || null;
          if (description) {
            fiche.maladiesChroniques = fiche.maladiesChroniques ?? [];
            fiche.maladiesChroniques.push({ description, traitement, dateDebut, source: sheetName });
          }
        }
        continue;
      }

      // ── NORMAL / GLOBAL sheet ───────────────────────────────────────────
      if (!matCol) continue;

      for (const row of rows) {
        const mat = row[matCol]?.toString().trim();
        if (!mat) continue;

        if (!byMat.has(mat)) byMat.set(mat, emptyFiche(mat));
        const fiche = byMat.get(mat)!;

        // Build name lookup from Personnel Global or global sheets
        const nom = get(row, "nom");
        const prenom = get(row, "prenom");
        if ((uf.isGlobal || role === "global") && nom && prenom) {
          nameLookup.set(normalize(`${nom} ${prenom}`), mat);
        }

        // Merge employee fields (first non-empty wins)
        const merge = (field: KnownField, target: keyof FicheData["employee"]) => {
          const val = get(row, field);
          if (val && !fiche.employee[target as keyof typeof fiche.employee]) {
            (fiche.employee as Record<string, unknown>)[target] = val;
          }
        };
        merge("nom",          "nom");
        merge("prenom",       "prenom");
        merge("direction",    "direction");
        merge("service",      "service");
        merge("posteActuel",  "posteActuel");
        merge("dateEmbauche", "dateEmbauche");
        merge("dateNaissance","dateNaissance");

        // Auto-calculate age
        if (fiche.employee.dateNaissance && !fiche.employee.age) {
          fiche.employee.age = calcAge(fiche.employee.dateNaissance);
        }

        // Visit row?
        const dateVisite = get(row, "dateVisite");
        if (dateVisite) {
          const motif         = get(row, "motif") || null;
          const examensClin   = get(row, "examensCliniques") || null;
          const observations  = get(row, "observations") || null;
          const orientation   = get(row, "orientation") || null;
          const decision      = get(row, "decisionAptitude") || null;
          const recomm        = get(row, "recommandations") || null;

          const isDup = fiche.visites.some((v) => v.dateVisite === dateVisite && v.examensCliniques === examensClin);
          if (!isDup) {
            fiche.visites.push({ dateVisite, typeVisite: null, motif, examensCliniques: examensClin, observations, orientation, recommandations: recomm, decisionAptitude: decision });
          }
        }

        // Unmapped non-empty → notes
        const mappedCols = new Set([...colMap.keys()]);
        for (const h of headers) {
          if (mappedCols.has(h)) continue;
          const val = row[h]?.toString().trim();
          if (!val) continue;
          const already = fiche.notes!.some((n) => n.sheet === sheetName && n.label === h && n.value === val);
          if (!already) fiche.notes!.push({ sheet: sheetName, label: h, value: val });
        }
      }
    }
  }

  // Sort visits oldest → newest, clean up empty arrays
  for (const fiche of byMat.values()) {
    fiche.visites.sort((a, b) => a.dateVisite.localeCompare(b.dateVisite));
    if (fiche.notes?.length === 0) fiche.notes = undefined;
    if (fiche.restrictionsMedicales?.length === 0) fiche.restrictionsMedicales = undefined;
    if (fiche.maladiesChroniques?.length === 0) fiche.maladiesChroniques = undefined;
    if (fiche.corrections?.length === 0) fiche.corrections = undefined;
  }

  return { byMat, nameLookup };
}

/* ═══════════════════════════════════════════════════════════════════════════
   MATRICULE CORRECTION (name-based search)
═══════════════════════════════════════════════════════════════════════════ */
function resolveMatricule(
  input: string,
  byMat: Map<string, FicheData>,
  nameLookup: Map<string, string>
): { fiche: FicheData; corrected: boolean; correctedTo?: string } | null {
  const mat = input.trim();

  // Direct match
  if (byMat.has(mat)) return { fiche: byMat.get(mat)!, corrected: false };

  // Try name-based match in nameLookup
  const normInput = normalize(mat);
  for (const [nameKey, realMat] of nameLookup.entries()) {
    if (nameKey === normInput || nameKey.includes(normInput) || normInput.includes(nameKey)) {
      const fiche = byMat.get(realMat);
      if (fiche) {
        const corrFiche: FicheData = {
          ...fiche,
          corrections: [
            ...(fiche.corrections ?? []),
            { matricule: mat, method: "Recherche par Nom/Prénom", details: `"${mat}" → matricule correct : ${realMat}` },
          ],
        };
        return { fiche: corrFiche, corrected: true, correctedTo: realMat };
      }
    }
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   FETCH FROM DB
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
    employee: {
      ...excel.employee,
      nom:    excel.employee.nom    || db.employee.nom,
      prenom: excel.employee.prenom || db.employee.prenom,
      age:    excel.employee.age    ?? db.employee.age,
      dateNaissance:        excel.employee.dateNaissance        || db.employee.dateNaissance,
      dateEmbauche:         excel.employee.dateEmbauche         || db.employee.dateEmbauche,
      direction:            excel.employee.direction            || db.employee.direction,
      service:              excel.employee.service              || db.employee.service,
      posteActuel:          excel.employee.posteActuel          || db.employee.posteActuel,
      anamnese:             db.employee.anamnese || excel.employee.anamnese,
      decisionsImportantes: db.employee.decisionsImportantes || excel.employee.decisionsImportantes,
    },
    antecedents: db.antecedents.length ? db.antecedents : excel.antecedents,
    restrictions: db.restrictions,
    expertises: db.expertises.length ? db.expertises : excel.expertises,
    visites: [...db.visites, ...excel.visites.filter((ev) => !db.visites.some((dv) => dv.dateVisite === ev.dateVisite))]
      .sort((a, b) => a.dateVisite.localeCompare(b.dateVisite)),
    restrictionsMedicales: [...(excel.restrictionsMedicales ?? []), ...(db.restrictions.map((r) => ({ description: `${r.typeRestriction}: ${r.motifMedical}`, dateDebut: r.dateDebut, dateFin: r.dateFin })))],
    maladiesChroniques: excel.maladiesChroniques,
    notes: excel.notes,
    corrections: excel.corrections,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   UI HELPERS
═══════════════════════════════════════════════════════════════════════════ */
function Chip({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={cn("inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full gap-0.5", color)}>{children}</span>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function GenererFiches() {
  const { toast } = useToast();
  const dropRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"manuel" | "excel">("excel");
  const [dragging, setDragging]       = useState(false);
  const [files, setFiles]             = useState<UploadedFile[]>([]);
  const [manualInput, setManualInput] = useState("");
  const [directory, setDirectory]     = useState<ParsedDirectory | null>(null);
  const [enrichDB, setEnrichDB]       = useState(false);
  const [showSheets, setShowSheets]   = useState(false);
  const [generating, setGenerating]   = useState<"pdf" | "word" | null>(null);
  const [done, setDone]               = useState<"pdf" | "word" | null>(null);

  /* ── Parse workbooks whenever files change ─────────────────────────────── */
  const reparse = useCallback((updatedFiles: UploadedFile[]) => {
    const loaded = updatedFiles.filter((f) => f.wb);
    if (loaded.length === 0) { setDirectory(null); return; }
    setDirectory(parseWorkbooks(loaded));
  }, []);

  /* ── Load a File → WorkBook ────────────────────────────────────────────── */
  const loadFile = useCallback((file: File, isGlobal: boolean) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target?.result, { type: "array", cellDates: true });
      setFiles((prev) => {
        const exists = prev.find((f) => f.file.name === file.name);
        const updated = exists
          ? prev.map((f) => f.file.name === file.name ? { ...f, wb, isGlobal } : f)
          : [...prev, { file, wb, isGlobal }];
        // auto-detect global by filename
        const withAutoGlobal = updated.map((f) => ({
          ...f,
          isGlobal: f.isGlobal || normalize(f.file.name).includes("global") || normalize(f.file.name).includes("personnel") || normalize(f.file.name).includes("effectif"),
        }));
        reparse(withAutoGlobal);
        return withAutoGlobal;
      });
    };
    reader.readAsArrayBuffer(file);
  }, [reparse]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    Array.from(e.dataTransfer.files).forEach((f) => loadFile(f, false));
  }, [loadFile]);

  const toggleGlobal = (idx: number) => {
    setFiles((prev) => { const next = prev.map((f, i) => i === idx ? { ...f, isGlobal: !f.isGlobal } : f); reparse(next); return next; });
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => { const next = prev.filter((_, i) => i !== idx); reparse(next); return next; });
  };

  /* ── Build final fiches list ───────────────────────────────────────────── */
  async function buildFiches(): Promise<FicheData[]> {
    if (!directory) return [];

    let targetMats: string[] = [];

    if (mode === "manuel") {
      // Parse textarea — split by newlines, commas, semicolons, tabs
      targetMats = manualInput
        .split(/[\n,;\t]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      targetMats = Array.from(directory.byMat.keys());
    }

    const fiches: FicheData[] = [];
    for (const input of targetMats) {
      const resolved = resolveMatricule(input, directory.byMat, directory.nameLookup);
      if (!resolved) {
        toast({ title: `Matricule introuvable : ${input}`, description: "Non trouvé dans les fichiers Excel ni par nom.", variant: "destructive" });
        continue;
      }
      let fiche = resolved.fiche;
      if (enrichDB) {
        const db = await fetchFromDB(fiche.employee.matricule);
        if (db) fiche = mergeDB(fiche, db);
      }
      fiches.push(fiche);
    }
    return fiches;
  }

  function downloadBlob(blob: Blob, ext: string, count: number) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = count === 1 && directory?.byMat.size === 1
      ? `fiche_${Array.from(directory!.byMat.keys())[0]}.${ext}`
      : `fiches_medicales_${new Date().toISOString().slice(0, 10)}.${ext}`;
    a.click(); URL.revokeObjectURL(url);
  }

  const generateWord = async () => {
    if (!directory) return;
    setGenerating("word"); setDone(null);
    try {
      const fiches = await buildFiches();
      if (!fiches.length) { setGenerating(null); return; }
      const blob = await generateWordBlob(fiches);
      downloadBlob(blob, "docx", fiches.length);
      setDone("word");
      toast({ title: `${fiches.length} fiche(s) Word générée(s) ✓` });
    } catch (err) { console.error(err); toast({ title: "Erreur Word", variant: "destructive" }); }
    setGenerating(null);
  };

  const generatePDF = async () => {
    if (!directory) return;
    setGenerating("pdf"); setDone(null);
    try {
      const fiches = await buildFiches();
      if (!fiches.length) { setGenerating(null); return; }
      const blob = await pdf(<FicheDocument fiches={fiches} />).toBlob();
      downloadBlob(blob, "pdf", fiches.length);
      setDone("pdf");
      toast({ title: `${fiches.length} fiche(s) PDF générée(s) ✓` });
    } catch (err) { console.error(err); toast({ title: "Erreur PDF", variant: "destructive" }); }
    setGenerating(null);
  };

  const agentCount = directory?.byMat.size ?? 0;
  const hasFiles = files.length > 0;
  const hasGlobal = files.some((f) => f.isGlobal);
  const canGenerate = !!directory && agentCount > 0 && (mode === "excel" || manualInput.trim().length > 0);

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-foreground">Générer Fiches Techniques PDF / Word</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Chargez vos fichiers Excel (tous les onglets sont analysés) — une fiche par agent avec toutes ses visites
        </p>
      </div>

      {/* ── Mode tabs ─────────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setMode("excel")} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors", mode === "excel" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground")}>
          <FileSpreadsheet className="w-4 h-4" /> Depuis Excel
        </button>
        <button onClick={() => setMode("manuel")} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors", mode === "manuel" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground")}>
          <ClipboardList className="w-4 h-4" /> Saisie manuelle
        </button>
      </div>

      {/* ── File upload zone (shared) ──────────────────────────────────── */}
      <div
        className={cn("border-2 border-dashed rounded-xl p-7 flex flex-col items-center gap-3 cursor-pointer transition-colors mb-4", dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/20")}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => dropRef.current?.click()}
      >
        <input ref={dropRef} type="file" accept=".xlsx,.xls,.csv" multiple className="hidden"
          onChange={(e) => Array.from(e.target.files ?? []).forEach((f) => loadFile(f, false))} />
        <Upload className={cn("w-8 h-8", hasFiles ? "text-primary" : "text-muted-foreground")} />
        <div className="text-center">
          <p className="font-medium text-foreground text-sm">
            {hasFiles ? `${files.length} fichier(s) chargé(s) — cliquez pour en ajouter` : "Déposez vos fichiers Excel ici"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Vous pouvez charger plusieurs fichiers — Registre VM, Personnel Global, Restrictions, etc.
          </p>
        </div>
      </div>

      {/* ── File list ─────────────────────────────────────────────────── */}
      {hasFiles && (
        <div className="bg-card border border-border rounded-xl mb-5 divide-y divide-border">
          {files.map((uf, idx) => {
            const sheetCount = uf.wb?.SheetNames.length ?? 0;
            const sheetNames = uf.wb?.SheetNames ?? [];
            return (
              <div key={idx} className="flex items-center gap-3 px-4 py-3">
                <FileSpreadsheet className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{uf.file.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {sheetNames.map((s) => {
                      const role = sheetRole(s);
                      return (
                        <span key={s} className={cn("text-xs px-1.5 py-0.5 rounded", role === "restrictions" ? "bg-red-50 text-red-600" : role === "maladies" ? "bg-orange-50 text-orange-600" : role === "global" ? "bg-purple-50 text-purple-600" : "bg-muted text-muted-foreground")}>
                          {s}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <button
                  onClick={() => toggleGlobal(idx)}
                  title="Marquer comme Personnel Global (fichier de référence)"
                  className={cn("flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors shrink-0", uf.isGlobal ? "bg-amber-50 border-amber-300 text-amber-700" : "border-border text-muted-foreground hover:border-amber-300 hover:text-amber-600")}
                >
                  <Star className={cn("w-3 h-3", uf.isGlobal ? "fill-amber-500 text-amber-500" : "")} />
                  {uf.isGlobal ? "Personnel Global" : "Marquer comme Global"}
                </button>
                <button onClick={() => removeFile(idx)} className="text-muted-foreground hover:text-red-500 transition-colors shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
          {!hasGlobal && (
            <div className="px-4 py-2 bg-amber-50 flex items-center gap-2 text-xs text-amber-700 rounded-b-xl">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Aucun fichier "Personnel Global" désigné — la correction par Nom/Prénom sera désactivée. Marquez le fichier de référence avec ★
            </div>
          )}
        </div>
      )}

      {/* ── Manual mode: textarea ─────────────────────────────────────── */}
      {mode === "manuel" && (
        <div className="mb-5">
          <label className="block text-sm font-medium text-foreground mb-2">
            Matricules à traiter <span className="text-muted-foreground font-normal">(un par ligne, ou séparés par virgule/point-virgule)</span>
          </label>
          <textarea
            className="w-full h-36 rounded-xl border border-border bg-background px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            placeholder={"MAT-001\nMAT-002\nMAT-003\n\nou collez directement depuis Excel..."}
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
          />
          {manualInput.trim() && (
            <p className="text-xs text-muted-foreground mt-1.5">
              {manualInput.split(/[\n,;\t]+/).map((s) => s.trim()).filter(Boolean).length} matricule(s) détecté(s)
            </p>
          )}
        </div>
      )}

      {/* ── Sheet analysis (excel mode) ───────────────────────────────── */}
      {directory && mode === "excel" && (
        <div className="bg-card border border-border rounded-xl mb-5">
          <button className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-foreground" onClick={() => setShowSheets((v) => !v)}>
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground" />
              Analyse — {agentCount} agent(s) trouvé(s) dans {files.length} fichier(s)
            </span>
            {showSheets ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showSheets && (
            <div className="border-t border-border px-5 py-4 grid grid-cols-3 gap-3">
              {Array.from(directory.byMat.entries()).slice(0, 30).map(([mat, fiche]) => (
                <div key={mat} className="flex flex-col bg-muted/30 rounded-lg px-3 py-2 text-xs gap-0.5">
                  <span className="font-mono font-bold text-foreground">{mat}</span>
                  <span className="text-muted-foreground truncate">{[fiche.employee.nom, fiche.employee.prenom].filter(Boolean).join(" ") || "—"}</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {fiche.visites.length > 0 && <Chip color="bg-blue-50 text-blue-700">{fiche.visites.length} visite(s)</Chip>}
                    {(fiche.restrictionsMedicales?.length ?? 0) > 0 && <Chip color="bg-red-50 text-red-600">Restrictions</Chip>}
                    {(fiche.maladiesChroniques?.length ?? 0) > 0 && <Chip color="bg-orange-50 text-orange-600">Maladies</Chip>}
                  </div>
                </div>
              ))}
              {agentCount > 30 && (
                <div className="col-span-3 text-xs text-muted-foreground text-center py-2">… et {agentCount - 30} autre(s)</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Enrich from DB toggle ─────────────────────────────────────── */}
      {directory && (
        <div className="bg-card border border-border rounded-xl px-5 py-4 mb-5 flex items-start gap-3">
          <div className={cn("relative mt-0.5 w-10 h-5 rounded-full cursor-pointer transition-colors shrink-0", enrichDB ? "bg-primary" : "bg-muted")} onClick={() => setEnrichDB((v) => !v)}>
            <span className={cn("absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform", enrichDB ? "translate-x-5" : "translate-x-0")} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><Database className="w-3.5 h-3.5" />Enrichir depuis la base de données</p>
            <p className="text-xs text-muted-foreground mt-0.5">Si l'agent existe dans la base, ajoute ATCD, Anamnèse, Décisions et Expertises déjà enregistrés</p>
          </div>
        </div>
      )}

      {/* ── Summary bar ───────────────────────────────────────────────── */}
      {directory && (
        <div className="bg-muted/30 border border-border rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <div>
              <p className="font-semibold text-foreground text-sm">
                {mode === "excel" ? `${agentCount} agent(s) détecté(s)` : `${manualInput.split(/[\n,;\t]+/).map(s=>s.trim()).filter(Boolean).length} matricule(s) à traiter`}
              </p>
              <p className="text-xs text-muted-foreground">
                {files.length} fichier(s) · {files.reduce((a, f) => a + (f.wb?.SheetNames.length ?? 0), 0)} feuille(s) analysée(s)
                {hasGlobal && " · Personnel Global actif (correction automatique)"}
              </p>
            </div>
          </div>
          {done && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />{done === "pdf" ? "PDF téléchargé" : "Word téléchargé"}</span>}
        </div>
      )}

      {/* ── Action buttons ────────────────────────────────────────────── */}
      {directory && (
        <div className="flex flex-wrap gap-3">
          <Button onClick={generateWord} disabled={!!generating || !canGenerate} className="gap-2 min-w-52 bg-blue-600 hover:bg-blue-700">
            {generating === "word" ? <><Loader2 className="w-4 h-4 animate-spin" />Génération Word…</> : <><FileText className="w-4 h-4" />Word (.docx) modifiable</>}
          </Button>
          <Button onClick={generatePDF} disabled={!!generating || !canGenerate} variant="outline" className="gap-2 min-w-44">
            {generating === "pdf" ? <><Loader2 className="w-4 h-4 animate-spin" />Génération PDF…</> : <><Download className="w-4 h-4" />PDF</>}
          </Button>
          <Button variant="ghost" className="gap-2" onClick={() => { setFiles([]); setDirectory(null); setManualInput(""); setDone(null); if (dropRef.current) dropRef.current.value = ""; }}>
            <RefreshCw className="w-3.5 h-3.5" />Réinitialiser
          </Button>
        </div>
      )}

      {!hasFiles && (
        <div className="mt-8 bg-muted/20 rounded-xl border border-border p-5">
          <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2"><Info className="w-4 h-4 text-primary" />Fonctionnement</p>
          <ul className="text-xs text-muted-foreground space-y-1.5 list-none">
            <li>• <strong>Tous les onglets</strong> sont analysés automatiquement</li>
            <li>• Les onglets <strong>"Restrictions Médicales"</strong> et <strong>"Maladies Chroniques"</strong> sont traités en priorité</li>
            <li>• Le fichier <strong>"Personnel Global"</strong> sert de référence — si un matricule est erroné, la correction se fait par Nom &amp; Prénom</li>
            <li>• Les données sont croisées par <strong>matricule</strong> entre tous les fichiers</li>
            <li>• Les visites sont triées de la <strong>plus ancienne à la plus récente</strong></li>
            <li>• L'âge est calculé <strong>automatiquement</strong> depuis la date de naissance</li>
          </ul>
        </div>
      )}
    </div>
  );
}
