import { useGetStatsOverview, useGetStatsByService, useGetRecentVisites, useGetAptitudeStats } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Users, CalendarCheck, ShieldAlert, Layers, Clock, TrendingUp } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";

const APTITUDE_COLORS: Record<string, string> = {
  APTE: "#0d9488",
  INAPTE: "#ef4444",
  APTE_SOUS_RESERVE: "#f59e0b",
};

const APTITUDE_LABELS: Record<string, string> = {
  APTE: "Apte",
  INAPTE: "Inapte",
  APTE_SOUS_RESERVE: "Apte sous réserve",
};

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  sub?: string;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-accent-foreground" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: overview } = useGetStatsOverview();
  const { data: byService } = useGetStatsByService();
  const { data: recentVisites } = useGetRecentVisites({ limit: 8 });
  const { data: aptitudeStats } = useGetAptitudeStats();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">Vue d'ensemble de l'activité médicale</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Employés suivis" value={overview?.totalEmployees ?? "—"} icon={Users} />
        <StatCard label="Visites cette année" value={overview?.visitesThisYear ?? "—"} icon={CalendarCheck} />
        <StatCard label="Total visites" value={overview?.totalVisites ?? "—"} icon={Clock} sub="Depuis le début" />
        <StatCard label="Inaptes" value={overview?.inapteCount ?? "—"} icon={ShieldAlert} />
        <StatCard label="Restrictions actives" value={overview?.restrictionsCount ?? "—"} icon={ShieldAlert} />
        <StatCard label="Services" value={overview?.servicesCount ?? "—"} icon={Layers} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-card border border-card-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Employés par service
          </h2>
          {byService && byService.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byService} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="service" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(160 15% 85%)" }}
                />
                <Bar dataKey="count" fill="hsl(180 75% 25%)" radius={[4, 4, 0, 0]} name="Employés" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
              Aucune donnée disponible
            </div>
          )}
        </div>

        <div className="bg-card border border-card-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Décisions d'aptitude</h2>
          {aptitudeStats && aptitudeStats.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={aptitudeStats}
                    dataKey="count"
                    nameKey="decision"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                  >
                    {aptitudeStats.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={APTITUDE_COLORS[entry.decision] ?? "#94a3b8"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, n) => [v, APTITUDE_LABELS[n as string] ?? n]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {aptitudeStats.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: APTITUDE_COLORS[s.decision] ?? "#94a3b8" }}
                      />
                      <span className="text-muted-foreground">
                        {APTITUDE_LABELS[s.decision] ?? s.decision}
                      </span>
                    </div>
                    <span className="font-medium text-foreground">{s.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
              Aucune visite enregistrée
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Visites récentes
        </h2>
        {recentVisites && recentVisites.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground">Matricule</th>
                <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground">Nom</th>
                <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground">Service</th>
                <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground">Date</th>
                <th className="text-left py-2 text-xs font-semibold text-muted-foreground">Décision</th>
              </tr>
            </thead>
            <tbody>
              {recentVisites.map((v) => (
                <tr key={v.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">{v.matricule}</td>
                  <td className="py-2.5 pr-4">
                    <Link href={`/employees/${v.matricule}`} className="font-medium text-primary hover:underline">
                      {v.nomPrenom}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{v.service ?? "—"}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{v.dateVisite}</td>
                  <td className="py-2.5">
                    {v.decisionAptitude ? (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          background: `${APTITUDE_COLORS[v.decisionAptitude]}22`,
                          color: APTITUDE_COLORS[v.decisionAptitude],
                        }}
                      >
                        {APTITUDE_LABELS[v.decisionAptitude] ?? v.decisionAptitude}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-12 text-center text-muted-foreground text-sm">
            Aucune visite enregistrée
          </div>
        )}
      </div>
    </div>
  );
}
