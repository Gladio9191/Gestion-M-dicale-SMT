import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar,
} from "recharts";
import {
  Target, ShieldCheck, TrendingUp, Building2, Upload, CheckCircle2,
  Circle, FileText, Trash2, AlertCircle, ChevronDown, ArrowUpRight,
} from "lucide-react";

/* ── Colors ─────────────────────────────────────────────────────────── */
const C = {
  blue:   "#2563EB", teal: "#059669", amber: "#D97706",
  rose:   "#DC2626", indigo: "#7C3AED", cyan: "#0891B2",
  CHART:  ["#2563EB","#059669","#D97706","#DC2626","#7C3AED","#0891B2"],
};

const OBJ_CFG = [
  { n:1, color: C.blue,   bg:"#EFF6FF", icon: Target,      title:"Couverture médicale totale (VMA/VMS)", sub:"Calcul du taux de couverture VMA — Production & Transport" },
  { n:2, color: C.teal,   bg:"#ECFDF5", icon: ShieldCheck, title:"Inspections d'hygiène, rapports et suivi", sub:"Avancement des inspections par site et direction" },
  { n:3, color: C.indigo, bg:"#F5F3FF", icon: TrendingUp,  title:"Étude des restrictions médicales — 5 ans", sub:"Analyse statistique avancée RM par risque, âge, genre, poste" },
  { n:4, color: C.amber,  bg:"#FFFBEB", icon: Building2,   title:"Actualisation de la fiche d'entreprise", sub:"Gestion documentaire par direction et site" },
];

/* ── Semi-circular gauge ────────────────────────────────────────────── */
function SemiGauge({ pct, color, label }: { pct: number; color: string; label: string }) {
  const data = [{ value: pct, fill: color }];
  const grade =
    pct >= 90 ? { txt: "Excellent", c: "#059669" } :
    pct >= 70 ? { txt: "Satisfaisant", c: "#D97706" } :
    { txt: "Insuffisant", c: "#DC2626" };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-24">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%" cy="85%"
            innerRadius="70%" outerRadius="100%"
            startAngle={180} endAngle={0}
            data={data}
            barSize={14}
          >
            <RadialBar background={{ fill: "#F1F5F9" }} dataKey="value" cornerRadius={7} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="text-[26px] font-extrabold leading-none" style={{ color }}>{pct}<span className="text-[14px]">%</span></span>
        </div>
      </div>
      <p className="text-[13px] font-semibold text-slate-700 mt-1">{label}</p>
      <span className="mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${grade.c}15`, color: grade.c }}>
        {grade.txt}
      </span>
    </div>
  );
}

/* ── Objective 1 — Couverture ────────────────────────────────────────── */
type UnitData = { effectif: string; vma: string };

function CoverageInput({ label, data, onChange, color }: {
  label: string; data: UnitData; onChange: (d: UnitData) => void; color: string;
}) {
  const eff = parseInt(data.effectif) || 0;
  const vma = parseInt(data.vma) || 0;
  const pct = eff > 0 ? Math.min(100, Math.round((vma / eff) * 100)) : 0;

  return (
    <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-white">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700">{label}</h3>
        <span className="text-[11px] font-bold px-2 py-1 rounded-full" style={{ backgroundColor: `${color}15`, color }}>
          {pct}% couvert
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(["effectif","vma"] as const).map(k => (
          <div key={k}>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
              {k === "effectif" ? "Effectif Total" : "VMA réalisés"}
            </label>
            <input
              type="number" min={0} placeholder="0"
              value={data[k]}
              onChange={e => onChange({ ...data, [k]: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
        ))}
      </div>
      <div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width:`${pct}%`, backgroundColor: color }} />
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5">{vma} / {eff} agents couverts</p>
      </div>
    </div>
  );
}

function Obj1() {
  const [dxg, setDxg] = useState<UnitData>({ effectif: "", vma: "" });
  const [dtu, setDtu] = useState<UnitData>({ effectif: "", vma: "" });

  const calc = (d: UnitData) => {
    const e = parseInt(d.effectif) || 0;
    const v = parseInt(d.vma) || 0;
    return e > 0 ? Math.min(100, Math.round((v / e) * 100)) : 0;
  };
  const pctDxg = calc(dxg);
  const pctDtu = calc(dtu);
  const totalEff = (parseInt(dxg.effectif)||0) + (parseInt(dtu.effectif)||0);
  const totalVma = (parseInt(dxg.vma)||0) + (parseInt(dtu.vma)||0);
  const totalPct = totalEff > 0 ? Math.round((totalVma/totalEff)*100) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Semi-circular gauges */}
      <div className="flex justify-around items-start py-4 bg-slate-50 rounded-2xl">
        <SemiGauge pct={pctDxg} color={C.blue}  label="Direction DXG" />
        <div className="w-px bg-slate-200 self-stretch mx-4" />
        <SemiGauge pct={totalPct} color={C.indigo} label="Global" />
        <div className="w-px bg-slate-200 self-stretch mx-4" />
        <SemiGauge pct={pctDtu} color={C.teal}  label="Direction DTU" />
      </div>

      {/* Input cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CoverageInput label="Direction DXG" data={dxg} onChange={setDxg} color={C.blue} />
        <CoverageInput label="Direction DTU" data={dtu} onChange={setDtu} color={C.teal} />
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between px-5 py-4 bg-blue-600 text-white rounded-2xl">
        <div>
          <p className="text-[11px] font-semibold opacity-70 uppercase tracking-wider">Couverture globale</p>
          <p className="text-[32px] font-extrabold leading-none mt-0.5">{totalPct}<span className="text-[18px] font-medium opacity-80 ml-1">%</span></p>
          <p className="text-[11px] opacity-60 mt-1">{totalVma} VMA sur {totalEff} agents</p>
        </div>
        <div className="flex items-center gap-1 text-[14px] font-semibold bg-white/20 px-3 py-2 rounded-xl">
          <ArrowUpRight className="w-4 h-4" /> Objectif: 100%
        </div>
      </div>
    </div>
  );
}

/* ── Objective 2 — Hygiene checklist ────────────────────────────────── */
const INIT_TASKS = [
  "Planification des visites d'inspection (calendrier annuel)",
  "Inspection DXG — CD Laayoune (rapport rédigé)",
  "Inspection DXG — Tan-Tan (rapport rédigé)",
  "Inspection DXG — Dakhla (rapport rédigé)",
  "Inspection DXG — Boujdour (rapport rédigé)",
  "Inspection DXG — Tarfaya (rapport rédigé)",
  "Inspection DXG — Smara (rapport rédigé)",
  "Inspection DTU — DIV Laayoune (rapport rédigé)",
  "Inspection DTU — DIV Dakhla (rapport rédigé)",
  "Suivi des recommandations (plan d'action)",
  "Rapport de synthèse annuel transmis à la direction",
].map((label, id) => ({ id, label, done: false }));

function Obj2() {
  const [tasks, setTasks] = useState(INIT_TASKS);
  const toggle = (id: number) => setTasks(t => t.map(x => x.id === id ? { ...x, done: !x.done } : x));
  const done = tasks.filter(t => t.done).length;
  const pct  = Math.round((done / tasks.length) * 100);

  return (
    <div className="p-6 space-y-5">
      {/* Progress gauge */}
      <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-5">
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Progression</p>
          <p className="text-[36px] font-extrabold text-teal-600 leading-none mt-0.5">{pct}<span className="text-[18px] font-medium text-teal-400 ml-1">%</span></p>
          <p className="text-[12px] text-slate-500 mt-1">{done} / {tasks.length} tâches terminées</p>
        </div>
        <div className="w-32 h-20">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart cx="50%" cy="80%" innerRadius="65%" outerRadius="100%" startAngle={180} endAngle={0} data={[{ value: pct, fill: C.teal }]} barSize={10}>
              <RadialBar background={{ fill: "#E2E8F0" }} dataKey="value" cornerRadius={5} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-teal-500 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="space-y-1">
        {tasks.map(task => (
          <button key={task.id} onClick={() => toggle(task.id)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-slate-50 transition-colors group"
          >
            {task.done
              ? <CheckCircle2 className="w-4.5 h-4.5 text-teal-500 shrink-0" />
              : <Circle className="w-4.5 h-4.5 text-slate-300 shrink-0 group-hover:text-slate-400" />
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

/* ── Objective 3 — RM Statistics ────────────────────────────────────── */
type RMRow = { annee: number; motif: string; nature: string; genre: string; groupe_age: string; poste: string; risque: string };

const SAMPLE: RMRow[] = Array.from({ length: 40 }, (_, i) => ({
  annee: 2020 + Math.floor(i / 8),
  motif: i % 3 === 0 ? "Technique" : "Médical",
  nature: i % 4 === 0 ? "Définitive" : "Temporaire",
  genre: i % 3 === 0 ? "F" : "M",
  groupe_age: ["20-30","31-40","41-50","51+"][i % 4],
  poste: ["Opérateur","Technicien","Cadre","Agent de maîtrise"][i % 4],
  risque: i % 5 === 0 ? "Sédentaire" : "Actif",
}));

function groupBy<T>(arr: T[], key: keyof T) {
  return Object.entries(arr.reduce((a, r) => { const k=String(r[key]); a[k]=(a[k]||0)+1; return a; }, {} as Record<string,number>))
    .map(([name, count]) => ({ name, count }));
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5">
      <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-3">{title}</p>
      {children}
    </div>
  );
}

function Obj3() {
  const [data, setData]     = useState<RMRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [drag, setDrag]     = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const parse = useCallback((file: File) => {
    const r = new FileReader();
    r.onload = e => {
      try {
        const wb  = XLSX.read(e.target?.result, { type:"array" });
        const raw = XLSX.utils.sheet_to_json<Record<string,unknown>>(wb.Sheets[wb.SheetNames[0]]);
        setData(raw.map(r => ({
          annee: Number(r.annee||r.Annee||0),
          motif: String(r.motif||r.Motif||""),
          nature: String(r.nature||r.Nature||""),
          genre: String(r.genre||r.Genre||""),
          groupe_age: String(r.groupe_age||r.Age||""),
          poste: String(r.poste||r.Poste||""),
          risque: String(r.risque||r.Risque||""),
        })));
        setLoaded(true);
      } catch { alert("Erreur de lecture du fichier."); }
    };
    r.readAsArrayBuffer(file);
  }, []);

  const src = loaded ? data : [];
  const years = [2020,2021,2022,2023,2024];
  const trendData = years.map(yr => ({
    annee: yr,
    Médical:   src.filter(r=>r.annee===yr&&r.motif==="Médical").length,
    Technique: src.filter(r=>r.annee===yr&&r.motif==="Technique").length,
  }));

  return (
    <div className="p-6 space-y-5">
      {!loaded ? (
        <div
          onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
          onDrop={e=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files[0];if(f)parse(f);}}
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 ${drag?"border-indigo-400 bg-indigo-50":"border-slate-200 hover:border-indigo-300"}`}
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
            <Upload className="w-6 h-6 text-indigo-400" />
          </div>
          <p className="font-semibold text-slate-700 mb-1">Importer les données RM (5 ans)</p>
          <p className="text-[12px] text-slate-400 mb-5">Excel (.xlsx) ou CSV — colonnes: annee, motif, nature, genre, groupe_age, poste, risque</p>
          <div className="flex justify-center gap-3">
            <button onClick={()=>ref.current?.click()} className="px-5 py-2.5 bg-indigo-600 text-white text-[13px] font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
              Choisir un fichier
            </button>
            <button onClick={()=>{setData(SAMPLE);setLoaded(true);}} className="px-5 py-2.5 bg-slate-100 text-slate-600 text-[13px] font-semibold rounded-xl hover:bg-slate-200 transition-colors">
              Données exemple
            </button>
          </div>
          <input ref={ref} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e=>e.target.files?.[0]&&parse(e.target.files[0])} />
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            <span className="text-[13px] font-semibold text-indigo-700">{src.length} enregistrements chargés</span>
          </div>
          <button onClick={()=>{setData([]);setLoaded(false);}} className="text-[11px] text-slate-500 hover:text-rose-500 flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Réinitialiser
          </button>
        </div>
      )}

      {loaded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="RM par Risque">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={groupBy(src,"risque")} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize:11}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize:10}} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="count" name="Nb RM" radius={[8,8,0,0]}>
                  {groupBy(src,"risque").map((_,i) => <Cell key={i} fill={C.CHART[i%C.CHART.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="RM par Tranche d'Âge">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={groupBy(src,"groupe_age")} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize:11}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize:10}} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="count" name="Nb RM" fill={C.teal} radius={[8,8,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="RM par Genre">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={groupBy(src,"genre")} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={75} paddingAngle={4} strokeWidth={0}
                  label={({name,percent})=>`${name==="M"?"Hommes":"Femmes"} ${(percent*100).toFixed(0)}%`}
                >
                  {groupBy(src,"genre").map((_,i)=><Cell key={i} fill={C.CHART[i%C.CHART.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="RM par Poste">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={groupBy(src,"poste")} layout="vertical" barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" tick={{fontSize:10}} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{fontSize:11}} axisLine={false} tickLine={false} width={100} />
                <Tooltip />
                <Bar dataKey="count" name="Nb RM" fill={C.indigo} radius={[0,8,8,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="RM par Motif (Médical vs Technique)">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={groupBy(src,"motif")} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={4} strokeWidth={0}
                  label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}
                >
                  {groupBy(src,"motif").map((_,i)=><Cell key={i} fill={i===0?C.blue:C.amber} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="RM par Nature (Définitive vs Temporaire)">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={groupBy(src,"nature")} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={4} strokeWidth={0}
                  label={({name,percent})=>`${name.slice(0,3)} ${(percent*100).toFixed(0)}%`}
                >
                  {groupBy(src,"nature").map((_,i)=><Cell key={i} fill={i===0?C.rose:C.teal} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="md:col-span-2">
            <ChartCard title="Évolution 5 ans — RM par Motif">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="annee" tick={{fontSize:11}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize:10}} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Médical"   stroke={C.blue}   strokeWidth={2.5} dot={{r:4,fill:C.blue}} activeDot={{r:6}} />
                  <Line type="monotone" dataKey="Technique" stroke={C.amber}  strokeWidth={2.5} dot={{r:4,fill:C.amber}} activeDot={{r:6}} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Objective 4 — Document management ──────────────────────────────── */
const SITES = [
  { dir:"DXG", color: C.blue,  sites:["CD Laayoune","Tan-Tan","Dakhla","Boujdour","Tarfaya","Smara"] },
  { dir:"DTU", color: C.teal,  sites:["DIV Laayoune","DIV Dakhla"] },
];

function DocSlot({ site, color }: { site: string; color: string }) {
  const [doc, setDoc] = useState<{name:string;size:number;date:string}|null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const fmt = (b:number) => b>1e6?`${(b/1e6).toFixed(1)} Mo`:`${(b/1e3).toFixed(0)} Ko`;
  return (
    <div className={`border rounded-2xl p-4 transition-all duration-200 ${doc?"border-emerald-200 bg-emerald-50":"border-slate-200 bg-white hover:border-slate-300"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-slate-700">{site}</p>
          {doc ? (
            <div className="mt-1">
              <div className="flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium truncate">{doc.name}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">{fmt(doc.size)} — {doc.date}</p>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Aucun document
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={()=>ref.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors"
            style={doc ? {backgroundColor:"#F1F5F9",color:"#64748B"} : {backgroundColor:color,color:"#fff"}}
          >
            <Upload className="w-3 h-3" />{doc?"Remplacer":"Déposer"}
          </button>
          {doc && (
            <button onClick={()=>setDoc(null)} className="px-2.5 py-1.5 rounded-xl text-[11px] bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      <input ref={ref} type="file" accept=".pdf,.doc,.docx" className="hidden"
        onChange={e=>{ const f=e.target.files?.[0]; if(f) setDoc({name:f.name,size:f.size,date:new Date().toLocaleDateString("fr-FR")}); }} />
    </div>
  );
}

function Obj4() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
        <FileText className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-[12px] text-amber-700">Formats acceptés : Word (.docx) et PDF — un document par site</p>
      </div>
      {SITES.map(({ dir, sites, color }) => (
        <div key={dir}>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full" style={{backgroundColor:`${color}15`,color}}>
              {dir}
            </span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sites.map(s => <DocSlot key={s} site={s} color={color} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────── */
const BODIES = [Obj1, Obj2, Obj3, Obj4];

export default function EvaluationObjectifs() {
  const [open, setOpen] = useState<number>(0);

  return (
    <div className="min-h-full bg-[#F8FAFC] p-6 space-y-4">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-[22px] font-bold text-slate-800 tracking-tight">Évaluation des Objectifs</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Suivi des objectifs annuels — Médecine du Travail</p>
      </div>

      {/* Quick-nav cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {OBJ_CFG.map((o, idx) => (
          <button key={o.n} onClick={() => setOpen(idx)}
            className={`p-4 rounded-2xl border text-left transition-all duration-200 ${
              open === idx ? "shadow-md border-transparent" : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
            }`}
            style={open===idx?{backgroundColor:o.bg,borderColor:o.color}:{}}
          >
            <div className="flex items-center gap-2 mb-2">
              <o.icon className="w-4 h-4" style={{ color: o.color }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: o.color }}>Obj. {o.n}</span>
            </div>
            <p className="text-[12px] font-semibold text-slate-700 line-clamp-2 leading-snug">{o.title}</p>
          </button>
        ))}
      </div>

      {/* Accordion */}
      <div className="space-y-3">
        {OBJ_CFG.map((o, idx) => {
          const Body = BODIES[idx];
          const isOpen = open === idx;
          return (
            <div key={o.n} className={`bg-white rounded-2xl card-shadow overflow-hidden border transition-all duration-200 ${isOpen?"border-slate-200":"border-transparent"}`}>
              <button onClick={() => setOpen(isOpen ? -1 : idx)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: o.bg }}>
                  <o.icon className="w-5 h-5" style={{ color: o.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: o.color }}>
                      {o.n}
                    </span>
                    <span className="font-semibold text-slate-800 text-[14px]">{o.title}</span>
                  </div>
                  <p className="text-[12px] text-slate-400 ml-7">{o.sub}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen?"rotate-180":""}`} />
              </button>
              {isOpen && <div className="border-t border-slate-100"><Body /></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
