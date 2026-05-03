import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Target, ShieldCheck, TrendingUp, Building2, Upload, CheckCircle2,
  Circle, ChevronDown, FileText, Trash2, AlertCircle,
} from "lucide-react";

/* ── Palette ────────────────────────────────────────────────────────────── */
const C = {
  blue:   "#2563EB",
  teal:   "#0D9488",
  amber:  "#D97706",
  rose:   "#E11D48",
  indigo: "#4F46E5",
  slate:  "#64748B",
  green:  "#16A34A",
  CHART:  ["#2563EB","#0D9488","#D97706","#E11D48","#4F46E5","#0891B2"],
};

/* ── Shared UI ──────────────────────────────────────────────────────────── */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function SectionBadge({ n, color }: { n: number; color: string }) {
  return (
    <span
      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
      style={{ backgroundColor: color }}
    >
      {n}
    </span>
  );
}

function ObjectiveHeader({
  n, color, icon: Icon, title, subtitle, open, toggle,
}: {
  n: number; color: string; icon: React.ElementType;
  title: string; subtitle: string; open: boolean; toggle: () => void;
}) {
  return (
    <button
      onClick={toggle}
      className="w-full flex items-center gap-4 p-5 text-left"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}18` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <SectionBadge n={n} color={color} />
          <span className="font-semibold text-slate-800 text-[15px]">{title}</span>
        </div>
        <p className="text-[12px] text-slate-500 ml-9">{subtitle}</p>
      </div>
      <ChevronDown
        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      />
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   OBJECTIVE 1 — Couverture médicale
═══════════════════════════════════════════════════════════════════════════ */
type UnitData = { effectif: string; vma: string };

function CoverageUnit({ label, data, onChange, color }: {
  label: string; data: UnitData;
  onChange: (d: UnitData) => void; color: string;
}) {
  const eff = parseInt(data.effectif) || 0;
  const vma = parseInt(data.vma) || 0;
  const pct = eff > 0 ? Math.min(100, Math.round((vma / eff) * 100)) : 0;

  const badge =
    pct >= 90 ? { label: "Excellent", color: "#16A34A" } :
    pct >= 70 ? { label: "Satisfaisant", color: "#D97706" } :
    { label: "Insuffisant", color: "#E11D48" };

  return (
    <div className="border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700 text-[14px]">{label}</h3>
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: `${badge.color}18`, color: badge.color }}
        >
          {badge.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { key: "effectif" as const, label: "Effectif Total", placeholder: "ex: 120" },
          { key: "vma" as const, label: "VMA réalisés", placeholder: "ex: 98" },
        ].map(({ key, label: lbl, placeholder }) => (
          <div key={key}>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">{lbl}</label>
            <input
              type="number"
              min={0}
              placeholder={placeholder}
              value={data[key]}
              onChange={e => onChange({ ...data, [key]: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Taux de couverture</span>
          <span className="text-[13px] font-bold" style={{ color }}>{pct}%</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
        <p className="text-[11px] text-slate-400">{vma} / {eff} agents couverts</p>
      </div>
    </div>
  );
}

function Obj1() {
  const [dxg, setDxg] = useState<UnitData>({ effectif: "", vma: "" });
  const [dtu, setDtu] = useState<UnitData>({ effectif: "", vma: "" });

  const totalEff = (parseInt(dxg.effectif) || 0) + (parseInt(dtu.effectif) || 0);
  const totalVma = (parseInt(dxg.vma) || 0) + (parseInt(dtu.vma) || 0);
  const totalPct = totalEff > 0 ? Math.round((totalVma / totalEff) * 100) : 0;

  const chartData = [
    { name: "DXG", couverture: parseInt(dxg.effectif) > 0 ? Math.round((parseInt(dxg.vma)||0)/(parseInt(dxg.effectif))*100) : 0, objectif: 100 },
    { name: "DTU", couverture: parseInt(dtu.effectif) > 0 ? Math.round((parseInt(dtu.vma)||0)/(parseInt(dtu.effectif))*100) : 0, objectif: 100 },
  ];

  return (
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CoverageUnit label="Direction DXG" data={dxg} onChange={setDxg} color={C.blue} />
        <CoverageUnit label="Direction DTU" data={dtu} onChange={setDtu} color={C.teal} />
      </div>

      {/* Global summary */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Couverture globale (DXG + DTU)
          </p>
          <p className="text-[26px] font-bold text-slate-800 mt-0.5">
            {totalPct}<span className="text-[16px] font-medium text-slate-500 ml-1">%</span>
          </p>
          <p className="text-[11px] text-slate-400">{totalVma} VMA réalisés sur {totalEff} agents</p>
        </div>
        <div className="w-52 h-28">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v) => [`${v}%`]} />
              <Bar dataKey="couverture" fill={C.blue} radius={[4,4,0,0]} name="Couverture" />
              <Bar dataKey="objectif" fill="#e2e8f0" radius={[4,4,0,0]} name="Objectif" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   OBJECTIVE 2 — Inspections d'hygiène
═══════════════════════════════════════════════════════════════════════════ */
type Task = { id: number; label: string; done: boolean };

const INIT_TASKS: Task[] = [
  { id: 1, label: "Planification des visites d'inspection (calendrier annuel)", done: false },
  { id: 2, label: "Inspection DXG — CD Laayoune (rapport rédigé)", done: false },
  { id: 3, label: "Inspection DXG — Tan-Tan (rapport rédigé)", done: false },
  { id: 4, label: "Inspection DXG — Dakhla (rapport rédigé)", done: false },
  { id: 5, label: "Inspection DXG — Boujdour (rapport rédigé)", done: false },
  { id: 6, label: "Inspection DXG — Tarfaya (rapport rédigé)", done: false },
  { id: 7, label: "Inspection DXG — Smara (rapport rédigé)", done: false },
  { id: 8, label: "Inspection DTU — DIV Laayoune (rapport rédigé)", done: false },
  { id: 9, label: "Inspection DTU — DIV Dakhla (rapport rédigé)", done: false },
  { id: 10, label: "Suivi des recommandations (plan d'action)", done: false },
  { id: 11, label: "Rapport de synthèse annuel transmis à la direction", done: false },
];

function Obj2() {
  const [tasks, setTasks] = useState<Task[]>(INIT_TASKS);
  const toggle = (id: number) =>
    setTasks(t => t.map(x => x.id === id ? { ...x, done: !x.done } : x));
  const done = tasks.filter(t => t.done).length;
  const pct  = Math.round((done / tasks.length) * 100);

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[13px] text-slate-500">{done}/{tasks.length} tâches complétées</p>
        <span className="text-[13px] font-bold text-teal-600">{pct}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-teal-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-1.5 mt-4">
        {tasks.map(task => (
          <button
            key={task.id}
            onClick={() => toggle(task.id)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors hover:bg-slate-50"
          >
            {task.done
              ? <CheckCircle2 className="w-4.5 h-4.5 text-teal-500 shrink-0" />
              : <Circle className="w-4.5 h-4.5 text-slate-300 shrink-0" />
            }
            <span className={`text-[13px] transition-colors ${task.done ? "line-through text-slate-400" : "text-slate-700"}`}>
              {task.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   OBJECTIVE 3 — Analyse statistique RM (5 ans)
═══════════════════════════════════════════════════════════════════════════ */
type RMRow = {
  annee: number; motif: string; nature: string; genre: string;
  groupe_age: string; poste: string; risque: string;
};

const SAMPLE_DATA: RMRow[] = [
  ...Array.from({ length: 40 }, (_, i) => ({
    annee: 2020 + Math.floor(i / 8),
    motif: i % 3 === 0 ? "Technique" : "Médical",
    nature: i % 4 === 0 ? "Définitive" : "Temporaire",
    genre: i % 3 === 0 ? "F" : "M",
    groupe_age: ["20-30", "31-40", "41-50", "51+"][i % 4],
    poste: ["Opérateur", "Technicien", "Cadre", "Agent de maitrise"][i % 4],
    risque: i % 5 === 0 ? "Sédentaire" : "Actif",
  })),
];

function groupBy<T>(arr: T[], key: keyof T): Record<string, number> {
  return arr.reduce((acc, row) => {
    const k = String(row[key]);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

function toChartArr(obj: Record<string, number>, nameKey = "name") {
  return Object.entries(obj).map(([k, v]) => ({ [nameKey]: k, count: v }));
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-slate-200 rounded-xl p-4 space-y-3">
      <p className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide">{title}</p>
      {children}
    </div>
  );
}

function Obj3() {
  const [data, setData]       = useState<RMRow[]>([]);
  const [loaded, setLoaded]   = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb  = XLSX.read(e.target?.result, { type: "array" });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
        const rows: RMRow[] = raw.map(r => ({
          annee:      Number(r["annee"] || r["Annee"] || r["ANNEE"] || 0),
          motif:      String(r["motif"] || r["Motif"] || r["MOTIF"] || ""),
          nature:     String(r["nature"] || r["Nature"] || r["NATURE"] || ""),
          genre:      String(r["genre"] || r["Genre"] || r["GENRE"] || ""),
          groupe_age: String(r["groupe_age"] || r["Groupe_Age"] || r["Age"] || ""),
          poste:      String(r["poste"] || r["Poste"] || r["POSTE"] || ""),
          risque:     String(r["risque"] || r["Risque"] || r["RISQUE"] || ""),
        }));
        setData(rows);
        setLoaded(true);
      } catch {
        alert("Erreur de lecture du fichier. Vérifiez le format.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const useSample = () => { setData(SAMPLE_DATA); setLoaded(true); };

  const src = loaded ? data : [];

  /* Computed datasets */
  const byRisque   = toChartArr(groupBy(src, "risque"));
  const byAge      = toChartArr(groupBy(src, "groupe_age"));
  const byGenre    = toChartArr(groupBy(src, "genre"));
  const byPoste    = toChartArr(groupBy(src, "poste"));
  const byMotif    = toChartArr(groupBy(src, "motif"));
  const byNature   = toChartArr(groupBy(src, "nature"));

  /* 5-year trend by motif */
  const years = [2020, 2021, 2022, 2023, 2024];
  const trendData = years.map(yr => {
    const yr_rows = src.filter(r => r.annee === yr);
    return {
      annee: yr,
      Médical:   yr_rows.filter(r => r.motif === "Médical").length,
      Technique: yr_rows.filter(r => r.motif === "Technique").length,
    };
  });

  return (
    <div className="p-5 space-y-5">
      {/* Upload zone */}
      {!loaded ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 ${
            dragging ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
          }`}
        >
          <Upload className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-600 text-[14px] mb-1">
            Importer les données RM (5 ans)
          </p>
          <p className="text-[12px] text-slate-400 mb-4">
            Excel (.xlsx) ou CSV — colonnes: annee, motif, nature, genre, groupe_age, poste, risque
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="px-4 py-2 bg-indigo-600 text-white text-[13px] font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Choisir un fichier
            </button>
            <button
              onClick={useSample}
              className="px-4 py-2 bg-slate-100 text-slate-600 text-[13px] font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              Utiliser les données exemple
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={e => e.target.files?.[0] && parseFile(e.target.files[0])}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            <span className="text-[13px] font-medium text-indigo-700">
              {src.length} enregistrements chargés
            </span>
          </div>
          <button
            onClick={() => { setData([]); setLoaded(false); }}
            className="text-[11px] text-slate-500 hover:text-rose-500 flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Réinitialiser
          </button>
        </div>
      )}

      {/* Charts — visible once data loaded */}
      {loaded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <ChartCard title="RM par Risque (Actifs vs Sédentaires)">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byRisque}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="count" name="Nb RM" radius={[5,5,0,0]}>
                  {byRisque.map((_, i) => <Cell key={i} fill={C.CHART[i % C.CHART.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="RM par Tranche d'Âge">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byAge}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="count" name="Nb RM" fill={C.teal} radius={[5,5,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="RM par Genre">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={byGenre}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ name, percent }) => `${name === "M" ? "Hommes" : "Femmes"} ${(percent * 100).toFixed(0)}%`}
                >
                  {byGenre.map((_, i) => <Cell key={i} fill={C.CHART[i % C.CHART.length]} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n === "M" ? "Hommes" : "Femmes"]} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="RM par Poste">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byPoste} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip />
                <Bar dataKey="count" name="Nb RM" fill={C.indigo} radius={[0,5,5,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="RM par Motif (Médical vs Technique)">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={byMotif} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {byMotif.map((_, i) => <Cell key={i} fill={i === 0 ? C.blue : C.amber} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="RM par Nature (Définitive vs Temporaire)">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={byNature} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name.substring(0,3)} ${(percent * 100).toFixed(0)}%`}>
                  {byNature.map((_, i) => <Cell key={i} fill={i === 0 ? C.rose : C.green} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Full-width: 5-year trend */}
          <div className="md:col-span-2">
            <ChartCard title="Évolution sur 5 ans — RM par Motif (Médical / Technique)">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="annee" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Médical"   stroke={C.blue}  strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Technique" stroke={C.amber} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   OBJECTIVE 4 — Fiche d'entreprise
═══════════════════════════════════════════════════════════════════════════ */
const SITES: { dir: string; sites: string[] }[] = [
  { dir: "DXG", sites: ["CD Laayoune", "Tan-Tan", "Dakhla", "Boujdour", "Tarfaya", "Smara"] },
  { dir: "DTU", sites: ["DIV Laayoune", "DIV Dakhla"] },
];

type UploadedDoc = { name: string; size: number; date: string };

function DocSlot({ site }: { site: string }) {
  const [doc, setDoc] = useState<UploadedDoc | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setDoc({ name: file.name, size: file.size, date: new Date().toLocaleDateString("fr-FR") });
  };

  const formatSize = (bytes: number) => {
    if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} Mo`;
    return `${(bytes / 1_000).toFixed(0)} Ko`;
  };

  return (
    <div
      className={`border rounded-xl p-4 transition-all duration-200 ${
        doc ? "border-green-200 bg-green-50" : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-slate-700">{site}</p>
          {doc ? (
            <div className="mt-1">
              <div className="flex items-center gap-1.5 text-green-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium">{doc.name}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">{formatSize(doc.size)} — {doc.date}</p>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Aucun document déposé
            </p>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => ref.current?.click()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
              doc
                ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            <Upload className="w-3 h-3" />
            {doc ? "Remplacer" : "Déposer"}
          </button>
          {doc && (
            <button
              onClick={() => setDoc(null)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <input
        ref={ref}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );
}

function Obj4() {
  return (
    <div className="p-5 space-y-6">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
        <FileText className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-[12px] text-amber-700">
          Formats acceptés&nbsp;: Word (.docx) et PDF (.pdf) — un document par site
        </p>
      </div>

      {SITES.map(({ dir, sites }) => (
        <div key={dir}>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-2">{dir}</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sites.map(site => <DocSlot key={site} site={site} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
const OBJECTIVES = [
  {
    n: 1, color: C.blue, icon: Target,
    title: "Couverture médicale totale (VMA/VMS)",
    subtitle: "Calcul du taux de couverture VMA pour les agents Production & Transport",
    Body: Obj1,
  },
  {
    n: 2, color: C.teal, icon: ShieldCheck,
    title: "Inspections d'hygiène, rapports et suivi",
    subtitle: "Suivi de l'avancement des inspections et des rapports par site",
    Body: Obj2,
  },
  {
    n: 3, color: C.indigo, icon: TrendingUp,
    title: "Étude des restrictions médicales (RM) — 5 ans",
    subtitle: "Analyse statistique avancée des RM par risque, âge, genre, poste et motif",
    Body: Obj3,
  },
  {
    n: 4, color: C.amber, icon: Building2,
    title: "Actualisation de la fiche d'entreprise",
    subtitle: "Dépôt et gestion des fiches d'entreprise par direction et site",
    Body: Obj4,
  },
];

export default function EvaluationObjectifs() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="min-h-full bg-slate-50 p-6 space-y-4">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-slate-800">Évaluation des Objectifs</h1>
        <p className="text-[13px] text-slate-500 mt-1">
          Suivi des objectifs annuels — Médecine du Travail
        </p>
      </div>

      {/* Progress summary bar */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {OBJECTIVES.map(obj => (
          <button
            key={obj.n}
            onClick={() => setOpenIdx(openIdx === obj.n - 1 ? null : obj.n - 1)}
            className={`p-3 rounded-xl border text-left transition-all duration-150 ${
              openIdx === obj.n - 1
                ? "border-transparent shadow-md"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
            style={openIdx === obj.n - 1 ? { backgroundColor: `${obj.color}12`, borderColor: obj.color } : {}}
          >
            <div className="flex items-center gap-2 mb-1">
              <obj.icon className="w-4 h-4" style={{ color: obj.color }} />
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: obj.color }}>
                Obj. {obj.n}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium leading-snug line-clamp-2">{obj.title}</p>
          </button>
        ))}
      </div>

      {/* Accordion objectives */}
      <div className="space-y-3">
        {OBJECTIVES.map((obj, idx) => (
          <Card key={obj.n}>
            <ObjectiveHeader
              n={obj.n}
              color={obj.color}
              icon={obj.icon}
              title={obj.title}
              subtitle={obj.subtitle}
              open={openIdx === idx}
              toggle={() => setOpenIdx(openIdx === idx ? null : idx)}
            />
            {openIdx === idx && (
              <div className="border-t border-slate-100">
                <obj.Body />
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
