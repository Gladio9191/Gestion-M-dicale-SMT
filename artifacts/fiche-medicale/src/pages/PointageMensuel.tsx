import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Zap, Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (path: string) => `${BASE}${path}`;

type PointageRow = {
  id: number;
  date: string;
  heureEntree: string;
  heureSortie: string;
  observations: string | null;
  createdAt: string;
};

const FR_DAYS  = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const FR_MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function toYM(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function isWeekend(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.getDay() === 0 || d.getDay() === 6;
}

function daysOfMonth(ym: string): string[] {
  const [y, m] = ym.split("-").map(Number);
  const days: string[] = [];
  const d = new Date(y, m - 1, 1);
  while (d.getMonth() === m - 1) {
    const dd = String(d.getDate()).padStart(2, "0");
    days.push(`${y}-${String(m).padStart(2, "0")}-${dd}`);
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function calcDuree(entree: string, sortie: string): string {
  const parse = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const diff = parse(sortie) - parse(entree);
  if (diff <= 0 || isNaN(diff)) return "—";
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h00`;
}

function totalHeures(rows: PointageRow[]): string {
  let total = 0;
  for (const r of rows) {
    const parse = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const diff = parse(r.heureSortie) - parse(r.heureEntree);
    if (diff > 0) total += diff;
  }
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h00`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("fr-MA", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function PointageMensuel() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [currentYM, setCurrentYM] = useState(() => toYM(new Date()));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ heureEntree: "08:00", heureSortie: "16:30", observations: "" });

  // For new (empty) day rows being added inline
  const [addingDate, setAddingDate] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ heureEntree: "08:00", heureSortie: "16:30", observations: "" });

  /* ── Data ── */
  const qKey = ["pointage", currentYM];
  const { data: rows = [], isLoading } = useQuery<PointageRow[]>({
    queryKey: qKey,
    queryFn: () =>
      fetch(api(`/api/pointage?mois=${currentYM}`)).then((r) => r.json()),
  });

  const rowMap = useMemo(() => {
    const m = new Map<string, PointageRow>();
    for (const r of rows) m.set(r.date, r);
    return m;
  }, [rows]);

  const allDays = useMemo(() => daysOfMonth(currentYM), [currentYM]);

  const invalidate = useCallback(() => qc.invalidateQueries({ queryKey: qKey }), [qKey]);

  /* ── Mutations ── */
  const createMut = useMutation({
    mutationFn: (body: object) =>
      fetch(api("/api/pointage"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: () => { invalidate(); setAddingDate(null); toast({ title: "Pointage ajouté" }); },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: { id: number } & object) =>
      fetch(api(`/api/pointage/${id}`), {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: () => { invalidate(); setEditingId(null); toast({ title: "Pointage mis à jour" }); },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      fetch(api(`/api/pointage/${id}`), { method: "DELETE" }),
    onSuccess: () => { invalidate(); toast({ title: "Pointage supprimé" }); },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const generateMut = useMutation({
    mutationFn: () =>
      fetch(api("/api/pointage/generate"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mois: currentYM }),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      invalidate();
      toast({ title: `${data.created} jour(s) généré(s) avec succès` });
    },
    onError: () => toast({ title: "Erreur lors de la génération", variant: "destructive" }),
  });

  /* ── Month nav ── */
  const prevMonth = () => {
    const [y, m] = currentYM.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setCurrentYM(toYM(d));
  };
  const nextMonth = () => {
    const [y, m] = currentYM.split("-").map(Number);
    const d = new Date(y, m, 1);
    setCurrentYM(toYM(d));
  };

  /* ── Start edit ── */
  const startEdit = (row: PointageRow) => {
    setEditingId(row.id);
    setEditForm({
      heureEntree: row.heureEntree,
      heureSortie: row.heureSortie,
      observations: row.observations ?? "",
    });
    setAddingDate(null);
  };

  /* ── Stats ── */
  const [y, mNum] = currentYM.split("-").map(Number);
  const monthLabel = `${FR_MONTHS[mNum - 1]} ${y}`;
  const workDaysInMonth = allDays.filter((d) => !isWeekend(d)).length;
  const daysPresent = rows.length;
  const totalH = totalHeures(rows);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pointage Mensuel</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Entrée / Sortie — Service Médecine du Travail</p>
        </div>

        {/* Month selector */}
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 shadow-sm">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold min-w-[130px] text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-muted transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Jours ouvrables", value: workDaysInMonth, sub: "dans le mois" },
          { label: "Jours pointés",   value: daysPresent,     sub: "enregistrés" },
          { label: "Total heures",    value: totalH,          sub: "travaillées" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs font-medium text-foreground/80 mt-0.5">{s.label}</p>
            <p className="text-[10px] text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Generate button */}
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
          onClick={() => generateMut.mutate()}
          disabled={generateMut.isPending}
        >
          <Zap className="w-4 h-4" />
          {generateMut.isPending ? "Génération…" : "Générer jours ouvrables"}
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground w-12">N°</th>
                <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground w-14">Jour</th>
                <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-center font-semibold text-xs text-muted-foreground w-28">Entrée</th>
                <th className="px-4 py-3 text-center font-semibold text-xs text-muted-foreground w-28">Sortie</th>
                <th className="px-4 py-3 text-center font-semibold text-xs text-muted-foreground w-24">Durée</th>
                <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">Observations</th>
                <th className="px-4 py-3 text-center font-semibold text-xs text-muted-foreground w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-10 text-muted-foreground text-sm">Chargement…</td></tr>
              ) : allDays.map((dateStr, idx) => {
                const row = rowMap.get(dateStr);
                const weekend = isWeekend(dateStr);
                const dayOfWeek = new Date(dateStr + "T12:00:00").getDay();
                const isEditing = row && editingId === row.id;
                const isAdding = addingDate === dateStr;

                return (
                  <tr
                    key={dateStr}
                    className={cn(
                      "border-b border-border/60 transition-colors",
                      weekend
                        ? "bg-muted/30 text-muted-foreground/60"
                        : "hover:bg-muted/20",
                      dayOfWeek === 1 && !weekend && "border-t-2 border-t-blue-100" // Monday separator
                    )}
                  >
                    {/* N° */}
                    <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{idx + 1}</td>

                    {/* Jour */}
                    <td className={cn(
                      "px-4 py-2.5 text-xs font-semibold",
                      weekend ? "text-rose-400" : dayOfWeek === 1 ? "text-blue-600" : "text-foreground/80"
                    )}>
                      {FR_DAYS[dayOfWeek]}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-2.5 text-sm font-medium">
                      {formatDate(dateStr)}
                      {weekend && <span className="ml-2 text-[9px] text-rose-400 uppercase font-bold">WE</span>}
                    </td>

                    {/* Entrée */}
                    <td className="px-2 py-2 text-center">
                      {isEditing ? (
                        <Input
                          type="time"
                          value={editForm.heureEntree}
                          onChange={(e) => setEditForm((f) => ({ ...f, heureEntree: e.target.value }))}
                          className="w-full text-center text-sm h-8"
                        />
                      ) : isAdding ? (
                        <Input
                          type="time"
                          value={addForm.heureEntree}
                          onChange={(e) => setAddForm((f) => ({ ...f, heureEntree: e.target.value }))}
                          className="w-full text-center text-sm h-8"
                        />
                      ) : row ? (
                        <span className="font-mono text-sm text-emerald-700 font-semibold">{row.heureEntree}</span>
                      ) : weekend ? (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>

                    {/* Sortie */}
                    <td className="px-2 py-2 text-center">
                      {isEditing ? (
                        <Input
                          type="time"
                          value={editForm.heureSortie}
                          onChange={(e) => setEditForm((f) => ({ ...f, heureSortie: e.target.value }))}
                          className="w-full text-center text-sm h-8"
                        />
                      ) : isAdding ? (
                        <Input
                          type="time"
                          value={addForm.heureSortie}
                          onChange={(e) => setAddForm((f) => ({ ...f, heureSortie: e.target.value }))}
                          className="w-full text-center text-sm h-8"
                        />
                      ) : row ? (
                        <span className="font-mono text-sm text-rose-700 font-semibold">{row.heureSortie}</span>
                      ) : weekend ? (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>

                    {/* Durée */}
                    <td className="px-2 py-2 text-center">
                      {isEditing ? (
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                          {calcDuree(editForm.heureEntree, editForm.heureSortie)}
                        </span>
                      ) : isAdding ? (
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                          {calcDuree(addForm.heureEntree, addForm.heureSortie)}
                        </span>
                      ) : row ? (
                        <span className="text-xs font-bold font-mono text-blue-700 bg-blue-50 px-2 py-1 rounded-full border border-blue-200">
                          {calcDuree(row.heureEntree, row.heureSortie)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/30">—</span>
                      )}
                    </td>

                    {/* Observations */}
                    <td className="px-2 py-2">
                      {isEditing ? (
                        <Input
                          value={editForm.observations}
                          onChange={(e) => setEditForm((f) => ({ ...f, observations: e.target.value }))}
                          placeholder="Remarque…"
                          className="text-xs h-8"
                        />
                      ) : isAdding ? (
                        <Input
                          value={addForm.observations}
                          onChange={(e) => setAddForm((f) => ({ ...f, observations: e.target.value }))}
                          placeholder="Remarque…"
                          className="text-xs h-8"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">{row?.observations ?? ""}</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-2 py-2 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => updateMut.mutate({ id: row.id, ...editForm })}
                            className="p-1.5 rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                            title="Enregistrer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                            title="Annuler"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : isAdding ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => createMut.mutate({ date: dateStr, ...addForm })}
                            className="p-1.5 rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                            title="Enregistrer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setAddingDate(null)}
                            className="p-1.5 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                            title="Annuler"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : row ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => startEdit(row)}
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Modifier"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteMut.mutate(row.id)}
                            className="p-1.5 rounded-md text-rose-400 hover:bg-rose-50 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : !weekend ? (
                        <button
                          onClick={() => {
                            setAddingDate(dateStr);
                            setAddForm({ heureEntree: "08:00", heureSortie: "16:30", observations: "" });
                            setEditingId(null);
                          }}
                          className="text-[10px] text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors font-medium border border-dashed border-blue-300"
                        >
                          + Ajouter
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer summary */}
        {rows.length > 0 && (
          <div className="px-6 py-3 bg-muted/30 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {daysPresent} jour(s) pointé(s) sur {workDaysInMonth} ouvrables
            </span>
            <span className="text-sm font-bold text-blue-700 font-mono">
              Total : {totalH}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
