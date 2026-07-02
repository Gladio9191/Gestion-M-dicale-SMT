import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateVisite } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function VisiteHygiene() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createVisite = useCreateVisite();

  const [form, setForm] = useState({
    matricule: "",
    dateVisite: new Date().toISOString().slice(0, 10),
    typeVisite: "hygiene",
    motif: "",
    observations: "",
    decision: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.matricule || !form.dateVisite) {
      toast({ title: "Champs requis manquants", variant: "destructive" });
      return;
    }
    try {
      await createVisite.mutateAsync({
        matricule: form.matricule,
        data: {
          dateVisite: form.dateVisite,
          typeVisite: form.typeVisite,
          observations: form.observations || undefined,
          decisionAptitude: (form.decision as "APTE" | "INAPTE" | "APTE_SOUS_RESERVE") || undefined,
        },
      });
      await queryClient.invalidateQueries();
      toast({ title: "Visite d'hygiène enregistrée" });
      navigate("/hygiene/historique");
    } catch {
      toast({ title: "Erreur lors de l'enregistrement", variant: "destructive" });
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/hygiene/historique">
          <button className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Nouvelle visite d'hygiène</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Enregistrer une visite de contrôle d'hygiène</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-border card-shadow p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Matricule" required>
            <Input
              value={form.matricule}
              onChange={(e) => set("matricule", e.target.value)}
              placeholder="ex: 80022"
            />
          </Field>
          <Field label="Date de visite" required>
            <Input
              type="date"
              value={form.dateVisite}
              onChange={(e) => set("dateVisite", e.target.value)}
            />
          </Field>
        </div>

        <Field label="Motif">
          <Input
            value={form.motif}
            onChange={(e) => set("motif", e.target.value)}
            placeholder="Motif de la visite…"
          />
        </Field>

        <Field label="Observations">
          <textarea
            value={form.observations}
            onChange={(e) => set("observations", e.target.value)}
            placeholder="Observations cliniques…"
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </Field>

        <Field label="Décision d'aptitude">
          <select
            value={form.decision}
            onChange={(e) => set("decision", e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">— Sélectionner —</option>
            <option value="apte">Apte</option>
            <option value="apte_restriction">Apte avec restriction</option>
            <option value="inapte">Inapte</option>
          </select>
        </Field>

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={createVisite.isPending}
            className="bg-gradient-to-r from-[#00C9AF] to-[#5B5FD4] text-white border-0"
          >
            {createVisite.isPending ? "Enregistrement…" : "Enregistrer la visite"}
          </Button>
          <Link href="/hygiene/historique">
            <Button type="button" variant="outline">Annuler</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
