import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateEmployee } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListEmployeesQueryKey } from "@workspace/api-client-react";
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

export default function NewEmployee() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createEmployee = useCreateEmployee();

  const [form, setForm] = useState({
    matricule: "",
    nom: "",
    prenom: "",
    dateNaissance: "",
    dateEmbauche: "",
    service: "",
    posteActuel: "",
    anamnese: "",
    decisionsImportantes: "",
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.matricule || !form.nom || !form.prenom) {
      toast({ title: "Champs requis manquants", variant: "destructive" });
      return;
    }
    createEmployee.mutate(
      {
        data: {
          matricule: form.matricule,
          nom: form.nom,
          prenom: form.prenom,
          dateNaissance: form.dateNaissance || null,
          dateEmbauche: form.dateEmbauche || null,
          service: form.service || null,
          posteActuel: form.posteActuel || null,
          anamnese: form.anamnese || null,
          decisionsImportantes: form.decisionsImportantes || null,
        },
      },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
          toast({ title: "Employé créé avec succès" });
          navigate(`/employees/${data.matricule}`);
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : "Erreur lors de la création";
          toast({ title: msg, variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link href="/employees">
        <a className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Retour à la liste
        </a>
      </Link>

      <h1 className="text-2xl font-bold text-foreground mb-8">Nouvel employé</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card border border-card-border rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Identification</h2>
          <Field label="Matricule" required>
            <Input placeholder="MAT-2024-001" value={form.matricule} onChange={set("matricule")} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nom" required>
              <Input placeholder="Nom de famille" value={form.nom} onChange={set("nom")} />
            </Field>
            <Field label="Prénom" required>
              <Input placeholder="Prénom" value={form.prenom} onChange={set("prenom")} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date de naissance">
              <Input type="date" value={form.dateNaissance} onChange={set("dateNaissance")} />
            </Field>
            <Field label="Date d'embauche">
              <Input type="date" value={form.dateEmbauche} onChange={set("dateEmbauche")} />
            </Field>
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Poste</h2>
          <Field label="Service">
            <Input placeholder="Ex: Production, RH, Finance..." value={form.service} onChange={set("service")} />
          </Field>
          <Field label="Poste de travail actuel">
            <Input placeholder="Intitulé du poste" value={form.posteActuel} onChange={set("posteActuel")} />
          </Field>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Informations médicales initiales</h2>
          <Field label="Anamnèse">
            <textarea
              className="w-full min-h-24 px-3 py-2 text-sm bg-background border border-input rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Antécédents médicaux généraux..."
              value={form.anamnese}
              onChange={set("anamnese")}
            />
          </Field>
          <Field label="Décisions importantes">
            <textarea
              className="w-full min-h-20 px-3 py-2 text-sm bg-background border border-input rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Décisions médicales importantes..."
              value={form.decisionsImportantes}
              onChange={set("decisionsImportantes")}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/employees">
            <Button type="button" variant="outline">Annuler</Button>
          </Link>
          <Button type="submit" disabled={createEmployee.isPending}>
            {createEmployee.isPending ? "Création..." : "Créer l'employé"}
          </Button>
        </div>
      </form>
    </div>
  );
}
