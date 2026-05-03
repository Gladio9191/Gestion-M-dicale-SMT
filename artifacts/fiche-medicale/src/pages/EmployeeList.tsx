import { useState } from "react";
import { Link } from "wouter";
import { useListEmployees, useListServices } from "@workspace/api-client-react";
import { Search, Plus, ChevronRight, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function EmployeeList() {
  const [search, setSearch] = useState("");
  const [service, setService] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 15;

  const { data, isLoading } = useListEmployees({
    search: search || undefined,
    service: service === "all" ? undefined : service,
    page,
    limit,
  });

  const { data: services } = useListServices();

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employés</h1>
          <p className="text-muted-foreground mt-1">
            {data ? `${data.total} employé${data.total !== 1 ? "s" : ""} enregistré${data.total !== 1 ? "s" : ""}` : "Chargement..."}
          </p>
        </div>
        <Link href="/employees/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nouvel employé
          </Button>
        </Link>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Nom, prénom ou matricule..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={service} onValueChange={(v) => { setService(v); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tous les services" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les services</SelectItem>
            {services?.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground">Chargement...</div>
        ) : data?.employees.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">Aucun employé trouvé</p>
            <p className="text-muted-foreground text-sm mt-1">
              {search || service !== "all" ? "Essayez de modifier les filtres." : "Commencez par ajouter un employé."}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Matricule</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Nom & Prénom</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Service</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Poste</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Âge</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data?.employees.map((emp) => (
                <tr key={emp.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{emp.matricule}</td>
                  <td className="px-4 py-3 font-medium">{emp.nom} {emp.prenom}</td>
                  <td className="px-4 py-3 text-muted-foreground">{emp.service ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{emp.posteActuel ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{emp.age ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Link href={`/employees/${emp.matricule}`} className="flex items-center justify-end text-primary hover:text-primary/80 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Page {page} sur {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              Précédent
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
