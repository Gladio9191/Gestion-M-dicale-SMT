import { useRef, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { pdf } from "@react-pdf/renderer";
import { FicheDocument, FicheData } from "@/components/FichePDF";
import {
  Upload, FileSpreadsheet, Download, Loader2,
  CheckCircle, Users, RefreshCw, ChevronDown, ChevronUp,
  Database, Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/* ── Column mapping ──────────────────────────────────────────────────────── */
type TargetField =
  | "matricule" | "nom" | "prenom"
  | "direction" | "service" | "posteActuel" | "dateEmbauche"
  | "dateVisite" | "examensCliniques" | "observations" | "decisionAptitude";

type ColMap = Record<TargetField, string>;

const TARGETS: { key: TargetField; label: string; required?: boolean }[] = [
  { key: "matricule",       label: "Matricule (Mle)",                 required: true },
  { key: "nom",             label: "Nom" },
  { key: "prenom",          label: "Prénom" },
  { key: "direction",       label: "Direction" },
  { key: "service",         label: "Service" },
  { key: "posteActuel",     label: "Fonction / Poste" },
  { key: "dateEmbauche",    label: "Date d'embauche" },
  { key: "dateVisite",      label: "Date de visite" },
  { key: "examensCliniques",label: "Examens cliniques / explorations" },
  { key: "observations",    label: "Observations" },
  { key: "decisionAptitude",label: "Décision d'aptitude" },
];

const SYNONYMS: Record<TargetField, string[]> = {
  matricule:        ["mle", "mat", "matricule", "matricul"],
  nom:              ["nom", "name", "last"],
  prenom:           ["prenom", "prénom", "first", "given"],
  direction:        ["dir", "direction", "département", "departement"],
  service:          ["service", "svc"],
  posteActuel:      ["fonction", "poste", "post", "emploi", "job"],
  dateEmbauche:     ["embauche", "embauché", "recrutement", "recrutment", "anciennete"],
  dateVisite:       ["date", "dates", "datevisite", "visite", "date vm", "vm"],
  examensCliniques: ["examen", "examens", "clinique", "explorations", "bilan"],
  observations:     ["obs", "observation", "observations", "remarque"],
  decisionAptitude: ["decision", "aptitude", "décision", "apte"],
};

function autoMap(headers: string[]): ColMap {
  const map = {} as ColMap;
  for (const { key } of TARGETS) {
    const synonyms = SYNONYMS[key];
    const found = headers.find((h) => {
      const n = h.toLowerCase().trim().replace(/[^a-zéèêàâîïùûç]/gi, "");
      return synonyms.some((s) => n === s || n.startsWith(s));
    });
    map[key] = found ?? "";
  }
  return map;
}

/* ── Fetch from DB ───────────────────────────────────────────────────────── */
async function fetchFicheFromDB(matricule: string): Promise<FicheData | null> {
  try {
    const res = await fetch(`/api/employees/${encodeURIComponent(matricule)}/fiche`);
    if (!res.ok) return null;
    return res.json() as Promise<FicheData>;
  } catch {
    return null;
  }
}

/* ── Build fiches from Excel rows ────────────────────────────────────────── */
type RawRow = Record<string, string>;

function buildFichesFromExcel(rows: RawRow[], colMap: ColMap): FicheData[] {
  const g = (row: RawRow, key: TargetField) =>
    (colMap[key] ? (row[colMap[key]] ?? "") : "").toString().trim();

  // Group rows by matricule
  const byMat = new Map<string, RawRow[]>();
  for (const row of rows) {
    const mat = g(row, "matricule");
    if (!mat) continue;
    if (!byMat.has(mat)) byMat.set(mat, []);
    byMat.get(mat)!.push(row);
  }

  return Array.from(byMat.entries()).map(([matricule, agentRows]) => {
    const first = agentRows[0];

    const visites = agentRows
      .filter((r) => g(r, "dateVisite"))
      .map((r) => ({
        dateVisite:       g(r, "dateVisite"),
        typeVisite:       null,
        examensCliniques: g(r, "examensCliniques") || null,
        observations:     g(r, "observations") || null,
        recommandations:  null,
        decisionAptitude: g(r, "decisionAptitude") || null,
      }));

    return {
      employee: {
        matricule,
        nom:                  g(first, "nom"),
        prenom:               g(first, "prenom"),
        age:                  null,
        dateEmbauche:         g(first, "dateEmbauche") || null,
        direction:            g(first, "direction") || null,
        service:              g(first, "service") || null,
        posteActuel:          g(first, "posteActuel") || null,
        anamnese:             null,
        decisionsImportantes: null,
      },
      antecedents: [],
      restrictions: [],
      expertises:   [],
      visites,
    } satisfies FicheData;
  });
}

/* ── Merge DB data into Excel-built fiche ────────────────────────────────── */
function mergeWithDB(excel: FicheData, db: FicheData): FicheData {
  return {
    employee: {
      ...excel.employee,
      nom:    excel.employee.nom    || db.employee.nom,
      prenom: excel.employee.prenom || db.employee.prenom,
      age:    db.employee.age ?? excel.employee.age,
      dateEmbauche:         excel.employee.dateEmbauche         || db.employee.dateEmbauche,
      direction:            excel.employee.direction            || db.employee.direction,
      service:              excel.employee.service              || db.employee.service,
      posteActuel:          excel.employee.posteActuel          || db.employee.posteActuel,
      anamnese:             db.employee.anamnese,
      decisionsImportantes: db.employee.decisionsImportantes,
    },
    antecedents: db.antecedents,
    restrictions: db.restrictions,
    expertises:  db.expertises,
    // Merge visits: DB + Excel, deduplicate by date
    visites: [
      ...db.visites,
      ...excel.visites.filter(
        (ev) => !db.visites.some((dv) => dv.dateVisite === ev.dateVisite)
      ),
    ].sort((a, b) => a.dateVisite.localeCompare(b.dateVisite)),
  };
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function GenererFiches() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [dragging, setDragging]   = useState(false);
  const [fileName, setFileName]   = useState<string | null>(null);
  const [headers, setHeaders]     = useState<string[]>([]);
  const [rows, setRows]           = useState<RawRow[]>([]);
  const [colMap, setColMap]       = useState<ColMap>({} as ColMap);
  const [showMap, setShowMap]     = useState(false);
  const [enrichDB, setEnrichDB]   = useState(false);
  const [generating, setGenerating] = useState(false);
  const [agentCount, setAgentCount] = useState(0);
  const [done, setDone]           = useState(false);

  const parseFile = useCallback((file: File) => {
    setFileName(file.name);
    setDone(false);
    setAgentCount(0);
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target?.result, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const parsed = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: "", raw: false });
      if (parsed.length === 0) {
        toast({ title: "Fichier vide", variant: "destructive" });
        return;
      }
      const hdrs = Object.keys(parsed[0]);
      setHeaders(hdrs);
      setRows(parsed);
      const mapped = autoMap(hdrs);
      setColMap(mapped);
      // Count unique agents
      const mats = new Set(
        parsed.map((r) => (mapped.matricule ? String(r[mapped.matricule] ?? "") : "").trim()).filter(Boolean)
      );
      setAgentCount(mats.size);
    };
    reader.readAsArrayBuffer(file);
  }, [toast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [parseFile]);

  // Recount when colMap changes
  const updateMap = (key: TargetField, col: string) => {
    setColMap((prev) => {
      const next = { ...prev, [key]: col };
      if (key === "matricule") {
        const mats = new Set(
          rows.map((r) => (col ? String(r[col] ?? "") : "").trim()).filter(Boolean)
        );
        setAgentCount(mats.size);
      }
      return next;
    });
  };

  const generate = async () => {
    if (!colMap.matricule) {
      toast({ title: "Colonne Matricule manquante", description: "Choisissez la colonne Matricule.", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setDone(false);

    let fiches = buildFichesFromExcel(rows, colMap);

    if (enrichDB) {
      const enriched: FicheData[] = [];
      for (const fiche of fiches) {
        const db = await fetchFicheFromDB(fiche.employee.matricule);
        enriched.push(db ? mergeWithDB(fiche, db) : fiche);
      }
      fiches = enriched;
    }

    if (fiches.length === 0) {
      toast({ title: "Aucun agent trouvé", description: "Vérifiez la colonne Matricule.", variant: "destructive" });
      setGenerating(false);
      return;
    }

    try {
      const blob = await pdf(<FicheDocument fiches={fiches} />).toBlob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = fiches.length === 1
        ? `fiche_${fiches[0].employee.matricule}.pdf`
        : `fiches_medicales_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setDone(true);
      toast({ title: `${fiches.length} fiche(s) générée(s) ✓` });
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur de génération PDF", variant: "destructive" });
    }

    setGenerating(false);
  };

  const hasFile = rows.length > 0;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Générer Fiches Techniques PDF</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Importez le tableau Excel — une fiche sera générée par agent avec toutes ses visites
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
                {rows.length} ligne(s) — {agentCount} agent(s) unique(s) — cliquez pour changer
              </p>
            </div>
          </>
        ) : (
          <>
            <Upload className="w-10 h-10 text-muted-foreground" />
            <div className="text-center">
              <p className="font-semibold text-foreground">Déposez le tableau Excel ici</p>
              <p className="text-sm text-muted-foreground">Registre VM ou tout tableau contenant les agents et leurs visites</p>
            </div>
          </>
        )}
      </div>

      {hasFile && (
        <>
          {/* Column mapping */}
          <div className="bg-card border border-border rounded-xl mb-5">
            <button
              className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-foreground"
              onClick={() => setShowMap((v) => !v)}
            >
              <span className="flex items-center gap-2">
                <Table2 className="w-4 h-4 text-muted-foreground" />
                Correspondance des colonnes
              </span>
              {showMap ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showMap && (
              <div className="px-5 pb-5 border-t border-border">
                <p className="text-xs text-muted-foreground mt-3 mb-4">
                  La détection est automatique. Corrigez si nécessaire.
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {TARGETS.map(({ key, label, required }) => (
                    <div key={key}>
                      <label className="text-xs font-medium text-foreground mb-1 block">
                        {label}{required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <select
                        className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background text-foreground"
                        value={colMap[key] ?? ""}
                        onChange={(e) => updateMap(key, e.target.value)}
                      >
                        <option value="">— Ignorer —</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Enrich from DB toggle */}
          <div className="bg-card border border-border rounded-xl px-5 py-4 mb-6 flex items-start gap-3">
            <div
              className={cn(
                "relative mt-0.5 w-10 h-5 rounded-full cursor-pointer transition-colors shrink-0",
                enrichDB ? "bg-primary" : "bg-muted"
              )}
              onClick={() => setEnrichDB((v) => !v)}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                  enrichDB ? "translate-x-5" : "translate-x-0"
                )}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                Enrichir depuis la base de données
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Si l'agent existe dans la base, ajoute les ATCD, Anamnèse, Décisions importantes et Expertises déjà enregistrées
              </p>
            </div>
          </div>

          {/* Summary + Generate */}
          <div className="bg-muted/30 border border-border rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <p className="font-semibold text-foreground text-sm">{agentCount} agent(s) détecté(s)</p>
                <p className="text-xs text-muted-foreground">{rows.length} ligne(s) au total dans le tableau</p>
              </div>
            </div>
            {done && (
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> PDF téléchargé
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={generate}
              disabled={generating || agentCount === 0}
              className="gap-2 min-w-56"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Génération en cours…
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Générer {agentCount} fiche(s) PDF
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                setFileName(null);
                setRows([]);
                setHeaders([]);
                setColMap({} as ColMap);
                setAgentCount(0);
                setDone(false);
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Réinitialiser
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
