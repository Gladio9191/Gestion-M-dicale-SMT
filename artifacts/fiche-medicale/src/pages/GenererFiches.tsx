import { useRef, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { pdf } from "@react-pdf/renderer";
import { FicheDocument, FicheData, NoteEntry } from "@/components/FichePDF";
import { generateWordBlob } from "@/components/FicheWord";
import {
  Upload, FileSpreadsheet, Download, Loader2,
  CheckCircle, Users, RefreshCw, ChevronDown, ChevronUp,
  Database, AlertTriangle, Layers, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/* ── Field mapping definitions ───────────────────────────────────────────── */
type KnownField =
  | "matricule" | "nom" | "prenom"
  | "direction" | "service" | "posteActuel" | "dateEmbauche"
  | "dateVisite" | "examensCliniques" | "observations" | "decisionAptitude";

const KNOWN_FIELDS: KnownField[] = [
  "matricule", "nom", "prenom", "direction", "service",
  "posteActuel", "dateEmbauche", "dateVisite", "examensCliniques",
  "observations", "decisionAptitude",
];

const FIELD_LABELS: Record<KnownField, string> = {
  matricule:        "Matricule (Mle)",
  nom:              "Nom",
  prenom:           "Prénom",
  direction:        "Direction",
  service:          "Service",
  posteActuel:      "Fonction / Poste",
  dateEmbauche:     "Date d'embauche",
  dateVisite:       "Date de visite",
  examensCliniques: "Examens cliniques",
  observations:     "Observations",
  decisionAptitude: "Décision d'aptitude",
};

const SYNONYMS: Record<KnownField, string[]> = {
  matricule:        ["mle", "mat", "matricule", "matricul", "immatriculation"],
  nom:              ["nom", "name", "lastname", "last"],
  prenom:           ["prenom", "prénom", "firstname", "first", "given"],
  direction:        ["dir", "direction", "département", "departement", "dept"],
  service:          ["service", "svc", "sect", "section"],
  posteActuel:      ["fonction", "poste", "post", "emploi", "job", "titre"],
  dateEmbauche:     ["embauche", "embauché", "recrutement", "recruitment", "anciennete", "dembauche"],
  dateVisite:       ["date", "dates", "datevisite", "visite", "vm", "date vm", "datevm"],
  examensCliniques: ["examen", "examens", "clinique", "explorations", "bilan", "typeexamen", "exam"],
  observations:     ["obs", "observation", "observations", "remarque", "remarques", "resultat", "résultat"],
  decisionAptitude: ["decision", "aptitude", "décision", "apte", "avis"],
};

/* ── Auto-detect which column maps to which field ────────────────────────── */
function detectField(colName: string): KnownField | null {
  const n = colName.toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]/g, "");
  for (const field of KNOWN_FIELDS) {
    if (SYNONYMS[field].some((s) => {
      const sn = s.replace(/[^a-z0-9]/g, "");
      return n === sn || n.startsWith(sn) || sn.startsWith(n);
    })) return field;
  }
  return null;
}

/* ── Sheet analysis result ───────────────────────────────────────────────── */
type SheetInfo = {
  name: string;
  rowCount: number;
  hasMatricule: boolean;
  mappedCols: Map<string, KnownField>;  // colName → field
  unmappedCols: string[];               // colName (not recognized)
  agentCount: number;
};

type ParseResult = {
  fichesByMat: Map<string, FicheData>;
  sheets: SheetInfo[];
  totalAgents: number;
};

/* ── Parse entire workbook ───────────────────────────────────────────────── */
function parseWorkbook(wb: XLSX.WorkBook): ParseResult {
  const fichesByMat = new Map<string, FicheData>();
  const sheets: SheetInfo[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
      defval: "",
      raw: false,
    });

    if (rows.length === 0) {
      sheets.push({ name: sheetName, rowCount: 0, hasMatricule: false, mappedCols: new Map(), unmappedCols: [], agentCount: 0 });
      continue;
    }

    const headers = Object.keys(rows[0]);

    // Map each column to a known field (or mark as unmapped)
    const mappedCols = new Map<string, KnownField>();
    const unmappedCols: string[] = [];

    for (const h of headers) {
      const field = detectField(h);
      if (field) {
        // Prefer first match (don't overwrite already-mapped field)
        if (![...mappedCols.values()].includes(field)) {
          mappedCols.set(h, field);
        } else {
          unmappedCols.push(h); // second column for same field → note
        }
      } else {
        unmappedCols.push(h);
      }
    }

    // Find matricule column
    const matCol = [...mappedCols.entries()].find(([, f]) => f === "matricule")?.[0];
    const hasMatricule = !!matCol;

    // Helper: get value for a known field in a row
    const get = (row: Record<string, string>, field: KnownField): string => {
      const col = [...mappedCols.entries()].find(([, f]) => f === field)?.[0];
      return col ? String(row[col] ?? "").trim() : "";
    };

    const agentsInSheet = new Set<string>();

    if (hasMatricule) {
      for (const row of rows) {
        const mat = String(row[matCol!] ?? "").trim();
        if (!mat) continue;
        agentsInSheet.add(mat);

        // Init fiche if not exists
        if (!fichesByMat.has(mat)) {
          fichesByMat.set(mat, {
            employee: {
              matricule: mat,
              nom: "",
              prenom: "",
              age: null,
              dateEmbauche: null,
              direction: null,
              service: null,
              posteActuel: null,
              anamnese: null,
              decisionsImportantes: null,
            },
            antecedents: [],
            restrictions: [],
            expertises: [],
            visites: [],
            notes: [],
          });
        }

        const fiche = fichesByMat.get(mat)!;

        // Merge employee fields (first non-empty wins)
        const merge = (field: KnownField, target: keyof FicheData["employee"]) => {
          const val = get(row, field);
          if (val && !fiche.employee[target]) {
            (fiche.employee as Record<string, unknown>)[target] = val;
          }
        };
        merge("nom",          "nom");
        merge("prenom",       "prenom");
        merge("direction",    "direction");
        merge("service",      "service");
        merge("posteActuel",  "posteActuel");
        merge("dateEmbauche", "dateEmbauche");

        // If this row has a date → it's a visit row
        const dateVisite = get(row, "dateVisite");
        if (dateVisite) {
          const examens = get(row, "examensCliniques");
          const obs     = get(row, "observations");
          const decision = get(row, "decisionAptitude");

          // Avoid exact duplicate visits
          const isDup = fiche.visites.some(
            (v) => v.dateVisite === dateVisite && v.examensCliniques === (examens || null)
          );
          if (!isDup) {
            fiche.visites.push({
              dateVisite,
              typeVisite:       null,
              examensCliniques: examens || null,
              observations:     obs || null,
              recommandations:  null,
              decisionAptitude: decision || null,
            });
          }
        }

        // Collect unmapped non-empty values as notes
        for (const col of unmappedCols) {
          const val = String(row[col] ?? "").trim();
          if (!val) continue;
          // Deduplicate notes (same sheet+label+value)
          const already = fiche.notes!.some(
            (n) => n.sheet === sheetName && n.label === col && n.value === val
          );
          if (!already) {
            fiche.notes!.push({ sheet: sheetName, label: col, value: val });
          }
        }
      }
    }

    sheets.push({
      name: sheetName,
      rowCount: rows.length,
      hasMatricule,
      mappedCols,
      unmappedCols: unmappedCols.filter((c) => {
        // only show as "unmapped" if it has at least one non-empty value
        return rows.some((r) => String(r[c] ?? "").trim());
      }),
      agentCount: agentsInSheet.size,
    });
  }

  // Sort visits by date for each agent
  for (const fiche of fichesByMat.values()) {
    fiche.visites.sort((a, b) => a.dateVisite.localeCompare(b.dateVisite));
    if (fiche.notes?.length === 0) fiche.notes = undefined;
  }

  return {
    fichesByMat,
    sheets,
    totalAgents: fichesByMat.size,
  };
}

/* ── Fetch from DB to enrich ─────────────────────────────────────────────── */
async function fetchFicheFromDB(matricule: string): Promise<FicheData | null> {
  try {
    const res = await fetch(`/api/employees/${encodeURIComponent(matricule)}/fiche`);
    if (!res.ok) return null;
    return res.json() as Promise<FicheData>;
  } catch {
    return null;
  }
}

function mergeWithDB(excel: FicheData, db: FicheData): FicheData {
  return {
    employee: {
      ...excel.employee,
      nom:                  excel.employee.nom    || db.employee.nom,
      prenom:               excel.employee.prenom || db.employee.prenom,
      age:                  db.employee.age ?? excel.employee.age,
      dateEmbauche:         excel.employee.dateEmbauche         || db.employee.dateEmbauche,
      direction:            excel.employee.direction            || db.employee.direction,
      service:              excel.employee.service              || db.employee.service,
      posteActuel:          excel.employee.posteActuel          || db.employee.posteActuel,
      anamnese:             db.employee.anamnese,
      decisionsImportantes: db.employee.decisionsImportantes,
    },
    antecedents: db.antecedents.length ? db.antecedents : excel.antecedents,
    restrictions: db.restrictions,
    expertises:   db.expertises,
    visites: [
      ...db.visites,
      ...excel.visites.filter((ev) => !db.visites.some((dv) => dv.dateVisite === ev.dateVisite)),
    ].sort((a, b) => a.dateVisite.localeCompare(b.dateVisite)),
    notes: excel.notes,
  };
}

/* ── Badge helpers ───────────────────────────────────────────────────────── */
function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={cn("inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full", color)}>
      {children}
    </span>
  );
}

/* ── Page component ──────────────────────────────────────────────────────── */
export default function GenererFiches() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [dragging, setDragging]           = useState(false);
  const [fileName, setFileName]           = useState<string | null>(null);
  const [parseResult, setParseResult]     = useState<ParseResult | null>(null);
  const [showSheets, setShowSheets]       = useState(false);
  const [enrichDB, setEnrichDB]           = useState(false);
  const [generating, setGenerating]       = useState<"pdf" | "word" | null>(null);
  const [done, setDone]                   = useState<"pdf" | "word" | null>(null);

  const parseFile = useCallback((file: File) => {
    setFileName(file.name);
    setDone(null);
    setParseResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array", cellDates: true });
        const result = parseWorkbook(wb);
        setParseResult(result);
        if (result.totalAgents === 0) {
          toast({
            title: "Aucun agent trouvé",
            description: "Vérifiez que vos feuilles contiennent une colonne Mle ou Matricule.",
            variant: "destructive",
          });
        }
      } catch {
        toast({ title: "Erreur de lecture du fichier", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  }, [toast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [parseFile]);

  async function getFiches(): Promise<FicheData[]> {
    let fiches = Array.from(parseResult!.fichesByMat.values());
    if (enrichDB) {
      const enriched: FicheData[] = [];
      for (const fiche of fiches) {
        const db = await fetchFicheFromDB(fiche.employee.matricule);
        enriched.push(db ? mergeWithDB(fiche, db) : fiche);
      }
      fiches = enriched;
    }
    return fiches;
  }

  function downloadBlob(blob: Blob, ext: string) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href    = url;
    const count = parseResult!.totalAgents;
    const mat   = Array.from(parseResult!.fichesByMat.keys())[0];
    a.download  = count === 1
      ? `fiche_${mat}.${ext}`
      : `fiches_medicales_${new Date().toISOString().slice(0, 10)}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const generatePDF = async () => {
    if (!parseResult || parseResult.totalAgents === 0) return;
    setGenerating("pdf");
    setDone(null);
    try {
      const fiches = await getFiches();
      const blob   = await pdf(<FicheDocument fiches={fiches} />).toBlob();
      downloadBlob(blob, "pdf");
      setDone("pdf");
      toast({ title: `${fiches.length} fiche(s) PDF générée(s) ✓` });
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur de génération PDF", variant: "destructive" });
    }
    setGenerating(null);
  };

  const generateWord = async () => {
    if (!parseResult || parseResult.totalAgents === 0) return;
    setGenerating("word");
    setDone(null);
    try {
      const fiches = await getFiches();
      const blob   = await generateWordBlob(fiches);
      downloadBlob(blob, "docx");
      setDone("word");
      toast({ title: `${fiches.length} fiche(s) Word générée(s) ✓` });
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur de génération Word", variant: "destructive" });
    }
    setGenerating(null);
  };

  const hasFile = !!parseResult;
  const activeSheets  = parseResult?.sheets.filter((s) => s.hasMatricule) ?? [];
  const skippedSheets = parseResult?.sheets.filter((s) => !s.hasMatricule && s.rowCount > 0) ?? [];
  const sheetsWithNotes = activeSheets.filter((s) => s.unmappedCols.length > 0);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Générer Fiches Techniques PDF</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Toutes les feuilles du classeur sont analysées — une fiche par agent, toutes ses visites regroupées
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
                {parseResult!.sheets.length} feuille(s) analysée(s) — {parseResult!.totalAgents} agent(s) trouvé(s) — cliquez pour changer
              </p>
            </div>
          </>
        ) : (
          <>
            <Upload className="w-10 h-10 text-muted-foreground" />
            <div className="text-center">
              <p className="font-semibold text-foreground">Déposez le fichier Excel ici</p>
              <p className="text-sm text-muted-foreground">
                Toutes les feuilles (.xlsx, .xls) seront lues automatiquement
              </p>
            </div>
          </>
        )}
      </div>

      {hasFile && parseResult!.totalAgents > 0 && (
        <>
          {/* Sheet analysis */}
          <div className="bg-card border border-border rounded-xl mb-5">
            <button
              className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-foreground"
              onClick={() => setShowSheets((v) => !v)}
            >
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                Analyse des feuilles
                {sheetsWithNotes.length > 0 && (
                  <span className="flex items-center gap-1 text-amber-600 font-normal text-xs">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {sheetsWithNotes.reduce((a, s) => a + s.unmappedCols.length, 0)} colonne(s) non utilisée(s) → ajoutées en notes
                  </span>
                )}
              </span>
              {showSheets ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showSheets && (
              <div className="border-t border-border divide-y divide-border">
                {parseResult!.sheets.map((sheet) => (
                  <div key={sheet.name} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-foreground">{sheet.name}</span>
                      <div className="flex gap-2">
                        {sheet.rowCount === 0 && <Badge color="bg-muted text-muted-foreground">Vide</Badge>}
                        {sheet.rowCount > 0 && !sheet.hasMatricule && (
                          <Badge color="bg-slate-100 text-slate-500">Ignorée — pas de Matricule</Badge>
                        )}
                        {sheet.hasMatricule && (
                          <>
                            <Badge color="bg-green-50 text-green-700">{sheet.agentCount} agent(s)</Badge>
                            <Badge color="bg-blue-50 text-blue-600">{sheet.rowCount} ligne(s)</Badge>
                          </>
                        )}
                      </div>
                    </div>

                    {sheet.hasMatricule && (
                      <div className="text-xs text-muted-foreground mt-1.5 space-y-1">
                        {/* Mapped fields */}
                        <div className="flex flex-wrap gap-1">
                          {Array.from(sheet.mappedCols.entries()).map(([col, field]) => (
                            <span key={col} className="bg-green-50 text-green-700 border border-green-200 rounded px-2 py-0.5">
                              {col} → {FIELD_LABELS[field]}
                            </span>
                          ))}
                        </div>
                        {/* Unmapped columns */}
                        {sheet.unmappedCols.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="text-amber-600 font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Notes :
                            </span>
                            {sheet.unmappedCols.map((col) => (
                              <span key={col} className="bg-amber-50 text-amber-700 border border-amber-200 rounded px-2 py-0.5">
                                {col}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {!sheet.hasMatricule && sheet.rowCount > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Colonnes trouvées : {Object.keys(XLSX.utils.sheet_to_json<Record<string, string>>(
                          { '!ref': '' } as XLSX.WorkSheet
                        )[0] ?? {}).join(", ") || "—"}
                      </p>
                    )}
                  </div>
                ))}

                {skippedSheets.length > 0 && (
                  <div className="px-5 py-3 bg-muted/20">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">{skippedSheets.length} feuille(s) ignorée(s)</span> — aucune colonne Matricule/Mle détectée
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Enrich from DB toggle */}
          <div className="bg-card border border-border rounded-xl px-5 py-4 mb-5 flex items-start gap-3">
            <div
              className={cn(
                "relative mt-0.5 w-10 h-5 rounded-full cursor-pointer transition-colors shrink-0",
                enrichDB ? "bg-primary" : "bg-muted"
              )}
              onClick={() => setEnrichDB((v) => !v)}
            >
              <span className={cn(
                "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                enrichDB ? "translate-x-5" : "translate-x-0"
              )} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                Enrichir depuis la base de données
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Si l'agent existe dans la base, ajoute ATCD, Anamnèse, Décisions importantes et Expertises déjà enregistrées
              </p>
            </div>
          </div>

          {/* Summary bar */}
          <div className="bg-muted/30 border border-border rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <p className="font-semibold text-foreground text-sm">{parseResult!.totalAgents} agent(s)</p>
                <p className="text-xs text-muted-foreground">
                  {activeSheets.length} feuille(s) utilisée(s)
                  {sheetsWithNotes.length > 0 && ` · ${sheetsWithNotes.reduce((a, s) => a + s.unmappedCols.length, 0)} colonnes → notes`}
                </p>
              </div>
            </div>
            {done && (
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                {done === "pdf" ? "PDF téléchargé" : "Word téléchargé"}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={generateWord}
              disabled={!!generating}
              className="gap-2 min-w-52 bg-blue-600 hover:bg-blue-700"
            >
              {generating === "word" ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Génération Word…</>
              ) : (
                <><FileText className="w-4 h-4" />Word (.docx) — {parseResult!.totalAgents} fiche(s)</>
              )}
            </Button>
            <Button
              onClick={generatePDF}
              disabled={!!generating}
              variant="outline"
              className="gap-2 min-w-52"
            >
              {generating === "pdf" ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Génération PDF…</>
              ) : (
                <><Download className="w-4 h-4" />PDF — {parseResult!.totalAgents} fiche(s)</>
              )}
            </Button>
            <Button variant="ghost" className="gap-2" onClick={() => {
              setFileName(null);
              setParseResult(null);
              setDone(null);
              if (fileRef.current) fileRef.current.value = "";
            }}>
              <RefreshCw className="w-3.5 h-3.5" />Réinitialiser
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
