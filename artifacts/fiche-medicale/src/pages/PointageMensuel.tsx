import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, ChevronRight, Zap, Trash2, Pencil,
  Check, X, Download, User, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES & CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api  = (path: string) => `${BASE}${path}`;

type PointageRow = {
  id: number; date: string; heureEntree: string;
  heureSortie: string; observations: string | null; createdAt: string;
};
type AgentInfo = {
  nom: string; prenom: string; matricule: string;
  grade: string; direction: string; service: string;
};

const FR_DAYS   = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
const FR_MONTHS = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */
const toYM  = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
const isWE  = (s: string) => { const d = new Date(s+"T12:00:00"); return d.getDay()===0||d.getDay()===6; };
const dayOf = (s: string) => new Date(s+"T12:00:00").getDay();

function daysOfMonth(ym: string): string[] {
  const [y,m] = ym.split("-").map(Number);
  const days: string[] = [];
  const d = new Date(y, m-1, 1);
  while (d.getMonth()===m-1) {
    days.push(`${y}-${String(m).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);
    d.setDate(d.getDate()+1);
  }
  return days;
}

function calcDuree(e: string, s: string): string {
  const p = (t: string) => { const [h,m]=t.split(":").map(Number); return h*60+m; };
  const diff = p(s)-p(e);
  if (diff<=0||isNaN(diff)) return "—";
  return `${Math.floor(diff/60)}h${String(diff%60).padStart(2,"0")}`;
}

function minutesFromTime(t: string): number {
  const [h,m]=t.split(":").map(Number); return h*60+m;
}

function totalMinutes(rows: PointageRow[]): number {
  return rows.reduce((acc,r)=>{
    const d = minutesFromTime(r.heureSortie)-minutesFromTime(r.heureEntree);
    return acc+(d>0?d:0);
  },0);
}

function formatMinutes(min: number): string {
  const h=Math.floor(min/60), m=min%60;
  return `${h}h${String(m).padStart(2,"0")}`;
}

function fmtDate(s: string): string {
  const d = new Date(s+"T12:00:00");
  return d.toLocaleDateString("fr-MA",{day:"2-digit",month:"2-digit",year:"numeric"});
}

const EMPTY_AGENT: AgentInfo = {
  nom:"", prenom:"", matricule:"", grade:"", direction:"", service:""
};

const LS_KEY = "pointage_agent_info";

/* ═══════════════════════════════════════════════════════════════════════════
   EXCEL EXPORT — Feuille de Pointage style Maroc
═══════════════════════════════════════════════════════════════════════════ */
function exportExcel(
  ym: string,
  rows: PointageRow[],
  agent: AgentInfo,
  allDays: string[]
) {
  const [y, mN] = ym.split("-").map(Number);
  const monthName = `${FR_MONTHS[mN-1]} ${y}`;
  const rowMap = new Map(rows.map(r => [r.date, r]));

  const wb = XLSX.utils.book_new();

  /* ── Build sheet data ── */
  const sheetData: (string|number)[][] = [];

  // Titre
  sheetData.push(["FEUILLE DE POINTAGE"]);
  sheetData.push([""]);

  // Infos agent
  sheetData.push(["Nom & Prénom :", `${agent.prenom} ${agent.nom}`, "", "Matricule :", agent.matricule]);
  sheetData.push(["Grade :", agent.grade, "", "Direction :", agent.direction]);
  sheetData.push(["Service :", agent.service, "", "Mois :", monthName]);
  sheetData.push([""]);

  // En-tête tableau
  sheetData.push(["N°","Date","Jour","Heure d'Entrée","Heure de Sortie","Durée","Observations"]);

  // Lignes
  let dayNum = 0;
  for (const date of allDays) {
    const we   = isWE(date);
    const dIdx = dayOf(date);
    const r    = rowMap.get(date);

    if (!we) dayNum++;

    sheetData.push([
      we ? "" : dayNum,
      fmtDate(date),
      FR_DAYS[dIdx],
      r ? r.heureEntree : (we ? "" : ""),
      r ? r.heureSortie : (we ? "" : ""),
      r ? calcDuree(r.heureEntree, r.heureSortie) : "",
      r?.observations ?? "",
    ]);
  }

  // Total
  sheetData.push([""]);
  const totalMin = totalMinutes(rows);
  sheetData.push(["","","","","Total Heures :", formatMinutes(totalMin),""]);
  sheetData.push([""]);

  // Signatures
  sheetData.push(["","","","Signature de l'Agent","","Visa du Chef de Service",""]);
  sheetData.push([""]);
  sheetData.push(["","","","________________","","________________",""]);

  /* ── Create worksheet ── */
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  /* ── Column widths ── */
  ws["!cols"] = [
    {wch:6},{wch:14},{wch:8},{wch:16},{wch:16},{wch:12},{wch:28}
  ];

  /* ── Merge title row ── */
  ws["!merges"] = [
    {s:{r:0,c:0},e:{r:0,c:6}}, // Title
    {s:{r:2,c:1},e:{r:2,c:2}}, // Nom value
    {s:{r:3,c:1},e:{r:3,c:2}}, // Grade value
    {s:{r:4,c:1},e:{r:4,c:2}}, // Service value
  ];

  XLSX.utils.book_append_sheet(wb, ws, monthName);
  XLSX.writeFile(wb, `Pointage_${ym}_${agent.nom||"agent"}.xlsx`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function PointageMensuel() {
  const qc      = useQueryClient();
  const { toast } = useToast();

  const [currentYM, setCurrentYM] = useState(() => toYM(new Date()));
  const [editingId, setEditingId]  = useState<number|null>(null);
  const [editForm, setEditForm]    = useState({heureEntree:"08:00",heureSortie:"16:30",observations:""});
  const [addingDate, setAddingDate] = useState<string|null>(null);
  const [addForm, setAddForm]      = useState({heureEntree:"08:00",heureSortie:"16:30",observations:""});

  /* Agent info — localStorage */
  const [agentInfo, setAgentInfo] = useState<AgentInfo>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "{}"); }
    catch { return EMPTY_AGENT; }
  });
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [agentDraft, setAgentDraft] = useState<AgentInfo>(agentInfo);

  const saveAgent = () => {
    setAgentInfo(agentDraft);
    localStorage.setItem(LS_KEY, JSON.stringify(agentDraft));
    setShowAgentForm(false);
    toast({ title: "Informations enregistrées" });
  };

  /* ── Data ── */
  const qKey = ["pointage", currentYM];
  const { data: rows = [], isLoading } = useQuery<PointageRow[]>({
    queryKey: qKey,
    queryFn: () => fetch(api(`/api/pointage?mois=${currentYM}`)).then(r => r.json()),
  });

  const rowMap  = useMemo(() => new Map(rows.map(r => [r.date, r])), [rows]);
  const allDays = useMemo(() => daysOfMonth(currentYM), [currentYM]);
  const invalidate = useCallback(() => qc.invalidateQueries({queryKey:qKey}), [qKey]);

  /* ── Mutations ── */
  const createMut = useMutation({
    mutationFn: (body: object) =>
      fetch(api("/api/pointage"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).then(r=>r.json()),
    onSuccess: () => { invalidate(); setAddingDate(null); toast({title:"Pointage ajouté"}); },
    onError: () => toast({title:"Erreur",variant:"destructive"}),
  });

  const updateMut = useMutation({
    mutationFn: ({id,...body}:{id:number}&object) =>
      fetch(api(`/api/pointage/${id}`),{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).then(r=>r.json()),
    onSuccess: () => { invalidate(); setEditingId(null); toast({title:"Mis à jour"}); },
    onError: () => toast({title:"Erreur",variant:"destructive"}),
  });

  const deleteMut = useMutation({
    mutationFn: (id:number) => fetch(api(`/api/pointage/${id}`),{method:"DELETE"}),
    onSuccess: () => { invalidate(); toast({title:"Supprimé"}); },
    onError: () => toast({title:"Erreur",variant:"destructive"}),
  });

  const generateMut = useMutation({
    mutationFn: () =>
      fetch(api("/api/pointage/generate"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mois:currentYM})}).then(r=>r.json()),
    onSuccess: (d) => { invalidate(); toast({title:`${d.created} jour(s) généré(s)`}); },
    onError: () => toast({title:"Erreur",variant:"destructive"}),
  });

  /* ── Month nav ── */
  const prevMonth = () => { const [y,m]=currentYM.split("-").map(Number); setCurrentYM(toYM(new Date(y,m-2,1))); };
  const nextMonth = () => { const [y,m]=currentYM.split("-").map(Number); setCurrentYM(toYM(new Date(y,m,1))); };

  const [y, mN] = currentYM.split("-").map(Number);
  const monthLabel     = `${FR_MONTHS[mN-1]} ${y}`;
  const workDaysTotal  = allDays.filter(d=>!isWE(d)).length;
  const totalMin       = totalMinutes(rows);

  /* ── Start edit ── */
  const startEdit = (row: PointageRow) => {
    setEditingId(row.id);
    setEditForm({heureEntree:row.heureEntree,heureSortie:row.heureSortie,observations:row.observations??""});
    setAddingDate(null);
  };

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pointage Mensuel</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Entrée / Sortie — Service Médecine du Travail</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Month selector */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-xl px-3 py-2 shadow-sm">
            <button onClick={prevMonth} className="p-1 rounded hover:bg-muted"><ChevronLeft className="w-4 h-4"/></button>
            <span className="text-sm font-semibold min-w-[130px] text-center">{monthLabel}</span>
            <button onClick={nextMonth} className="p-1 rounded hover:bg-muted"><ChevronRight className="w-4 h-4"/></button>
          </div>
          {/* Export */}
          <Button
            size="sm"
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => exportExcel(currentYM, rows, agentInfo, allDays)}
          >
            <Download className="w-4 h-4"/>
            Excel
          </Button>
        </div>
      </div>

      {/* ── Agent info card ── */}
      <div className="mb-5 bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <button
          onClick={() => { setAgentDraft(agentInfo); setShowAgentForm(f=>!f); }}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600"/>
            <span className="text-sm font-semibold text-foreground">Informations de l'agent</span>
            {agentInfo.nom && (
              <span className="text-sm text-muted-foreground">
                — {agentInfo.prenom} {agentInfo.nom}
                {agentInfo.matricule && <span className="ml-2 font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{agentInfo.matricule}</span>}
              </span>
            )}
          </div>
          {showAgentForm ? <ChevronUp className="w-4 h-4 text-muted-foreground"/> : <ChevronDown className="w-4 h-4 text-muted-foreground"/>}
        </button>

        {showAgentForm && (
          <div className="px-5 pb-5 pt-2 border-t border-border bg-muted/10">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              {[
                {label:"Prénom",         key:"prenom"},
                {label:"Nom",            key:"nom"},
                {label:"Matricule",      key:"matricule"},
                {label:"Grade / Poste",  key:"grade"},
                {label:"Direction",      key:"direction"},
                {label:"Service",        key:"service"},
              ].map(({label,key}) => (
                <div key={key}>
                  <label className="text-xs text-muted-foreground">{label}</label>
                  <Input
                    value={agentDraft[key as keyof AgentInfo]}
                    onChange={e => setAgentDraft(d => ({...d, [key]:e.target.value}))}
                    placeholder={label}
                    className="h-8 text-sm mt-0.5"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveAgent} className="gap-1">
                <Check className="w-3.5 h-3.5"/> Enregistrer
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAgentForm(false)}>
                Annuler
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          {label:"Jours ouvrables", value:workDaysTotal,           sub:"dans le mois"},
          {label:"Jours pointés",   value:rows.length,             sub:"enregistrés"},
          {label:"Total heures",    value:formatMinutes(totalMin), sub:"travaillées"},
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs font-medium text-foreground/80 mt-0.5">{s.label}</p>
            <p className="text-[10px] text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Generate button ── */}
      <div className="flex justify-end mb-4">
        <Button
          variant="outline" size="sm"
          className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
          onClick={() => generateMut.mutate()}
          disabled={generateMut.isPending}
        >
          <Zap className="w-4 h-4"/>
          {generateMut.isPending ? "Génération…" : "Générer jours ouvrables"}
        </Button>
      </div>

      {/* ── Table ── */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-700 text-white">
                <th className="px-3 py-3 text-center text-xs font-semibold w-10 border border-slate-600">N°</th>
                <th className="px-3 py-3 text-left   text-xs font-semibold w-32 border border-slate-600">Date</th>
                <th className="px-3 py-3 text-center text-xs font-semibold w-14 border border-slate-600">Jour</th>
                <th className="px-3 py-3 text-center text-xs font-semibold w-28 border border-slate-600">Heure d'Entrée</th>
                <th className="px-3 py-3 text-center text-xs font-semibold w-28 border border-slate-600">Heure de Sortie</th>
                <th className="px-3 py-3 text-center text-xs font-semibold w-20 border border-slate-600">Durée</th>
                <th className="px-3 py-3 text-left   text-xs font-semibold      border border-slate-600">Observations</th>
                <th className="px-3 py-3 text-center text-xs font-semibold w-24 border border-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Chargement…</td></tr>
              ) : (() => {
                let dayNum = 0;
                return allDays.map((dateStr) => {
                  const row      = rowMap.get(dateStr);
                  const weekend  = isWE(dateStr);
                  const dIdx     = dayOf(dateStr);
                  const isEditing = row && editingId===row.id;
                  const isAdding  = addingDate===dateStr;
                  const isMonday  = dIdx===1;
                  if (!weekend) dayNum++;

                  return (
                    <tr
                      key={dateStr}
                      className={cn(
                        "border-b border-slate-200 transition-colors",
                        weekend ? "bg-slate-100 text-slate-400" : "hover:bg-blue-50/40",
                        isMonday && !weekend && "border-t-2 border-t-blue-300"
                      )}
                    >
                      {/* N° */}
                      <td className="px-3 py-2 text-center text-xs border border-slate-200 font-mono text-slate-500">
                        {weekend ? "" : dayNum}
                      </td>

                      {/* Date */}
                      <td className="px-3 py-2 text-xs border border-slate-200">
                        <span className="font-medium">{fmtDate(dateStr)}</span>
                        {weekend && <span className="ml-1.5 text-[9px] text-rose-400 font-bold uppercase">WE</span>}
                      </td>

                      {/* Jour */}
                      <td className={cn(
                        "px-3 py-2 text-center text-xs font-bold border border-slate-200",
                        dIdx===0||dIdx===6 ? "text-rose-400"
                          : dIdx===1 ? "text-blue-600"
                          : "text-slate-600"
                      )}>
                        {FR_DAYS[dIdx]}
                      </td>

                      {/* Entrée */}
                      <td className="px-2 py-1.5 text-center border border-slate-200 w-28">
                        {isEditing ? (
                          <Input type="time" value={editForm.heureEntree}
                            onChange={e=>setEditForm(f=>({...f,heureEntree:e.target.value}))}
                            className="w-full text-center text-sm h-7 px-1"/>
                        ) : isAdding ? (
                          <Input type="time" value={addForm.heureEntree}
                            onChange={e=>setAddForm(f=>({...f,heureEntree:e.target.value}))}
                            className="w-full text-center text-sm h-7 px-1"/>
                        ) : row ? (
                          <span className="font-mono text-sm text-emerald-700 font-bold">{row.heureEntree}</span>
                        ) : (
                          <span className="text-slate-300 text-xs">{weekend?"":"—"}</span>
                        )}
                      </td>

                      {/* Sortie */}
                      <td className="px-2 py-1.5 text-center border border-slate-200 w-28">
                        {isEditing ? (
                          <Input type="time" value={editForm.heureSortie}
                            onChange={e=>setEditForm(f=>({...f,heureSortie:e.target.value}))}
                            className="w-full text-center text-sm h-7 px-1"/>
                        ) : isAdding ? (
                          <Input type="time" value={addForm.heureSortie}
                            onChange={e=>setAddForm(f=>({...f,heureSortie:e.target.value}))}
                            className="w-full text-center text-sm h-7 px-1"/>
                        ) : row ? (
                          <span className="font-mono text-sm text-rose-700 font-bold">{row.heureSortie}</span>
                        ) : (
                          <span className="text-slate-300 text-xs">{weekend?"":"—"}</span>
                        )}
                      </td>

                      {/* Durée */}
                      <td className="px-2 py-1.5 text-center border border-slate-200">
                        {isEditing ? (
                          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {calcDuree(editForm.heureEntree,editForm.heureSortie)}
                          </span>
                        ) : isAdding ? (
                          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {calcDuree(addForm.heureEntree,addForm.heureSortie)}
                          </span>
                        ) : row ? (
                          <span className="text-xs font-bold font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {calcDuree(row.heureEntree,row.heureSortie)}
                          </span>
                        ) : <span/>}
                      </td>

                      {/* Observations */}
                      <td className="px-2 py-1.5 border border-slate-200">
                        {isEditing ? (
                          <Input value={editForm.observations}
                            onChange={e=>setEditForm(f=>({...f,observations:e.target.value}))}
                            placeholder="Remarque…" className="text-xs h-7"/>
                        ) : isAdding ? (
                          <Input value={addForm.observations}
                            onChange={e=>setAddForm(f=>({...f,observations:e.target.value}))}
                            placeholder="Remarque…" className="text-xs h-7"/>
                        ) : (
                          <span className="text-xs text-slate-600">{row?.observations??""}</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-2 py-1.5 text-center border border-slate-200">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={()=>updateMut.mutate({id:row.id,...editForm})}
                              className="p-1.5 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors" title="Enregistrer">
                              <Check className="w-3.5 h-3.5"/>
                            </button>
                            <button onClick={()=>setEditingId(null)}
                              className="p-1.5 rounded bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors" title="Annuler">
                              <X className="w-3.5 h-3.5"/>
                            </button>
                          </div>
                        ) : isAdding ? (
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={()=>createMut.mutate({date:dateStr,...addForm})}
                              className="p-1.5 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">
                              <Check className="w-3.5 h-3.5"/>
                            </button>
                            <button onClick={()=>setAddingDate(null)}
                              className="p-1.5 rounded bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                              <X className="w-3.5 h-3.5"/>
                            </button>
                          </div>
                        ) : row ? (
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={()=>startEdit(row)}
                              className="p-1.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                              <Pencil className="w-3.5 h-3.5"/>
                            </button>
                            <button onClick={()=>deleteMut.mutate(row.id)}
                              className="p-1.5 rounded text-rose-400 hover:bg-rose-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5"/>
                            </button>
                          </div>
                        ) : !weekend ? (
                          <button
                            onClick={()=>{ setAddingDate(dateStr); setAddForm({heureEntree:"08:00",heureSortie:"16:30",observations:""}); setEditingId(null); }}
                            className="text-[10px] text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-2 py-0.5 rounded border border-dashed border-blue-300 transition-colors font-medium"
                          >+ Ajouter</button>
                        ) : null}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>

            {/* Footer total */}
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-700 text-white font-semibold">
                  <td colSpan={4} className="px-4 py-2.5 text-right text-xs border border-slate-600">Total heures travaillées :</td>
                  <td colSpan={2} className="px-4 py-2.5 text-center text-sm font-bold font-mono border border-slate-600">
                    {formatMinutes(totalMin)}
                  </td>
                  <td colSpan={2} className="px-4 py-2.5 text-xs border border-slate-600 text-slate-300">
                    {rows.length} jour(s) / {workDaysTotal} ouvrables
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Signatures section */}
      <div className="mt-6 grid grid-cols-2 gap-8 text-sm">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-8">Signature de l'Agent</p>
          <div className="border-t border-dashed border-slate-400 pt-2 text-xs text-slate-500">
            {agentInfo.prenom} {agentInfo.nom}
            {agentInfo.matricule && <span className="ml-2 font-mono">({agentInfo.matricule})</span>}
          </div>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-8">Visa du Chef de Service</p>
          <div className="border-t border-dashed border-slate-400 pt-2 text-xs text-slate-400">
            &nbsp;
          </div>
        </div>
      </div>
    </div>
  );
}
