import { Link, useLocation } from "wouter";
import {
  Activity, Users, FileUp, ClipboardList, FileText,
  ShieldCheck, History, FlaskConical, Plus, CalendarCheck,
  BarChart2, Home, User, Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import TopBar from "@/components/TopBar";

/* ── Nav items ──────────────────────────────────────────────────────── */
type NavItem = { href: string; label: string; icon: React.ElementType; exact?: boolean };

const MENU_ITEMS: NavItem[] = [
  { href: "/",              label: "Tableau de bord",       icon: Home,          exact: true },
  { href: "/employees",     label: "Personnel",             icon: Users },
  { href: "/registre",      label: "Registre Activités",   icon: ClipboardList },
  { href: "/generer",       label: "Générer Fiches",        icon: FileText },
  { href: "/import",        label: "Import Excel",          icon: FileUp },
  { href: "/employees/new", label: "Nouvel Agent",          icon: Plus },
  { href: "/expertises",    label: "Expertises",            icon: FlaskConical },
  { href: "/hygiene/new",   label: "Visite Hygiène",        icon: ShieldCheck },
  { href: "/hygiene/historique", label: "Historique",       icon: History },
  { href: "/evaluation",    label: "Éval. Objectifs",       icon: BarChart2 },
];

const ACCOUNT_ITEMS: NavItem[] = [
  { href: "/pointage", label: "Pointage",      icon: CalendarCheck },
  { href: "#",         label: "Notifications", icon: Bell },
  { href: "#",         label: "Profil",        icon: User },
];

/* ── Single nav link — CLEARIQ style ─────────────────────────────── */
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
      <Icon className={cn("w-[18px] h-[18px] shrink-0", active ? "text-white" : "text-slate-400")} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

/* ── Layout ───────────────────────────────────────────────────────── */
export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const isActive = (href: string, exact?: boolean) =>
    exact ? location === href : location === href || location.startsWith(href + "/");

  return (
    <div className="min-h-screen flex bg-[#EEF2FF]">

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className="w-[220px] shrink-0 bg-white flex flex-col shadow-[2px_0_16px_rgba(0,0,0,0.06)] z-10">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center shadow-md shadow-blue-300/40">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[14px] font-extrabold text-slate-800 leading-tight tracking-tight">MED TRAVAIL</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Médecine du Travail</p>
            </div>
          </div>
        </div>

        {/* MENU */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 px-2 mb-3">Menu</p>
          <nav className="space-y-0.5">
            {MENU_ITEMS.map(item => (
              <NavLink key={item.href} item={item} active={isActive(item.href, item.exact)} />
            ))}
          </nav>

          {/* ACCOUNT */}
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 px-2 mt-6 mb-3">Compte</p>
          <nav className="space-y-0.5">
            {ACCOUNT_ITEMS.map(item => (
              <NavLink key={item.label} item={item} active={isActive(item.href, item.exact)} />
            ))}
          </nav>
        </div>

        {/* Bottom footer */}
        <div className="px-5 py-4 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#6366F1] flex items-center justify-center">
              <span className="text-[11px] font-bold text-white">SM</span>
            </div>
            <div>
              <p className="text-[12px] font-semibold text-slate-700">Dr. Smt</p>
              <p className="text-[10px] text-slate-400">Médecin du Travail</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
