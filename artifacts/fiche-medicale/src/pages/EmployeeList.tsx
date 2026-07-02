import { useState } from "react";
import { Link } from "wouter";
import { useListEmployees } from "@workspace/api-client-react";
import type { Employee } from "@workspace/api-client-react";
import { Search, Plus, ChevronRight, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SERVICE_COLORS: Record<string, string> = {
  "Médecine": "bg-teal-100 text-teal-700",
  "Infirmerie": "bg-blue-100 text-blue-700",
  "RH": "bg-purple-100 text-purple-700",
  "Technique": "bg-orange-100 text-orange-700",
  "Administratif": "bg-pink-100 text-pink-700",
};

function ServiceBadge({ service }: { service: string | null | undefined }) {
  const s = service ?? "—";
  const cls = SERVICE_COLORS[s] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {s}
    </span>
  );
}

export default function EmployeeList() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = useListEmployees();

  const employees: Employee[] = data?.employees ?? [];

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    return (
      !q ||
      e.matricule.toLowerCase().includes(q) ||
      `${e.nom} ${e.prenom}`.toLowerCase().includes(q) ||
      (e.service ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Personnel</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {employees.length} employé{employees.length !== 1 ? "s" : ""} enregistré
            {employees.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/employees/new">
          <Button className="gap-2 bg-gradient-to-r from-[#00C9AF] to-[#5B5FD4] text-white border-0 shadow-md hover:opacity-90">
            <Plus size={16} />
            Nouvel employé
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par matricule, nom, service…"
          className="pl-9"
        />
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-border card-shadow overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
            Chargement…
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center py-20 text-destructive text-sm">
            Erreur de chargement des données.
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <User size={36} className="opacity-30" />
            <p className="text-sm">
              {search
                ? `Aucun résultat pour « ${search} »`
                : "Aucun employé enregistré."}
            </p>
            {!search && (
              <Link href="/employees/new">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Plus size={14} /> Ajouter le premier employé
                </Button>
              </Link>
            )}
          </div>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Matricule</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Nom complet</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Service</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground hidden md:table-cell">Poste</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp, i) => (
                <tr
                  key={emp.matricule}
                  className={`table-row-hover border-b last:border-0 border-border ${
                    i % 2 === 0 ? "" : "bg-muted/20"
                  }`}
                >
                  <td className="px-5 py-3 font-mono font-semibold text-primary">
                    {emp.matricule}
                  </td>
                  <td className="px-5 py-3 font-medium text-foreground">
                    {emp.nom} {emp.prenom}
                  </td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    <ServiceBadge service={emp.service} />
                  </td>
                  <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">
                    {emp.posteActuel ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/employees/${emp.matricule}`}>
                      <button className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-primary transition-colors">
                        <ChevronRight size={16} />
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
