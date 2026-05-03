import {
  useGetStatsOverview, useGetStatsByService,
  useGetRecentVisites, useGetAptitudeStats,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import {
  Users, CalendarCheck, Clock, ShieldAlert, Activity, Layers, MoreHorizontal,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";

/* ═══ Colors ═════════════════════════════════════════════════════════ */
const BLUE   = "#2563EB";
const TEAL   = "#14B8A6";
const PURPLE = "#6366F1";
const AMBER  = "#F59E0B";
const GREEN  = "#10B981";
const PINK   = "#EC4899";

const DECISION_CFG: Record<string, { label: string; color: string; bg: string }> = {
  APTE:              { label: "Apte",              color: GREEN,  bg: "#ECFDF5" },
  INAPTE:            { label: "Inapte",            color: "#EF4444", bg: "#FEF2F2" },
  APTE_SOUS_RESERVE: { label: "Sous réserve",     color: AMBER,  bg: "#FFFBEB" },
};

/* ═══ Mini ring SVG (like CLEARIQ stat card) ═════════════════════════ */
function MiniRing({ pct, color }: { pct: number; color: string }) {
  const r    = 22;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(pct / 100, 1) * circ;
  return (
    <svg width="58" height="58" viewBox="0 0 58 58">
      <circle cx="29" cy="29" r={r} fill="none" stroke="#EEF2FF" strokeWidth="6" />
      <circle
        cx="29" cy="29" r={r}
        fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 29 29)"
      />
      <text x="29" y="33" textAnchor="middle"
        fontSize="11" fontWeight="800" fill={color} fontFamily="Inter,sans-serif">
        {pct}%
      </text>
    </svg>
  );
}

/* ═══ Stat card — CLEARIQ style ══════════════════════════════════════ */
function StatCard({
  label, value, sub, ringPct, ringColor, trend, trendUp,
}: {
  label: string; value: number | string; sub?: string;
  ringPct: number; ringColor: string;
  trend?: string; trendUp?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 card-shadow flex flex-col justify-between min-h-[130px]">
      <div className="flex items-start justify-between">
        <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <MiniRing pct={ringPct} color={ringColor} />
      </div>
      <div>
        <p className="text-[32px] font-extrabold text-slate-800 leading-none mb-1">{value}</p>
        <div className="flex items-center gap-2">
          {trend && (
            <span className={`text-[11px] font-bold ${trendUp ? "text-green-500" : "text-red-400"}`}>
              {trendUp ? "▲" : "▼"} {trend}
            </span>
          )}
          {sub && <span className="text-[11px] text-slate-400">{sub}</span>}
        </div>
      </div>
    </div>
  );
}

/* ═══ Bubble chart — Income Analysis style ═══════════════════════════ */
function BubbleChart({ data }: { data: { label: string; count: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return (
    <div className="h-48 flex items-center justify-center text-slate-400 text-[13px]">
      Aucune donnée
    </div>
  );

  const sizes = [120, 88, 68];
  return (
    <div className="relative h-48 flex items-center justify-center">
      {data.slice(0, 3).map((d, i) => {
        const sz  = sizes[i] ?? 60;
        const pct = Math.round((d.count / total) * 100);
        const offsets = [
          { top: "30%", left: "12%" },
          { top: "8%",  left: "42%" },
          { top: "38%", left: "55%" },
        ];
        return (
          <div
            key={d.label}
            className="absolute flex flex-col items-center justify-center rounded-full text-white font-bold shadow-lg"
            style={{
              width: sz, height: sz,
              backgroundColor: d.color,
              ...offsets[i],
              boxShadow: `0 8px 24px ${d.color}44`,
            }}
          >
            <span className="text-[18px] font-extrabold leading-none">{pct}</span>
            <span className="text-[9px] font-semibold opacity-90 mt-0.5 text-center px-1 leading-tight">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ═══ Dashboard ══════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { data: overview }      = useGetStatsOverview();
  const { data: byService }     = useGetStatsByService();
  const { data: recentVisites } = useGetRecentVisites({ limit: 6 });
  const { data: aptitudeStats } = useGetAptitudeStats();

  const totalVisites = overview?.totalVisites ?? 0;

  const STATS = [
    { label: "Nouveaux Agents",    value: overview?.totalEmployees ?? "—",     ringPct: 10, ringColor: BLUE,   trend: "0%",  trendUp: true,  sub: "Ce mois" },
    { label: "Total Agents",       value: overview?.totalEmployees ?? "—",     ringPct: 20, ringColor: TEAL,   trend: "0%",  trendUp: true,  sub: "Ce mois" },
    { label: "Total Visites",      value: totalVisites,                        ringPct: 20, ringColor: PURPLE, trend: "0%",  trendUp: true,  sub: "Depuis le début" },
    { label: "Restrictions",       value: overview?.restrictionsCount ?? "—",  ringPct: 20, ringColor: AMBER,  trend: "0%",  trendUp: false, sub: "Ce mois" },
  ];

  /* Bubble data from aptitude stats */
  const bubbleColors = [BLUE, TEAL, GREEN];
  const bubbleData = (aptitudeStats ?? []).slice(0, 3).map((s, i) => ({
    label: DECISION_CFG[s.decision]?.label ?? s.decision,
    count: s.count,
    color: bubbleColors[i],
  }));

  /* Donut data */
  const totalApt = aptitudeStats?.reduce((s, x) => s + x.count, 0) ?? 0;

  return (
    <div className="p-6 max-w-[1380px] mx-auto space-y-6">

      {/* ── 4 stat cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* ── Row: Pill bar chart + Income Analysis bubble ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Pill bar chart — Visites par service */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 card-shadow">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-bold text-slate-800">Agents par Service</h2>
            <button className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <MoreHorizontal className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          {byService && byService.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byService} barSize={18} margin={{ top:0, right:4, left:-16, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F4FF" vertical={false} />
                <XAxis dataKey="service" tick={{ fontSize:11, fill:"#94A3B8", fontFamily:"Inter" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:"#CBD5E1", fontFamily:"Inter" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize:12, borderRadius:12, border:"1px solid #EEF2FF", boxShadow:"0 8px 24px rgba(99,130,255,.15)", fontFamily:"Inter" }}
                  cursor={{ fill:"#F0F4FF", radius:8 }}
                />
                <Bar dataKey="count" name="Agents" radius={[12,12,12,12]} fill={BLUE} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-slate-400 text-[13px]">Aucune donnée</div>
          )}
        </div>

        {/* Bubble chart — Analyse aptitude */}
        <div className="bg-white rounded-2xl p-6 card-shadow">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[15px] font-bold text-slate-800">Analyse Aptitude</h2>
            <button className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <MoreHorizontal className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <BubbleChart data={bubbleData} />
          {/* Legend */}
          <div className="mt-3 space-y-1.5">
            {bubbleData.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-[12px] text-slate-500 flex-1">{d.label}</span>
                <span className="text-[12px] font-bold text-slate-700">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row: Donut structure + Performance table ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Donut — Structure médicale */}
        <div className="bg-white rounded-2xl p-6 card-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-bold text-slate-800">Structure Médicale</h2>
            <button className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <MoreHorizontal className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          {aptitudeStats && aptitudeStats.length > 0 ? (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={aptitudeStats}
                      dataKey="count"
                      nameKey="decision"
                      cx="50%" cy="50%"
                      innerRadius={52} outerRadius={72}
                      strokeWidth={0} paddingAngle={4}
                    >
                      {aptitudeStats.map((_, i) => (
                        <Cell key={i} fill={[TEAL, "#EF4444", AMBER][i % 3]} cornerRadius={6} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v, n) => [v, DECISION_CFG[n as string]?.label ?? n]}
                      contentStyle={{ fontSize:12, borderRadius:12, border:"1px solid #EEF2FF" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[11px] font-semibold text-slate-400">Total</span>
                  <span className="text-[20px] font-extrabold text-slate-800">{totalApt > 0 ? "100%" : "—"}</span>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {aptitudeStats.map((s, i) => {
                  const cfg = DECISION_CFG[s.decision] ?? { label: s.decision, color: "#94a3b8" };
                  const pct = totalApt > 0 ? Math.round((s.count / totalApt) * 100) : 0;
                  const barColor = [TEAL, "#EF4444", AMBER][i % 3];
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] text-slate-600 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: barColor }} />
                          {cfg.label}
                        </span>
                        <span className="text-[12px] font-bold text-slate-700">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width:`${pct}%`, backgroundColor: barColor }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-[13px]">Aucune visite</div>
          )}
        </div>

        {/* Performance table — Activités récentes */}
        <div className="lg:col-span-2 bg-white rounded-2xl card-shadow overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
            <h2 className="text-[15px] font-bold text-slate-800">Activités Récentes</h2>
            <button className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <MoreHorizontal className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          {recentVisites && recentVisites.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr>
                  {["Nom", "Service", "Date", "Décision", "Action"].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentVisites.map((v) => {
                  const cfg = v.decisionAptitude ? (DECISION_CFG[v.decisionAptitude] ?? null) : null;
                  const initials = (v.nomPrenom ?? "?").split(" ").map((w: string) => w[0]).join("").slice(0,2).toUpperCase();
                  const avatarColors = [BLUE, TEAL, PURPLE, PINK, AMBER, GREEN];
                  const avatarColor  = avatarColors[v.id % avatarColors.length] ?? BLUE;
                  return (
                    <tr key={v.id} className="table-row-hover border-b border-slate-50 last:border-0">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-extrabold text-white shrink-0"
                            style={{ backgroundColor: avatarColor }}
                          >
                            {initials}
                          </div>
                          <div>
                            <Link href={`/employees/${v.matricule}`} className="text-[13px] font-semibold text-slate-800 hover:text-[#2563EB] transition-colors">
                              {v.nomPrenom}
                            </Link>
                            <p className="text-[10px] text-slate-400">{v.matricule}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-[12px] text-slate-500">{v.service ?? "—"}</td>
                      <td className="px-6 py-3.5 text-[12px] font-mono text-slate-500">{v.dateVisite}</td>
                      <td className="px-6 py-3.5">
                        {cfg ? (
                          <span
                            className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide"
                            style={{ backgroundColor: cfg.bg, color: cfg.color }}
                          >
                            {cfg.label}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-6 py-3.5">
                        <Link
                          href={`/employees/${v.matricule}`}
                          className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2563EB] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Voir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-16 text-center text-slate-400 text-[13px]">Aucune activité enregistrée</div>
          )}
        </div>
      </div>
    </div>
  );
}
