import { useState } from "react";
import { useLocation } from "wouter";
import {
  CheckCircle2, XCircle, MinusCircle, Download, Save,
  Loader2, ChevronDown, ChevronUp, AlertTriangle, ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { generateHygieneWordBlob, VisiteHygieneData, CheckItem, Conformite } from "@/components/VisiteHygieneWord";

/* ═══════════════════════════════════════════════════════════════════════════
   DEFAULT CHECKLIST
═══════════════════════════════════════════════════════════════════════════ */
function mkItem(designation: string, extra?: Partial<CheckItem>): CheckItem {
  return { designation, presence: "OUI", observations: "", recommandations: "", ...extra };
}

const DEFAULT_DATA: VisiteHygieneData = {
  dateVisite: new Date().toISOString().slice(0, 10),
  direction: "",
  site: "",
  sanitaires: [
    mkItem("État de propreté générale des sanitaires"),
    mkItem("Approvisionnement en savon"),
    mkItem("Approvisionnement en papier (essuie-mains / hygiénique)"),
    mkItem("Fonctionnement des chasses d'eau"),
  ],
  locauxTravail: [
    mkItem("Ventilation / Aération suffisante"),
    mkItem("Éclairage (suffisant et fonctionnel)"),
    mkItem("Dégagement des allées de circulation"),
  ],
  locauxTechAdmin: [
    mkItem("Rangement et organisation des espaces"),
    mkItem("Propreté des sols"),
  ],
  securite: [
    mkItem("Extincteurs présents et accessibles", { nombre: "", dateVerif: "" }),
    mkItem("Date de vérification des extincteurs (≤ 1 an)"),
    mkItem("RIA (Robinet d'Incendie Armé) — accessible et fonctionnel"),
    mkItem("Bacs à sable disponibles et opérationnels"),
    mkItem("Escaliers de secours dégagés"),
    mkItem("Balisage lumineux de secours opérationnel"),
  ],
  urgenceSecourisme: [
    mkItem("Boîtes de secours présentes et contenu complet", { datePeremption: "" }),
    mkItem("Dates de péremption des produits respectées"),
    mkItem("Personnel secouriste présent / formé sur site"),
  ],
  synthese: { etatGeneral: "OUI", observation: "", scoreGlobal: null },
};

/* ═══════════════════════════════════════════════════════════════════════════
   CONFORMITE TOGGLE
═══════════════════════════════════════════════════════════════════════════ */
function ConformiteToggle({ value, onChange }: { value: Conformite; onChange: (v: Conformite) => void }) {
  const opts: { v: Conformite; label: string; icon: React.ReactNode; active: string; inactive: string }[] = [
    { v: "OUI", label: "OUI", icon: <CheckCircle2 className="w-3.5 h-3.5" />, active: "bg-emerald-600 text-white border-emerald-600", inactive: "border-border text-muted-foreground hover:border-emerald-400" },
    { v: "NON", label: "NON", icon: <XCircle className="w-3.5 h-3.5" />, active: "bg-red-600 text-white border-red-600", inactive: "border-border text-muted-foreground hover:border-red-400" },
    { v: "N/A", label: "N/A", icon: <MinusCircle className="w-3.5 h-3.5" />, active: "bg-gray-400 text-white border-gray-400", inactive: "border-border text-muted-foreground hover:border-gray-400" },
  ];
  return (
    <div className="flex gap-1">
      {opts.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)}
          className={cn("flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium transition-colors", value === o.v ? o.active : o.inactive)}>
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION PANEL
═══════════════════════════════════════════════════════════════════════════ */
function SectionPanel({
  title, emoji, items, onChange,
}: {
  title: string; emoji: string; items: CheckItem[];
  onChange: (i: number, field: keyof CheckItem, val: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const nonCount = items.filter((i) => i.presence === "NON").length;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-foreground" onClick={() => setOpen((v) => !v)}>
        <span className="flex items-center gap-2">
          <span>{emoji}</span>
          <span>{title}</span>
          {nonCount > 0 && (
            <span className="flex items-center gap-1 text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">
              <AlertTriangle className="w-3 h-3" />{nonCount} non conforme(s)
            </span>
          )}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border divide-y divide-border/50">
          {/* Column headers */}
          <div className="hidden md:grid md:grid-cols-[2fr_auto_2fr_2fr] gap-3 px-5 py-2 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <span>Désignation</span>
            <span className="text-center">Conformité</span>
            <span>Observations</span>
            <span>Recommandations</span>
          </div>

          {items.map((item, idx) => {
            const isNon = item.presence === "NON";
            return (
              <div key={idx} className={cn("px-5 py-3 grid md:grid-cols-[2fr_auto_2fr_2fr] gap-3 items-start", isNon ? "bg-red-50/40" : idx % 2 === 1 ? "bg-muted/10" : "")}>
                {/* Désignation */}
                <div className="flex flex-col gap-1">
                  <p className={cn("text-sm font-medium", isNon ? "text-red-700" : "text-foreground")}>{item.designation}</p>
                  {/* Extra fields */}
                  {item.nombre !== undefined && (
                    <input type="text" placeholder="Nombre" value={item.nombre ?? ""} onChange={(e) => onChange(idx, "nombre", e.target.value)}
                      className="mt-1 text-xs border border-border rounded-lg px-2 py-1 bg-background w-28 focus:outline-none focus:ring-1 focus:ring-primary/40" />
                  )}
                  {item.dateVerif !== undefined && (
                    <input type="date" value={item.dateVerif ?? ""} onChange={(e) => onChange(idx, "dateVerif", e.target.value)}
                      className="text-xs border border-border rounded-lg px-2 py-1 bg-background w-36 focus:outline-none focus:ring-1 focus:ring-primary/40" />
                  )}
                  {item.datePeremption !== undefined && (
                    <div>
                      <label className="text-xs text-muted-foreground">Date péremption</label>
                      <input type="date" value={item.datePeremption ?? ""} onChange={(e) => onChange(idx, "datePeremption", e.target.value)}
                        className="text-xs border border-border rounded-lg px-2 py-1 bg-background w-36 block mt-0.5 focus:outline-none focus:ring-1 focus:ring-primary/40" />
                    </div>
                  )}
                </div>

                {/* Conformité */}
                <div className="flex items-start pt-0.5">
                  <ConformiteToggle value={item.presence} onChange={(v) => onChange(idx, "presence", v)} />
                </div>

                {/* Observations */}
                <textarea
                  placeholder="État constaté…"
                  value={item.observations}
                  onChange={(e) => onChange(idx, "observations", e.target.value)}
                  rows={2}
                  className={cn("text-sm border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 bg-background w-full", isNon ? "border-red-200" : "border-border")}
                />

                {/* Recommandations */}
                <textarea
                  placeholder="Action corrective…"
                  value={item.recommandations}
                  onChange={(e) => onChange(idx, "recommandations", e.target.value)}
                  rows={2}
                  className={cn("text-sm border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 bg-background w-full", isNon ? "border-red-200 bg-red-50/20" : "border-border")}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function VisiteHygiene() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [data, setData] = useState<VisiteHygieneData>(structuredClone(DEFAULT_DATA));
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  /* ── Helpers ── */
  const updateSection = (
    section: keyof Pick<VisiteHygieneData, "sanitaires" | "locauxTravail" | "locauxTechAdmin" | "securite" | "urgenceSecourisme">,
    idx: number,
    field: keyof CheckItem,
    val: string
  ) => {
    setData((prev) => ({
      ...prev,
      [section]: prev[section].map((item, i) => i === idx ? { ...item, [field]: val } : item),
    }));
  };

  /* ── Score ── */
  const allItems = [...data.sanitaires, ...data.locauxTravail, ...data.locauxTechAdmin, ...data.securite, ...data.urgenceSecourisme];
  const conformeCount = allItems.filter((i) => i.presence === "OUI").length;
  const nonConformeCount = allItems.filter((i) => i.presence === "NON").length;
  const score = allItems.length > 0 ? Math.round((conformeCount / allItems.length) * 100) : 100;

  /* ── Generate Word ── */
  const generateWord = async () => {
    setGenerating(true);
    try {
      const blob = await generateHygieneWordBlob({ ...data, synthese: { ...data.synthese, scoreGlobal: score } });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `visite_hygiene_${data.site || "site"}_${data.dateVisite}.docx`;
      a.click(); URL.revokeObjectURL(url);
      toast({ title: "Rapport Word généré ✓" });
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur génération Word", variant: "destructive" });
    }
    setGenerating(false);
  };

  /* ── Save to DB ── */
  const saveToDb = async () => {
    if (!data.direction || !data.site) {
      toast({ title: "Direction et Site sont requis", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/hygiene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateVisite: data.dateVisite, direction: data.direction, site: data.site, data: JSON.stringify(data), scoreGlobal: score }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Visite enregistrée ✓", description: `Score: ${score}%` });
      navigate("/hygiene/historique");
    } catch {
      toast({ title: "Erreur d'enregistrement", variant: "destructive" });
    }
    setSaving(false);
  };

  const scoreColor = score >= 80 ? "text-emerald-600" : score >= 60 ? "text-orange-500" : "text-red-600";
  const scoreBg    = score >= 80 ? "bg-emerald-50 border-emerald-200" : score >= 60 ? "bg-orange-50 border-orange-200" : "bg-red-50 border-red-200";

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nouvelle Visite d'Hygiène</h1>
          <p className="text-muted-foreground text-sm mt-1">Remplissez la check-list, puis générez le rapport Word ou enregistrez la visite</p>
        </div>
        {/* Score badge */}
        <div className={cn("flex flex-col items-center px-5 py-3 rounded-xl border", scoreBg)}>
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Score global</span>
          <span className={cn("text-3xl font-bold", scoreColor)}>{score}%</span>
          <span className="text-xs text-muted-foreground">{conformeCount} conf. / {nonConformeCount} non conf.</span>
        </div>
      </div>

      {/* ── Informations Générales ── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" />Informations Générales
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Date de visite <span className="text-red-500">*</span></label>
            <input type="date" value={data.dateVisite} onChange={(e) => setData((p) => ({ ...p, dateVisite: e.target.value }))}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Direction <span className="text-red-500">*</span></label>
            <input type="text" placeholder="Ex: Direction Technique" value={data.direction} onChange={(e) => setData((p) => ({ ...p, direction: e.target.value }))}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Site visité <span className="text-red-500">*</span></label>
            <input type="text" placeholder="Ex: Atelier Mécanique" value={data.site} onChange={(e) => setData((p) => ({ ...p, site: e.target.value }))}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        </div>
      </div>

      {/* ── Sections ── */}
      <SectionPanel title="Sanitaires" emoji="🚿" items={data.sanitaires}
        onChange={(i, f, v) => updateSection("sanitaires", i, f, v)} />
      <SectionPanel title="Locaux de travail" emoji="🏭" items={data.locauxTravail}
        onChange={(i, f, v) => updateSection("locauxTravail", i, f, v)} />
      <SectionPanel title="Locaux Techniques & Administratifs" emoji="🗄" items={data.locauxTechAdmin}
        onChange={(i, f, v) => updateSection("locauxTechAdmin", i, f, v)} />
      <SectionPanel title="Sécurité & Lutte contre l'incendie" emoji="🔥" items={data.securite}
        onChange={(i, f, v) => updateSection("securite", i, f, v)} />
      <SectionPanel title="Situations d'Urgence & Secourisme" emoji="🚑" items={data.urgenceSecourisme}
        onChange={(i, f, v) => updateSection("urgenceSecourisme", i, f, v)} />

      {/* ── Synthèse ── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-sm font-semibold text-foreground mb-4">📋 Synthèse</p>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">État d'hygiène général</label>
            <ConformiteToggle value={data.synthese.etatGeneral} onChange={(v) => setData((p) => ({ ...p, synthese: { ...p.synthese, etatGeneral: v } }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Observation globale</label>
            <textarea value={data.synthese.observation} onChange={(e) => setData((p) => ({ ...p, synthese: { ...p.synthese, observation: e.target.value } }))}
              placeholder="Remarques générales sur la visite…"
              rows={3} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex flex-wrap gap-3 pb-8">
        <Button onClick={generateWord} disabled={generating} className="gap-2 bg-blue-600 hover:bg-blue-700">
          {generating ? <><Loader2 className="w-4 h-4 animate-spin" />Génération…</> : <><Download className="w-4 h-4" />Rapport Word (.docx)</>}
        </Button>
        <Button onClick={saveToDb} disabled={saving || !data.direction || !data.site} variant="outline" className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Enregistrement…</> : <><Save className="w-4 h-4" />Enregistrer la visite</>}
        </Button>
      </div>
    </div>
  );
}
