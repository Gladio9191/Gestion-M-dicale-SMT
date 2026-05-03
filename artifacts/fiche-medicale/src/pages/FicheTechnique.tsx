import { useState, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetEmployeeFiche,
  useUpdateEmployee,
  useCreateVisite,
  useUpdateVisite,
  useDeleteVisite,
  useCreateAntecedent,
  useDeleteAntecedent,
  useCreateRestriction,
  useDeleteRestriction,
  useCreateExpertise,
  useDeleteExpertise,
  getGetEmployeeFicheQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPE THÉORIQUE — même logique que registre.ts
   Risque A : VMA → VMSle (semestre différent) ou VMC (même sem.) → VMC (3e+)
   Risque S : toujours VMA
═══════════════════════════════════════════════════════════════════════════ */
function computeTypeVisite(
  risque: string | null,
  datesAnneeAsc: string[],
  currentDate: string
): string {
  const r = (risque ?? "").trim().toUpperCase();
  if (r === "S") return "VMA";
  const idx = datesAnneeAsc.indexOf(currentDate);
  if (idx <= 0) return "VMA";
  if (idx === 1) {
    const semOf = (d: string) => parseInt(d.slice(5, 7)) <= 6 ? 1 : 2;
    return semOf(datesAnneeAsc[0]) !== semOf(currentDate) ? "VMSle" : "VMC";
  }
  return "VMC";
}

const APTITUDE_LABELS: Record<string, string> = {
  APTE: "Apte",
  INAPTE: "Inapte",
  APTE_SOUS_RESERVE: "Apte sous réserve",
};
const APTITUDE_COLORS: Record<string, string> = {
  APTE: "#0d9488",
  INAPTE: "#ef4444",
  APTE_SOUS_RESERVE: "#f59e0b",
};

const ANTECEDENT_TYPES = ["PATHOLOGIQUE", "PROFESSIONNEL", "CHIRURGICAL", "ALLERGIQUE", "AUTRE"] as const;
const ANTECEDENT_LABELS: Record<string, string> = {
  PATHOLOGIQUE: "Pathologique",
  PROFESSIONNEL: "Professionnel",
  CHIRURGICAL: "Chirurgical",
  ALLERGIQUE: "Allergique",
  AUTRE: "Autre",
};
const EXPERTISE_TYPES = ["OPTHALMO", "PSY", "ORL", "VERTIGE", "AUTRE"] as const;

function SectionHeader({ title, onAdd, addLabel }: { title: string; onAdd?: () => void; addLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{title}</h3>
      {onAdd && (
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
        >
          <Plus className="w-3 h-3" />
          {addLabel ?? "Ajouter"}
        </button>
      )}
    </div>
  );
}

export default function FicheTechnique() {
  const { matricule } = useParams<{ matricule: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: fiche, isLoading } = useGetEmployeeFiche(matricule, {
    query: { queryKey: getGetEmployeeFicheQueryKey(matricule) },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetEmployeeFicheQueryKey(matricule) });

  const updateEmployee = useUpdateEmployee();
  const createVisite = useCreateVisite();
  const updateVisite = useUpdateVisite();
  const deleteVisite = useDeleteVisite();
  const createAntecedent = useCreateAntecedent();
  const deleteAntecedent = useDeleteAntecedent();
  const createRestriction = useCreateRestriction();
  const deleteRestriction = useDeleteRestriction();
  const createExpertise = useCreateExpertise();
  const deleteExpertise = useDeleteExpertise();

  // Edit states
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState<Record<string, string>>({});

  const [showNewVisite, setShowNewVisite] = useState(false);
  const [editingVisiteId, setEditingVisiteId] = useState<number | null>(null);
  const [visiteForm, setVisiteForm] = useState<Record<string, string>>({});

  const [showNewAtcd, setShowNewAtcd] = useState(false);
  const [atcdForm, setAtcdForm] = useState({ type: "PATHOLOGIQUE", description: "" });

  const [showNewRestriction, setShowNewRestriction] = useState(false);
  const [restrictionForm, setRestrictionForm] = useState({ typeRestriction: "TEMPORAIRE", motifMedical: "", dateDebut: "", dateFin: "" });

  const [showNewExpertise, setShowNewExpertise] = useState(false);
  const [expertiseForm, setExpertiseForm] = useState({ typeExpertise: "OPTHALMO", dateExpertise: "", resultat: "", notes: "" });

  const [expandedVisiteId, setExpandedVisiteId] = useState<number | null>(null);

  /* ── Type théorique suggéré pour le formulaire de nouvelle visite ── */
  /* Must be above any conditional return (Rules of Hooks) */
  const suggestedType = useMemo(() => {
    const date   = visiteForm.dateVisite;
    const risque = visiteForm.risque ?? "";
    if (!date) return null;
    const year = date.slice(0, 4);
    const existingDates = (fiche?.visites ?? [])
      .map((v) => v.dateVisite)
      .filter((d) => d.slice(0, 4) === year)
      .sort();
    const allDates = [...existingDates, date].sort().filter(
      (d, i, arr) => arr.indexOf(d) === i
    );
    return computeTypeVisite(risque || null, allDates, date);
  }, [visiteForm.dateVisite, visiteForm.risque, fiche?.visites]);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Chargement de la fiche...</p>
      </div>
    );
  }

  if (!fiche) {
    return (
      <div className="p-8 text-center">
        <p className="text-foreground font-medium">Employé non trouvé</p>
        <Link href="/employees" className="text-primary text-sm mt-2 inline-block">Retour à la liste</Link>
      </div>
    );
  }

  const { employee, antecedents, restrictions, expertises, visites } = fiche;

  const startEditInfo = () => {
    setInfoForm({
      nom: employee.nom,
      prenom: employee.prenom,
      dateNaissance: employee.dateNaissance ?? "",
      dateEmbauche: employee.dateEmbauche ?? "",
      service: employee.service ?? "",
      posteActuel: employee.posteActuel ?? "",
      anamnese: employee.anamnese ?? "",
      decisionsImportantes: employee.decisionsImportantes ?? "",
    });
    setEditingInfo(true);
  };

  const saveInfo = () => {
    updateEmployee.mutate(
      { matricule, data: { ...infoForm, dateNaissance: infoForm.dateNaissance || null, dateEmbauche: infoForm.dateEmbauche || null, service: infoForm.service || null, posteActuel: infoForm.posteActuel || null, anamnese: infoForm.anamnese || null, decisionsImportantes: infoForm.decisionsImportantes || null } },
      {
        onSuccess: () => { invalidate(); setEditingInfo(false); toast({ title: "Informations mises à jour" }); },
        onError: () => toast({ title: "Erreur de mise à jour", variant: "destructive" }),
      }
    );
  };

  const startEditVisite = (v: typeof visites[0]) => {
    setEditingVisiteId(v.id);
    setVisiteForm({
      dateVisite:       v.dateVisite,
      typeVisite:       v.typeVisite ?? "",
      risque:           v.risque ?? "",
      examensCliniques: v.examensCliniques ?? "",
      observations:     v.observations ?? "",
      recommandations:  v.recommandations ?? "",
      decisionAptitude: v.decisionAptitude ?? "",
      orientationSoins: v.orientationSoins ?? "",
      examenRadio:      v.examenRadio ?? "",
      bilan:            v.bilan ?? "",
    });
  };

  type AptitudeVal = "APTE" | "INAPTE" | "APTE_SOUS_RESERVE";
  const buildVisiteData = () => ({
    dateVisite:       visiteForm.dateVisite ?? "",
    typeVisite:       visiteForm.typeVisite || null,
    risque:           visiteForm.risque || null,
    examensCliniques: visiteForm.examensCliniques || null,
    observations:     visiteForm.observations || null,
    recommandations:  visiteForm.recommandations || null,
    decisionAptitude: (visiteForm.decisionAptitude as AptitudeVal) || null,
    orientationSoins: visiteForm.orientationSoins || null,
    examenRadio:      visiteForm.examenRadio || null,
    bilan:            visiteForm.bilan || null,
  });

  const saveVisite = (id: number) => {
    updateVisite.mutate(
      { id, data: buildVisiteData() },
      {
        onSuccess: () => { invalidate(); setEditingVisiteId(null); toast({ title: "Visite mise à jour" }); },
        onError: () => toast({ title: "Erreur", variant: "destructive" }),
      }
    );
  };

  const addVisite = () => {
    if (!visiteForm.dateVisite) { toast({ title: "La date est requise", variant: "destructive" }); return; }
    createVisite.mutate(
      { matricule, data: buildVisiteData() },
      {
        onSuccess: () => { invalidate(); setShowNewVisite(false); setVisiteForm({}); toast({ title: "Visite ajoutée" }); },
        onError: () => toast({ title: "Erreur", variant: "destructive" }),
      }
    );
  };

  const addAtcd = () => {
    if (!atcdForm.description) { toast({ title: "Description requise", variant: "destructive" }); return; }
    createAntecedent.mutate(
      { matricule, data: { type: atcdForm.type as typeof ANTECEDENT_TYPES[number], description: atcdForm.description } },
      {
        onSuccess: () => { invalidate(); setShowNewAtcd(false); setAtcdForm({ type: "PATHOLOGIQUE", description: "" }); toast({ title: "Antécédent ajouté" }); },
        onError: () => toast({ title: "Erreur", variant: "destructive" }),
      }
    );
  };

  const addRestriction = () => {
    if (!restrictionForm.motifMedical) { toast({ title: "Motif médical requis", variant: "destructive" }); return; }
    createRestriction.mutate(
      { matricule, data: { typeRestriction: restrictionForm.typeRestriction as "DEFINITIVE" | "TEMPORAIRE", motifMedical: restrictionForm.motifMedical, dateDebut: restrictionForm.dateDebut || null, dateFin: restrictionForm.dateFin || null } },
      {
        onSuccess: () => { invalidate(); setShowNewRestriction(false); setRestrictionForm({ typeRestriction: "TEMPORAIRE", motifMedical: "", dateDebut: "", dateFin: "" }); toast({ title: "Restriction ajoutée" }); },
        onError: () => toast({ title: "Erreur", variant: "destructive" }),
      }
    );
  };

  const addExpertise = () => {
    createExpertise.mutate(
      { matricule, data: { typeExpertise: expertiseForm.typeExpertise as typeof EXPERTISE_TYPES[number], dateExpertise: expertiseForm.dateExpertise || null, resultat: expertiseForm.resultat || null, notes: expertiseForm.notes || null } },
      {
        onSuccess: () => { invalidate(); setShowNewExpertise(false); setExpertiseForm({ typeExpertise: "OPTHALMO", dateExpertise: "", resultat: "", notes: "" }); toast({ title: "Expertise ajoutée" }); },
        onError: () => toast({ title: "Erreur", variant: "destructive" }),
      }
    );
  };

  const setV = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setVisiteForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link href="/employees" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Retour à la liste
      </Link>

      {/* Header */}
      <div className="bg-card border border-card-border rounded-xl p-6 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {employee.nom} {employee.prenom}
            </h1>
            <p className="text-muted-foreground text-sm mt-1 font-mono">{employee.matricule}</p>
          </div>
          <div className="flex gap-2">
            {!editingInfo ? (
              <Button variant="outline" size="sm" onClick={startEditInfo}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Modifier
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditingInfo(false)}>
                  <X className="w-3.5 h-3.5 mr-1" />
                  Annuler
                </Button>
                <Button size="sm" onClick={saveInfo}>
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Enregistrer
                </Button>
              </>
            )}
          </div>
        </div>

        {!editingInfo ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5 pt-5 border-t border-border">
            {[
              { label: "Âge", value: employee.age ? `${employee.age} ans` : "—" },
              { label: "Date de naissance", value: employee.dateNaissance ?? "—" },
              { label: "Date d'embauche", value: employee.dateEmbauche ?? "—" },
              { label: "Service", value: employee.service ?? "—" },
              { label: "Poste actuel", value: employee.posteActuel ?? "—" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 pt-5 border-t border-border grid grid-cols-2 gap-3">
            {[
              { key: "nom", label: "Nom", type: "text" },
              { key: "prenom", label: "Prénom", type: "text" },
              { key: "dateNaissance", label: "Date naissance", type: "date" },
              { key: "dateEmbauche", label: "Date embauche", type: "date" },
              { key: "service", label: "Service", type: "text" },
              { key: "posteActuel", label: "Poste actuel", type: "text" },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground block mb-1">{label}</label>
                <Input type={type} value={infoForm[key] ?? ""} onChange={e => setInfoForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Anamnèse */}
        <div className="bg-card border border-card-border rounded-xl p-6">
          <SectionHeader title="Anamnèse" />
          {editingInfo ? (
            <textarea
              className="w-full min-h-28 px-3 py-2 text-sm bg-background border border-input rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              value={infoForm.anamnese ?? ""}
              onChange={e => setInfoForm(f => ({ ...f, anamnese: e.target.value }))}
              placeholder="Anamnèse..."
            />
          ) : (
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {employee.anamnese || <span className="text-muted-foreground italic">Aucune anamnèse enregistrée</span>}
            </p>
          )}
        </div>

        {/* Décisions importantes */}
        <div className="bg-card border border-card-border rounded-xl p-6">
          <SectionHeader title="Décisions importantes" />
          {editingInfo ? (
            <textarea
              className="w-full min-h-28 px-3 py-2 text-sm bg-background border border-input rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              value={infoForm.decisionsImportantes ?? ""}
              onChange={e => setInfoForm(f => ({ ...f, decisionsImportantes: e.target.value }))}
              placeholder="Décisions médicales importantes..."
            />
          ) : (
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {employee.decisionsImportantes || <span className="text-muted-foreground italic">Aucune décision enregistrée</span>}
            </p>
          )}
        </div>
      </div>

      {/* ATCD Notables */}
      <div className="bg-card border border-card-border rounded-xl p-6 mb-4">
        <SectionHeader title="ATCD Notables" onAdd={() => setShowNewAtcd(true)} addLabel="Ajouter un antécédent" />
        {antecedents.length === 0 && !showNewAtcd && (
          <p className="text-sm text-muted-foreground italic">Aucun antécédent enregistré</p>
        )}
        <div className="space-y-2">
          {antecedents.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-3 py-2 border-b border-border/50 last:border-0">
              <div className="flex items-start gap-2">
                <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                  {ANTECEDENT_LABELS[a.type] ?? a.type}
                </span>
                <p className="text-sm">{a.description}</p>
              </div>
              <button
                onClick={() => deleteAntecedent.mutate({ id: a.id }, { onSuccess: invalidate })}
                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        {showNewAtcd && (
          <div className="mt-3 pt-3 border-t border-border space-y-2">
            <select
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md"
              value={atcdForm.type}
              onChange={e => setAtcdForm(f => ({ ...f, type: e.target.value }))}
            >
              {ANTECEDENT_TYPES.map(t => <option key={t} value={t}>{ANTECEDENT_LABELS[t]}</option>)}
            </select>
            <Input placeholder="Description de l'antécédent..." value={atcdForm.description} onChange={e => setAtcdForm(f => ({ ...f, description: e.target.value }))} />
            <div className="flex gap-2">
              <Button size="sm" onClick={addAtcd}>Ajouter</Button>
              <Button size="sm" variant="outline" onClick={() => setShowNewAtcd(false)}>Annuler</Button>
            </div>
          </div>
        )}
      </div>

      {/* Restrictions médicales */}
      <div className="bg-card border border-card-border rounded-xl p-6 mb-4">
        <SectionHeader title="Restrictions médicales" onAdd={() => setShowNewRestriction(true)} addLabel="Ajouter une restriction" />
        {restrictions.length === 0 && !showNewRestriction && (
          <p className="text-sm text-muted-foreground italic">Aucune restriction médicale</p>
        )}
        <div className="space-y-2">
          {restrictions.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-3 py-2 border-b border-border/50 last:border-0">
              <div className="flex items-start gap-2">
                <span className={cn("text-xs px-2 py-0.5 rounded-full shrink-0 mt-0.5 font-medium", r.typeRestriction === "DEFINITIVE" ? "bg-destructive/10 text-destructive" : "bg-yellow-500/10 text-yellow-700")}>
                  {r.typeRestriction === "DEFINITIVE" ? "Définitive" : "Temporaire"}
                </span>
                <div>
                  <p className="text-sm">{r.motifMedical}</p>
                  {(r.dateDebut || r.dateFin) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.dateDebut && `Depuis ${r.dateDebut}`}
                      {r.dateFin && ` — jusqu'au ${r.dateFin}`}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={() => deleteRestriction.mutate({ id: r.id }, { onSuccess: invalidate })} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        {showNewRestriction && (
          <div className="mt-3 pt-3 border-t border-border space-y-2">
            <select className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md" value={restrictionForm.typeRestriction} onChange={e => setRestrictionForm(f => ({ ...f, typeRestriction: e.target.value }))}>
              <option value="TEMPORAIRE">Temporaire</option>
              <option value="DEFINITIVE">Définitive</option>
            </select>
            <Input placeholder="Motif médical..." value={restrictionForm.motifMedical} onChange={e => setRestrictionForm(f => ({ ...f, motifMedical: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-muted-foreground">Début</label><Input type="date" value={restrictionForm.dateDebut} onChange={e => setRestrictionForm(f => ({ ...f, dateDebut: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">Fin</label><Input type="date" value={restrictionForm.dateFin} onChange={e => setRestrictionForm(f => ({ ...f, dateFin: e.target.value }))} /></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addRestriction}>Ajouter</Button>
              <Button size="sm" variant="outline" onClick={() => setShowNewRestriction(false)}>Annuler</Button>
            </div>
          </div>
        )}
      </div>

      {/* Expertises */}
      <div className="bg-card border border-card-border rounded-xl p-6 mb-4">
        <SectionHeader title="Expertises médicales" onAdd={() => setShowNewExpertise(true)} addLabel="Ajouter une expertise" />
        {expertises.length === 0 && !showNewExpertise && (
          <p className="text-sm text-muted-foreground italic">Aucune expertise enregistrée</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {expertises.map((exp) => (
            <div key={exp.id} className="border border-border rounded-lg p-3 relative">
              <button onClick={() => deleteExpertise.mutate({ id: exp.id }, { onSuccess: invalidate })} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
              <p className="text-xs font-semibold text-primary">{exp.typeExpertise}</p>
              {exp.dateExpertise && <p className="text-xs text-muted-foreground mt-0.5">{exp.dateExpertise}</p>}
              {exp.resultat && <p className="text-sm mt-1">{exp.resultat}</p>}
              {exp.notes && <p className="text-xs text-muted-foreground mt-1">{exp.notes}</p>}
            </div>
          ))}
        </div>
        {showNewExpertise && (
          <div className="mt-3 pt-3 border-t border-border space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Type</label>
                <select className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md" value={expertiseForm.typeExpertise} onChange={e => setExpertiseForm(f => ({ ...f, typeExpertise: e.target.value }))}>
                  {EXPERTISE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-muted-foreground">Date</label><Input type="date" value={expertiseForm.dateExpertise} onChange={e => setExpertiseForm(f => ({ ...f, dateExpertise: e.target.value }))} /></div>
            </div>
            <Input placeholder="Résultat..." value={expertiseForm.resultat} onChange={e => setExpertiseForm(f => ({ ...f, resultat: e.target.value }))} />
            <Input placeholder="Notes..." value={expertiseForm.notes} onChange={e => setExpertiseForm(f => ({ ...f, notes: e.target.value }))} />
            <div className="flex gap-2">
              <Button size="sm" onClick={addExpertise}>Ajouter</Button>
              <Button size="sm" variant="outline" onClick={() => setShowNewExpertise(false)}>Annuler</Button>
            </div>
          </div>
        )}
      </div>

      {/* Visites médicales */}
      <div className="bg-card border border-card-border rounded-xl p-6">
        <SectionHeader title="Historique des visites médicales" onAdd={() => { setShowNewVisite(true); setVisiteForm({ dateVisite: "", typeVisite: "", risque: "", examensCliniques: "", observations: "", recommandations: "", decisionAptitude: "", orientationSoins: "", examenRadio: "", bilan: "" }); }} addLabel="Nouvelle visite" />

        {showNewVisite && (
          <div className="mb-4 p-4 border border-border rounded-lg bg-muted/20 space-y-3">
            <h4 className="text-sm font-medium">Nouvelle visite</h4>

            {/* Ligne 1 : Date + Risque */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Date *</label>
                <Input type="date" value={visiteForm.dateVisite ?? ""} onChange={setV("dateVisite")} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Risque</label>
                <select className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md" value={visiteForm.risque ?? ""} onChange={setV("risque")}>
                  <option value="">— Non défini —</option>
                  <option value="A">A — Agent actif</option>
                  <option value="S">S — Agent sédentaire</option>
                </select>
              </div>
            </div>

            {/* Suggestion automatique du type */}
            {suggestedType && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
                <span className="text-xs text-blue-700 font-medium">Type suggéré :</span>
                <span className="text-xs font-bold text-blue-800 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-full">{suggestedType}</span>
                <button
                  type="button"
                  onClick={() => setVisiteForm(f => ({ ...f, typeVisite: suggestedType }))}
                  className="ml-auto text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                >
                  Appliquer
                </button>
              </div>
            )}

            {/* Type de visite (modifiable) */}
            <div>
              <label className="text-xs text-muted-foreground">Type de visite (VMC)</label>
              <Input placeholder="VMA, VMSle, VMC, CA…" value={visiteForm.typeVisite ?? ""} onChange={setV("typeVisite")} />
            </div>

            <div><label className="text-xs text-muted-foreground">Examens cliniques / Explorations</label><textarea className="w-full min-h-16 px-3 py-2 text-sm bg-background border border-input rounded-md resize-y" value={visiteForm.examensCliniques ?? ""} onChange={setV("examensCliniques")} /></div>
            <div><label className="text-xs text-muted-foreground">Observations</label><textarea className="w-full min-h-16 px-3 py-2 text-sm bg-background border border-input rounded-md resize-y" value={visiteForm.observations ?? ""} onChange={setV("observations")} /></div>
            <div><label className="text-xs text-muted-foreground">Recommandations</label><textarea className="w-full min-h-14 px-3 py-2 text-sm bg-background border border-input rounded-md resize-y" value={visiteForm.recommandations ?? ""} onChange={setV("recommandations")} /></div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Orientation Cs MT / Soins</label>
                <Input placeholder="Cardiologue, Ophtalmo…" value={visiteForm.orientationSoins ?? ""} onChange={setV("orientationSoins")} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Examen Radio</label>
                <Input placeholder="Rx thorax, Echo…" value={visiteForm.examenRadio ?? ""} onChange={setV("examenRadio")} />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Bilan (bio)</label>
              <Input placeholder="NFS, glycémie, bilan lipidique…" value={visiteForm.bilan ?? ""} onChange={setV("bilan")} />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Décision d'aptitude</label>
              <select className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md" value={visiteForm.decisionAptitude ?? ""} onChange={setV("decisionAptitude")}>
                <option value="">— Non définie —</option>
                <option value="APTE">Apte</option>
                <option value="INAPTE">Inapte</option>
                <option value="APTE_SOUS_RESERVE">Apte sous réserve</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addVisite}>Enregistrer</Button>
              <Button size="sm" variant="outline" onClick={() => setShowNewVisite(false)}>Annuler</Button>
            </div>
          </div>
        )}

        {visites.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Aucune visite enregistrée</p>
        ) : (
          <div className="space-y-2">
            {visites.map((v) => {
              const isExpanded = expandedVisiteId === v.id;
              const isEditingThis = editingVisiteId === v.id;
              return (
                <div key={v.id} className="border border-border rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() => setExpandedVisiteId(isExpanded ? null : v.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium font-mono">{v.dateVisite}</span>
                      {v.typeVisite && <span className="text-xs text-muted-foreground">{v.typeVisite}</span>}
                      {v.decisionAptitude && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: `${APTITUDE_COLORS[v.decisionAptitude]}22`, color: APTITUDE_COLORS[v.decisionAptitude] }}
                        >
                          {APTITUDE_LABELS[v.decisionAptitude]}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); startEditVisite(v); setExpandedVisiteId(v.id); }}
                        className="text-muted-foreground hover:text-primary transition-colors p-1"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); deleteVisite.mutate({ id: v.id }, { onSuccess: invalidate }); }}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-border bg-muted/10">
                      {isEditingThis ? (
                        <div className="space-y-3 pt-3">
                          <div className="grid grid-cols-3 gap-3">
                            <div><label className="text-xs text-muted-foreground">Date</label><Input type="date" value={visiteForm.dateVisite ?? ""} onChange={setV("dateVisite")} /></div>
                            <div>
                              <label className="text-xs text-muted-foreground">Risque</label>
                              <select className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md" value={visiteForm.risque ?? ""} onChange={setV("risque")}>
                                <option value="">—</option>
                                <option value="A">A — Actif</option>
                                <option value="S">S — Sédentaire</option>
                              </select>
                            </div>
                            <div><label className="text-xs text-muted-foreground">Type (VMC)</label><Input value={visiteForm.typeVisite ?? ""} onChange={setV("typeVisite")} placeholder="VMA, VMSle, VMC…" /></div>
                          </div>
                          <div><label className="text-xs text-muted-foreground">Examens / Explorations</label><textarea className="w-full min-h-16 px-3 py-2 text-sm bg-background border border-input rounded-md resize-y" value={visiteForm.examensCliniques ?? ""} onChange={setV("examensCliniques")} /></div>
                          <div><label className="text-xs text-muted-foreground">Observations</label><textarea className="w-full min-h-16 px-3 py-2 text-sm bg-background border border-input rounded-md resize-y" value={visiteForm.observations ?? ""} onChange={setV("observations")} /></div>
                          <div><label className="text-xs text-muted-foreground">Recommandations</label><textarea className="w-full min-h-14 px-3 py-2 text-sm bg-background border border-input rounded-md resize-y" value={visiteForm.recommandations ?? ""} onChange={setV("recommandations")} /></div>
                          <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-xs text-muted-foreground">Orientation Cs MT / Soins</label><Input value={visiteForm.orientationSoins ?? ""} onChange={setV("orientationSoins")} /></div>
                            <div><label className="text-xs text-muted-foreground">Examen Radio</label><Input value={visiteForm.examenRadio ?? ""} onChange={setV("examenRadio")} /></div>
                          </div>
                          <div><label className="text-xs text-muted-foreground">Bilan (bio)</label><Input value={visiteForm.bilan ?? ""} onChange={setV("bilan")} /></div>
                          <div>
                            <label className="text-xs text-muted-foreground">Décision d'aptitude</label>
                            <select className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md" value={visiteForm.decisionAptitude ?? ""} onChange={setV("decisionAptitude")}>
                              <option value="">— Non définie —</option>
                              <option value="APTE">Apte</option>
                              <option value="INAPTE">Inapte</option>
                              <option value="APTE_SOUS_RESERVE">Apte sous réserve</option>
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveVisite(v.id)}>Enregistrer</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingVisiteId(null)}>Annuler</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 pt-3 text-sm">
                          {v.risque && <div><p className="text-xs text-muted-foreground font-medium mb-0.5">Risque</p><span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-slate-700">{v.risque === "A" ? "A — Actif" : v.risque === "S" ? "S — Sédentaire" : v.risque}</span></div>}
                          {v.examensCliniques && <div><p className="text-xs text-muted-foreground font-medium mb-0.5">Examens / Explorations</p><p className="leading-relaxed">{v.examensCliniques}</p></div>}
                          {v.observations && <div><p className="text-xs text-muted-foreground font-medium mb-0.5">Observations</p><p className="leading-relaxed">{v.observations}</p></div>}
                          {v.recommandations && <div><p className="text-xs text-muted-foreground font-medium mb-0.5">Recommandations</p><p className="leading-relaxed">{v.recommandations}</p></div>}
                          {v.orientationSoins && <div><p className="text-xs text-muted-foreground font-medium mb-0.5">Orientation Cs MT / Soins</p><p>{v.orientationSoins}</p></div>}
                          {v.examenRadio && <div><p className="text-xs text-muted-foreground font-medium mb-0.5">Examen Radio</p><p>{v.examenRadio}</p></div>}
                          {v.bilan && <div><p className="text-xs text-muted-foreground font-medium mb-0.5">Bilan (bio)</p><p>{v.bilan}</p></div>}
                          {!v.examensCliniques && !v.observations && !v.recommandations && !v.orientationSoins && !v.examenRadio && !v.bilan && (
                            <p className="text-muted-foreground italic">Aucun détail enregistré</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
