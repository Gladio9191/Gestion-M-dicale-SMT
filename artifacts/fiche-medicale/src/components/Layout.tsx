import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity, Users, FileUp, ClipboardList, FileText,
  ShieldCheck, History, FlaskConical, Plus, CalendarCheck,
  BarChart2, Home, Bell, Settings, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import TopBar from "@/components/TopBar";

/* ── Nav data ─────────────────────────────────────────────────── */
type NavItem = { href: string; label: string; icon: React.ElementType; exact?: boolean };

const MENU_ITEMS: NavItem[] = [
  { href: "/",                   label: "Tableau de bord",    icon: Home,          exact: true },
  { href: "/employees",          label: "Personnel",          icon: Users },
  { href: "/registre",           label: "Registre Activités", icon: ClipboardList },
  { href: "/generer",            label: "Générer Fiches",     icon: FileText },
  { href: "/import",             label: "Import Excel",       icon: FileUp },
  { href: "/employees/new",      label: "Nouvel Agent",       icon: Plus },
  { href: "/expertises",         label: "Expertises",         icon: FlaskConical },
  { href: "/hygiene/new",        label: "Visite Hygiène",     icon: ShieldCheck },
  { href: "/hygiene/historique", label: "Historique",         icon: History },
  { href: "/evaluation",         label: "Éval. Objectifs",    icon: BarChart2 },
];

const TOP_CONFIG: NavItem[] = [
  { href: "/pointage", label: "Pointage",     icon: CalendarCheck },
  { href: "#",         label: "Notifications",icon: Bell },
];

const MONTHS_FR = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];
const DAY_NAMES = ["D","L","M","M","J","V","S"];

/* ── Live time ────────────────────────────────────────────────── */
function useLiveTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
const pad = (n: number) => String(n).padStart(2, "0");

/* ── Jelly glassmorphism separator ───────────────────────────── */
function JellySep() {
  return (
    <div className="px-3 py-1.5">
      <div
        className="h-[2px] w-full rounded-full"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 30%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0.35) 70%, transparent 100%)",
          boxShadow: "0 0 8px rgba(255,255,255,0.25), 0 0 2px rgba(255,255,255,0.4)",
          backdropFilter: "blur(4px)",
        }}
      />
    </div>
  );
}

/* ── Clock widget ─────────────────────────────────────────────── */
function ClockWidget({ now }: { now: Date }) {
  return (
    <div
      className="mx-3 rounded-2xl px-3 py-2.5 flex items-baseline justify-center gap-0.5 select-none cursor-default transition-all duration-300 hover:scale-[1.03]"
      style={{
        background: "rgba(255,255,255,0.10)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.20)",
        border: "1px solid rgba(255,255,255,0.15)",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 8px 28px rgba(0,0,0,0.15), 0 0 20px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.25)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 4px 16px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.20)";
      }}
    >
      <span className="font-mono text-[22px] font-extrabold text-white tracking-tight leading-none">
        {pad(now.getHours())}
      </span>
      <span className="font-mono text-[16px] font-bold text-white/35 mx-0.5 animate-pulse leading-none">:</span>
      <span className="font-mono text-[22px] font-extrabold text-white tracking-tight leading-none">
        {pad(now.getMinutes())}
      </span>
      <span className="font-mono text-[16px] font-bold text-white/35 mx-0.5 animate-pulse leading-none">:</span>
      <span className="font-mono text-[22px] font-extrabold text-white/45 tracking-tight leading-none">
        {pad(now.getSeconds())}
      </span>
    </div>
  );
}

/* ── Calendar widget ──────────────────────────────────────────── */
function CalendarWidget() {
  const today = new Date();
  const [cur, setCur] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const firstDow    = new Date(cur.y, cur.m, 1).getDay();
  const daysInMonth = new Date(cur.y, cur.m + 1, 0).getDate();
  const prevTotal   = new Date(cur.y, cur.m, 0).getDate();

  const cells: { day: number; kind: "prev"|"cur"|"next" }[] = [];
  for (let i = firstDow - 1; i >= 0; i--)
    cells.push({ day: prevTotal - i, kind: "prev" });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, kind: "cur" });
  while (cells.length % 7 !== 0)
    cells.push({ day: cells.length - daysInMonth - firstDow + 1, kind: "next" });

  const isToday = (d: number, k: string) =>
    k === "cur" && d === today.getDate() &&
    cur.m === today.getMonth() && cur.y === today.getFullYear();

  const prev = () => setCur(c => c.m === 0  ? { y: c.y-1, m: 11 } : { y: c.y, m: c.m-1 });
  const next = () => setCur(c => c.m === 11 ? { y: c.y+1, m: 0  } : { y: c.y, m: c.m+1 });

  return (
    <div
      className="mx-3 mb-3 rounded-2xl px-2.5 pt-2.5 pb-2 select-none transition-all duration-300 hover:scale-[1.02]"
      style={{
        background: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.18)",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 8px 28px rgba(0,0,0,0.15), 0 0 18px rgba(255,255,255,0.10), inset 0 1px 0 rgba(255,255,255,0.22)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 4px 16px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.18)";
      }}
    >
      {/* Month nav */}
      <div className="flex items-center justify-between mb-1.5">
        <button onClick={prev} className="w-5 h-5 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/25 transition-colors">
          <ChevronLeft className="w-3 h-3 text-white/70" />
        </button>
        <span className="text-[10px] font-bold text-white/85 tracking-tight">
          {MONTHS_FR[cur.m]} {cur.y}
        </span>
        <button onClick={next} className="w-5 h-5 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/25 transition-colors">
          <ChevronRight className="w-3 h-3 text-white/70" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7">
        {DAY_NAMES.map((d, i) => (
          <div key={i} className="text-center text-[8.5px] font-bold text-white/35 leading-4">{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-y-0.5 mt-0.5">
        {cells.map((c, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center justify-center h-[19px] rounded-full text-[9.5px] font-medium leading-none transition-colors",
              c.kind !== "cur" && "text-white/18",
              c.kind === "cur" && !isToday(c.day, c.kind) &&
                "text-white/65 hover:bg-white/15 hover:text-white cursor-pointer",
              isToday(c.day, c.kind) &&
                "bg-white text-[#1a7fcc] font-extrabold shadow-sm",
            )}
          >
            {c.day}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Nav link ─────────────────────────────────────────────────── */
function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12.5px] font-medium w-full transition-all duration-200 group relative",
        active
          ? "bg-white/20 text-white shadow-sm"
          : "text-white/60 hover:bg-white/10 hover:text-white"
      )}
    >
      <Icon className={cn(
        "w-[16px] h-[16px] shrink-0 transition-colors",
        active ? "text-white" : "text-white/50 group-hover:text-white/80"
      )} />
      <span className="flex-1 truncate">{item.label}</span>
      {active && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
    </Link>
  );
}

/* ── Layout ───────────────────────────────────────────────────── */
export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const now = useLiveTime();

  const isActive = (href: string, exact?: boolean) =>
    exact ? location === href : location === href || location.startsWith(href + "/");

  return (
    <div className="min-h-screen flex bg-[#F0F2F8]">

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside
        className="w-[210px] shrink-0 flex flex-col z-10 overflow-hidden"
        style={{ background: "linear-gradient(160deg, #00C9AF 0%, #1a7fcc 50%, #5B5FD4 100%)" }}
      >
        {/* Logo */}
        <div className="px-4 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-sm shrink-0">
              <Activity className="w-[18px] h-[18px] text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-extrabold text-white leading-tight tracking-tight truncate">MY SERVICE</p>
              <p className="text-[10px] text-white/60 italic mt-0.5 truncate">In my pocket</p>
            </div>
          </div>
        </div>

        <div className="mx-4 border-t border-white/15 mb-2 shrink-0" />

        {/* Scrollable nav + clock + calendar */}
        <div className="flex-1 overflow-y-auto px-3 min-h-0 py-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/35 px-2 mb-1.5">Menu</p>
          <nav className="space-y-0.5">
            {MENU_ITEMS.map(item => (
              <NavLink key={item.href} item={item} active={isActive(item.href, item.exact)} />
            ))}
          </nav>

          <div className="mx-2 border-t border-white/15 my-3" />

          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/35 px-2 mb-1.5">Configuration</p>
          <nav className="space-y-0.5 mb-3">
            {TOP_CONFIG.map(item => (
              <NavLink key={item.label} item={item} active={isActive(item.href, item.exact)} />
            ))}
          </nav>

          {/* Jelly separator */}
          <JellySep />

          {/* Clock widget */}
          <div className="mt-1">
            <ClockWidget now={now} />
          </div>

          {/* Jelly separator */}
          <JellySep />

          {/* Calendar widget */}
          <CalendarWidget />
        </div>

        {/* ── Paramètres — pinned alone at very bottom ── */}
        <div className="shrink-0 px-3 pb-3 pt-1">
          <JellySep />
          <div className="mt-1">
            <NavLink
              item={{ href: "#", label: "Paramètres", icon: Settings }}
              active={false}
            />
          </div>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
