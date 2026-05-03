import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity, Users, FileUp, ClipboardList, FileText,
  ShieldCheck, History, FlaskConical, Plus, CalendarCheck,
  BarChart2, Home, User, Bell, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import TopBar from "@/components/TopBar";

/* ── Types ──────────────────────────────────────────────────────── */
type NavItem = { href: string; label: string; icon: React.ElementType; exact?: boolean };

const MENU_ITEMS: NavItem[] = [
  { href: "/",                    label: "Tableau de bord",    icon: Home,          exact: true },
  { href: "/employees",           label: "Personnel",          icon: Users },
  { href: "/registre",            label: "Registre Activités", icon: ClipboardList },
  { href: "/generer",             label: "Générer Fiches",     icon: FileText },
  { href: "/import",              label: "Import Excel",       icon: FileUp },
  { href: "/employees/new",       label: "Nouvel Agent",       icon: Plus },
  { href: "/expertises",          label: "Expertises",         icon: FlaskConical },
  { href: "/hygiene/new",         label: "Visite Hygiène",     icon: ShieldCheck },
  { href: "/hygiene/historique",  label: "Historique",         icon: History },
  { href: "/evaluation",          label: "Éval. Objectifs",    icon: BarChart2 },
];

const ACCOUNT_ITEMS: NavItem[] = [
  { href: "/pointage", label: "Pointage",      icon: CalendarCheck },
  { href: "#",         label: "Notifications", icon: Bell },
  { href: "#",         label: "Profil",        icon: User },
];

const DAY_NAMES = ["D","L","M","M","J","V","S"];
const MONTH_FR  = ["Janvier","Février","Mars","Avril","Mai","Juin",
                   "Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

/* ── Live clock ──────────────────────────────────────────────── */
function useLiveTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
const pad = (n: number) => String(n).padStart(2, "0");

/* ── Full-month mini calendar ────────────────────────────────── */
function MiniCalendar() {
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const firstDay   = new Date(cursor.y, cursor.m, 1).getDay();  // 0=Sun
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const prevDays   = new Date(cursor.y, cursor.m, 0).getDate();

  // Build 6-week grid
  const cells: { day: number; type: "prev"|"cur"|"next" }[] = [];
  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ day: prevDays - i, type: "prev" });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, type: "cur" });
  while (cells.length % 7 !== 0)
    cells.push({ day: cells.length - daysInMonth - firstDay + 1, type: "next" });

  const isToday = (d: number, t: string) =>
    t === "cur" && d === today.getDate() &&
    cursor.m === today.getMonth() && cursor.y === today.getFullYear();

  const prev = () => setCursor(c => c.m === 0 ? { y: c.y-1, m: 11 } : { y: c.y, m: c.m-1 });
  const next = () => setCursor(c => c.m ===11 ? { y: c.y+1, m:  0 } : { y: c.y, m: c.m+1 });

  return (
    <div className="px-3 pt-3 pb-2 select-none">
      {/* Month + nav */}
      <div className="flex items-center justify-between mb-2 px-1">
        <button onClick={prev} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
        </button>
        <span className="text-[11px] font-bold text-slate-700 tracking-tight">
          {MONTH_FR[cursor.m]} {cursor.y}
        </span>
        <button onClick={next} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors">
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* Day-name headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d, i) => (
          <div key={i} className="text-center text-[9px] font-bold text-slate-400 py-0.5">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((c, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center justify-center h-[22px] rounded-full text-[10px] font-medium transition-colors",
              c.type !== "cur"     && "text-slate-300",
              c.type === "cur" && !isToday(c.day, c.type) && "text-slate-600 hover:bg-blue-50 hover:text-[#2563EB] cursor-pointer",
              isToday(c.day, c.type) && "bg-[#2563EB] text-white font-bold shadow-sm shadow-blue-300",
            )}
          >
            {c.day}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Sidebar clock + calendar block ─────────────────────────── */
function SidebarClock() {
  const now = useLiveTime();
  const h = pad(now.getHours());
  const m = pad(now.getMinutes());
  const s = pad(now.getSeconds());

  return (
    <div className="border-t border-slate-100">
      {/* Clock */}
      <div className="px-4 pt-3 pb-2 flex items-baseline justify-center gap-0.5">
        <span className="font-mono text-[22px] font-extrabold text-[#2563EB] tracking-tight">{h}</span>
        <span className="font-mono text-[16px] font-bold text-slate-300 mx-0.5 animate-pulse">:</span>
        <span className="font-mono text-[22px] font-extrabold text-[#2563EB] tracking-tight">{m}</span>
        <span className="font-mono text-[16px] font-bold text-slate-300 mx-0.5 animate-pulse">:</span>
        <span className="font-mono text-[22px] font-extrabold text-slate-400 tracking-tight">{s}</span>
      </div>

      {/* Calendar */}
      <MiniCalendar />
    </div>
  );
}

/* ── Nav link ────────────────────────────────────────────────── */
function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "sidebar-link flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium w-full",
        active
          ? "bg-[#2563EB] text-white shadow-md shadow-blue-200"
          : "text-slate-500 hover:bg-blue-50 hover:text-[#2563EB]"
      )}
    >
      <Icon className={cn("w-[17px] h-[17px] shrink-0", active ? "text-white" : "text-slate-400")} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

/* ── Layout ──────────────────────────────────────────────────── */
export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const isActive = (href: string, exact?: boolean) =>
    exact ? location === href : location === href || location.startsWith(href + "/");

  return (
    <div className="min-h-screen flex bg-[#EEF2FF]">

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-[224px] shrink-0 bg-white flex flex-col shadow-[2px_0_16px_rgba(0,0,0,0.06)] z-10 overflow-hidden">

        {/* Logo */}
        <div className="px-5 py-[18px] border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center shadow-md shadow-blue-300/40 shrink-0">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-extrabold text-slate-800 leading-tight tracking-tight truncate">MED TRAVAIL</p>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">Médecine du Travail</p>
            </div>
          </div>
        </div>

        {/* Nav — scrollable */}
        <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-slate-400 px-2 mb-2">Menu</p>
          <nav className="space-y-0.5">
            {MENU_ITEMS.map(item => (
              <NavLink key={item.href} item={item} active={isActive(item.href, item.exact)} />
            ))}
          </nav>

          <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-slate-400 px-2 mt-5 mb-2">Compte</p>
          <nav className="space-y-0.5">
            {ACCOUNT_ITEMS.map(item => (
              <NavLink key={item.label} item={item} active={isActive(item.href, item.exact)} />
            ))}
          </nav>
        </div>

        {/* Clock + Calendar — pinned at bottom */}
        <SidebarClock />
      </aside>

      {/* ── Main ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
