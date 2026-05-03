import { useState, useRef, useEffect } from "react";
import {
  Search, Save, Loader2, Trash2, CheckCircle2, UserCheck,
  AlertCircle, FlaskConical, Eye, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES & CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */
type ManualExpertise = {
  id: number;
  matricule: string;
  categorie: string;
  typeExpertise: string;
  resultat: string | null;
  dateExpertise: string;
  createdAt: string;
};

type EmployeeInfo = {
  matricule: string;
  nom: string;
  prenom: string;
  direction?: string | null;
  service?: string | null;
};

const CATEGORIES = [
  {
    value: "STANDARDS",
    label: "Expertises Standards",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    suggestions: ["Ophtalmologie", "ORL", "Psychiatrie / Psychologie"],
  },
  {
    value: "SYSTEMATIQUES",
    label: "Expertises Systématiques",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    suggestions: ["Bilan biologique", "Bilan radiologique", "Audiogramme", "Spirométrie", "ECG"],
  },
  {
    value: "AUTRES_MT",
    label: "Autres Expertises MT",
    color: "bg-orange-50 text-orange-700 border-orange-200",
    suggestions: ["Dermatologie", "Cardiologie", "Neurologie", "Chirurgie"],
  },
  {
    value: "SOINS",
    label: "Suivi en Soins",
    color: "bg-green-50 text-green-700 border-green-200",
    suggestions: ["Suivi diabète", "Suivi HTA", "Kinésithérapie", "Soins infirmiers"],
  },
];

const CAT_BADGE: Record<string, string> = {
  STANDARDS:     "bg-blue-50 text-blue-700",
  SYSTEMATIQUES: "bg-purple-50 text-purple-700",
  AUTRES_MT:     "bg-orange-50 text-orange-700",
  SOINS:         "bg-green-50 text-green-700",
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function SaisieExpertises() {
  const { toast } = useToast();

  /* ── Form state ── */
  const [matricule, setMatricule]       = useState("");
  const [employee, setEmployee]         = useState<EmployeeInfo | null>(null);
  const [lookingUp, setLookingUp]       = useState(false);
  const [lookupDone, setLookupDone]     = useState(false);
  const [notFound, setNotFound]         = useState(false);

  const [categorie, setCategorie]       = useState("STANDARDS");
  const [typeExpertise, setTypeExpertise] = useState("");
  const [resultat, setResultat]         = useState("");
  const [dateExpertise, setDateExpertise] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving]             = useState(false);

  /* ── Recent entries ── */
  const [recent, setRecent]             = useState<ManualExpertise[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [deletingId, setDeletingId]     = useState<number | null>(null);

  /* ── Type suggestions dropdown ── */
  const [showSugg, setShowSugg]         = useState(false);
  const suggRef                         = useRef<HTMLDivElement>(null);

  /* ── Load recent on mount ── */
  useEffect(() => { loadRecent(); }, []);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggRef.current && !suggRef.current.contains(e.target as Node)) setShowSugg(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const loadRecent = async () => {
    setLoadingRecent(true);
    try {
      const res = await fetch("/api/expertises-manual");
      if (res.ok) setRecent(await res.json());
    } catch { /* ignore */ }
    setLoadingRecent(false);
  };

  /* ── Employee lookup ── */
  const lookupEmployee = async () => {
    const mat = matricule.trim();
    if (!mat) return;
    setLookingUp(true);
    setEmployee(null);
    setNotFound(false);
    setLookupDone(false);
    try {
      const res = await fetch(`/api/employees/${encodeURIComponent(mat)}`);
      if (res.ok) {
        const data = await res.json();
        setEmployee({ matricule: data.matricule, nom: data.nom, prenom: data.prenom, direction: data.direction, service: data.service });
        setLookupDone(true);
      } else {
        setNotFound(true);
        setLookupDone(true);
      }
    } catch {
      setNotFound(true);
      setLookupDone(true);
    }
    setLookingUp(false);
  };

  /* ── Save ── */
  const handleSave = async () => {
    if (!matricule.trim() || !categorie || !typeExpertise.trim() || !dateExpertise) {
      toast({ title: "Remplissez tous les champs obligatoires", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/expertises-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matricule: matricule.trim(), categorie, typeExpertise: typeExpertise.trim(), resultat: resultat.trim() || null, dateExpertise }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Expertise enregistrée ✓" });
      setTypeExpertise(""); setResultat("");
      setDateExpertise(new Date().toISOString().slice(0, 10));
      loadRecent();
    } catch {
      toast({ title: "Erreur d'enregistrement", variant: "destructive" });
    }
    setSaving(false);
  };

  /* ── Delete ── */
  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await fetch(`/api/expertises-manual/${id}`, { method: "DELETE" });
      setRecent((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Entrée supprimée" });
    } catch { toast({ title: "Erreur suppression", variant: "destructive" }); }
    setDeletingId(null);
  };

  const selectedCat = CATEGORIES.find((c) => c.value === categorie);
  const catColor = CAT_BADGE[categorie] ?? "bg-muted text-muted-foreground";

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Saisie des Expertises Médicales</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Enregistrez manuellement les résultats d'examens — ils seront intégrés automatiquement dans la Fiche Technique Word
        </p>
      </div>

      {/* ══ ÉTAPE 1 — Matricule + lookup ═════════════════════════════════════ */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
          <span className="text-sm font-semibold text-foreground">Identification de l'agent</span>
        </div>
        <div className="p-5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Matricule de l'agent (ex: MAT-2016-001)"
                value={matricule}
                onChange={(e) => { setMatricule(e.target.value); setEmployee(null); setNotFound(false); setLookupDone(false); }}
                onKeyDown={(e) => e.key === "Enter" && lookupEmployee()}
                className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <Button onClick={lookupEmployee} disabled={!matricule.trim() || lookingUp} className="gap-2 shrink-0">
              {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Vérifier
            </Button>
          </div>

          {/* Employee result */}
          {lookupDone && employee && (
            <div className="mt-3 flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <UserCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-800">{employee.nom} {employee.prenom}</p>
                <p className="text-xs text-emerald-600">
                  {[employee.direction, employee.service].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span className="ml-auto flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3" />Agent confirmé
              </span>
            </div>
          )}
          {lookupDone && notFound && (
            <div className="mt-3 flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
              <div>
                <p className="font-medium text-orange-700">Matricule non trouvé dans la base de données</p>
                <p className="text-xs text-orange-500">Vous pouvez tout de même saisir l'expertise — elle sera liée au matricule</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ ÉTAPE 2 — Formulaire ═════════════════════════════════════════════ */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
          <span className="text-sm font-semibold text-foreground">Détails de l'expertise</span>
        </div>
        <div className="p-5 space-y-4">
          {/* Category + Date row */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Catégorie d'expertise <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => { setCategorie(cat.value); setTypeExpertise(""); }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium text-left transition-all",
                      categorie === cat.value
                        ? `${CAT_BADGE[cat.value]} border-current shadow-sm`
                        : "border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    <FlaskConical className="w-3.5 h-3.5 shrink-0" />
                    <span className="leading-tight">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Date de l'expertise <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dateExpertise}
                  onChange={(e) => setDateExpertise(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Type spécifique <span className="text-red-500">*</span>
                </label>
                <div className="relative" ref={suggRef}>
                  <input
                    type="text"
                    placeholder="Ex: Ophtalmologie, Audiogramme…"
                    value={typeExpertise}
                    onChange={(e) => { setTypeExpertise(e.target.value); setShowSugg(true); }}
                    onFocus={() => setShowSugg(true)}
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 pr-8"
                  />
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  {showSugg && selectedCat && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
                      {selectedCat.suggestions
                        .filter((s) => !typeExpertise || s.toLowerCase().includes(typeExpertise.toLowerCase()))
                        .map((s) => (
                          <button key={s} onMouseDown={() => { setTypeExpertise(s); setShowSugg(false); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
                            {s}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Résultat */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Résultat / Compte-rendu
            </label>
            <textarea
              placeholder="Saisissez le résultat de l'examen, le compte-rendu du spécialiste, ou les conclusions…"
              value={resultat}
              onChange={(e) => setResultat(e.target.value)}
              rows={5}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Preview badge */}
          {categorie && typeExpertise && (
            <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border text-xs", catColor, "border-current/20")}>
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span>
                Sera ajouté sous : <strong>{selectedCat?.label}</strong> → <strong>{typeExpertise}</strong>
                {dateExpertise && <span className="ml-1 opacity-70">({dateExpertise})</span>}
              </span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button onClick={handleSave} disabled={saving || !matricule.trim() || !typeExpertise.trim() || !dateExpertise}
              className="gap-2 min-w-40">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Enregistrement…</> : <><Save className="w-4 h-4" />Enregistrer</>}
            </Button>
          </div>
        </div>
      </div>

      {/* ══ Tableau récapitulatif ════════════════════════════════════════════ */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Dernières expertises saisies</span>
          <span className="text-xs text-muted-foreground">{recent.length} entrée(s)</span>
        </div>

        {loadingRecent && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}

        {!loadingRecent && recent.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            Aucune expertise enregistrée pour l'instant
          </div>
        )}

        {!loadingRecent && recent.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="text-left px-4 py-2.5 font-semibold">Matricule</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Date</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Catégorie</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Type</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Résultat</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {recent.slice(0, 15).map((row) => (
                  <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs font-medium">{row.matricule}</td>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{row.dateExpertise}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", CAT_BADGE[row.categorie] ?? "bg-muted text-muted-foreground")}>
                        {CATEGORIES.find((c) => c.value === row.categorie)?.label ?? row.categorie}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium">{row.typeExpertise}</td>
                    <td className="px-4 py-2.5 text-muted-foreground max-w-xs truncate">{row.resultat || "—"}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => handleDelete(row.id)} disabled={deletingId === row.id}
                        className="text-muted-foreground hover:text-red-500 transition-colors">
                        {deletingId === row.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
