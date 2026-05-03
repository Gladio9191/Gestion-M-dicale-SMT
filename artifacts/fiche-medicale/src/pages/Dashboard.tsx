import { useGetStatsOverview, useGetStatsByService, useGetRecentVisites, useGetAptitudeStats } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Users, CalendarCheck, ShieldAlert, Layers, Clock, TrendingUp, ArrowUpRight, Activity } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
} from "recharts";

/* ── Decision config ──────────────────────────────────────────────────── */
const DECISION_CFG: Record<string, { label: string; color: string; bg: string }> = {
  APTE:             { label: "Apte",              color: "#059669", bg: "#ECFDF5" },
  INAPTE:           { label: "Inapte",            color: "#DC2626", bg: "#FEF2F2" },
  APTE_SOUS_RESERVE:{ label: "Apte sous réserve", color: "#D97706", bg: "#FFFBEB" },
};

/* ── Stat card ────────────────────────────────────────────────────────── */
function StatCard({
  label, value, sub, icon: Icon, color, bg, trend,
}: {
  label: string; value: number | string; sub?: string;
  icon: React.ElementType; color: string; bg: string; trend?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 card-shadow flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: bg }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {trend && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            <ArrowUpRight className="w-3 h-3" />{trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-[28px] font-bold text-slate-800 leading-none">{value}</p>
        <p className="text-[12px] font-medium text-slate-500 mt-1.5">{label}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Section header ───────────────────────────────────────────────────── */
function SectionHeader({ icon: Icon, title, color }: { icon: React.ElementType; title: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <h2 className="text-[13px] font-semibold text-slate-700">{title}</h2>
    </div>
  );
}

/* ── Custom tooltip ───────────────────────────────────────────────────── */
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-[12px]">
      <p className="font-semibold text-slate-700">{label}</p>
      <p className="text-blue-600 font-bold mt-0.5">{payload[0].value} employés</p>
    </div>
  );
}

/* ── Dashboard ────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { data: overview }       = useGetStatsOverview();
  const { data: byService }      = useGetStatsByService();
  const { data: recentVisites }  = useGetRecentVisites({ limit: 8 });
  const { data: aptitudeStats }  = useGetAptitudeStats();

  const STAT_CARDS = [
    { label: "Employés suivis",      value: overview?.totalEmployees ?? "—",    icon: Users,         color: "#2563EB", bg: "#EFF6FF" },
    { label: "Visites cette année",  value: overview?.visitesThisYear ?? "—",   icon: CalendarCheck, color: "#059669", bg: "#ECFDF5", trend: "+0%" },
    { label: "Total visites",        value: overview?.totalVisites ?? "—",       icon: Clock,         color: "#7C3AED", bg: "#F5F3FF", sub: "Depuis le début" },
    { label: "Inaptes",              value: overview?.inapteCount ?? "—",        icon: ShieldAlert,   color: "#DC2626", bg: "#FEF2F2" },
    { label: "Restrictions actives", value: overview?.restrictionsCount ?? "—", icon: Activity,      color: "#D97706", bg: "#FFFBEB" },
    { label: "Services",             value: overview?.servicesCount ?? "—",      icon: Layers,        color: "#0891B2", bg: "#F0F9FF" },
  ];

  /* Radial data for aptitude */
  const totalApt = aptitudeStats?.reduce((s, x) => s + x.count, 0) ?? 0;
  const radialData = aptitudeStats?.map(s => ({
    ...s,
    pct: totalApt > 0 ? Math.round((s.count / totalApt) * 100) : 0,
    fill: DECISION_CFG[s.decision]?.color ?? "#94a3b8",
  }));

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-[22px] font-bold text-slate-800 tracking-tight">Tableau de bord</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Vue d'ensemble de l'activité médicale</p>
        </div>
        <Link
          href="/employees/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-[13px] font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
        >
          <Users className="w-4 h-4" />
          Nouvel Agent
        </Link>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {STAT_CARDS.map(c => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      {/* ── Charts row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Bar chart — Employés par service */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 card-shadow">
          <SectionHeader icon={TrendingUp} title="Employés par service" color="#2563EB" />
          {byService && byService.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byService} margin={{ top: 0, right: 4, left: -16, bottom: 0 }} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="service"
                  tick={{ fontSize: 11, fill: "#94A3B8", fontFamily: "Inter" }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#CBD5E1", fontFamily: "Inter" }}
                  axisLine={false} tickLine={false} allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
                <Bar dataKey="count" fill="#2563EB" radius={[8, 8, 0, 0]} name="Employés" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-slate-400 text-[13px]">
              Aucune donnée disponible
            </div>
          )}
        </div>

        {/* Donut — Décisions d'aptitude */}
        <div className="bg-white rounded-2xl p-6 card-shadow">
          <SectionHeader icon={Activity} title="Décisions d'aptitude" color="#7C3AED" />
          {aptitudeStats && aptitudeStats.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={aptitudeStats}
                    dataKey="count"
                    nameKey="decision"
                    cx="50%" cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    strokeWidth={0}
                    paddingAngle={3}
                  >
                    {aptitudeStats.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={DECISION_CFG[entry.decision]?.color ?? "#94a3b8"}
                        cornerRadius={4}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, n) => [v, DECISION_CFG[n as string]?.label ?? n]}
                    contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {aptitudeStats.map((s, i) => {
                  const cfg = DECISION_CFG[s.decision] ?? { label: s.decision, color: "#94a3b8", bg: "#F8FAFC" };
                  const pct = totalApt > 0 ? Math.round((s.count / totalApt) * 100) : 0;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                      <span className="text-[12px] text-slate-600 flex-1">{cfg.label}</span>
                      <span className="text-[12px] font-bold text-slate-800">{s.count}</span>
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: cfg.bg, color: cfg.color }}
                      >{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="h-52 flex items-center justify-center text-slate-400 text-[13px]">
              Aucune visite enregistrée
            </div>
          )}
        </div>
      </div>

      {/* ── Recent visits table ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl card-shadow overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <SectionHeader icon={Clock} title="Visites récentes" color="#0891B2" />
        </div>
        {recentVisites && recentVisites.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {["Matricule", "Nom", "Service", "Date", "Décision"].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentVisites.map((v) => {
                const cfg = v.decisionAptitude ? (DECISION_CFG[v.decisionAptitude] ?? null) : null;
                return (
                  <tr key={v.id} className="table-row-hover border-b border-slate-50 last:border-0">
                    <td className="px-6 py-4 font-mono text-[12px] text-slate-400">{v.matricule}</td>
                    <td className="px-6 py-4">
                      <Link href={`/employees/${v.matricule}`} className="text-[13px] font-semibold text-slate-800 hover:text-blue-600 transition-colors">
                        {v.nomPrenom}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-[13px] text-slate-500">{v.service ?? "—"}</td>
                    <td className="px-6 py-4 text-[13px] text-slate-500 font-mono">{v.dateVisite}</td>
                    <td className="px-6 py-4">
                      {cfg ? (
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
                          style={{ backgroundColor: cfg.bg, color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-[13px]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="py-16 text-center text-slate-400 text-[13px]">
            Aucune visite enregistrée
          </div>
        )}
      </div>
    </div>
  );
}
