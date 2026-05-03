import { Link, useLocation } from "wouter";
import {
  Activity, Users, FileUp, ClipboardList, FileText,
  ShieldCheck, History, FlaskConical, Plus, CalendarCheck,
  BarChart2, Home, Bell, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import TopBar from "@/components/TopBar";

/* ── Nav data ────────────────────────────────────────────────── */
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

const CONFIG_ITEMS: NavItem[] = [
  { href: "/pointage", label: "Pointage",       icon: CalendarCheck },
  { href: "#",         label: "Notifications",  icon: Bell },
  { href: "#",         label: "Paramètres",     icon: Settings },
];

/* ── Gradient nav link ───────────────────────────────────────── */
function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium w-full transition-all duration-200 group relative",
        active
          ? "bg-white/20 text-white shadow-sm"
          : "text-white/60 hover:bg-white/10 hover:text-white"
      )}
    >
      <Icon className={cn("w-[17px] h-[17px] shrink-0 transition-colors",
        active ? "text-white" : "text-white/50 group-hover:text-white/80")} />
      <span className="flex-1 truncate">{item.label}</span>
      {active && (
        <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
      )}
    </Link>
  );
}

/* ── Layout ──────────────────────────────────────────────────── */
export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const isActive = (href: string, exact?: boolean) =>
    exact ? location === href : location === href || location.startsWith(href + "/");

  return (
    <div className="min-h-screen flex bg-[#F0F2F8]">

      {/* ── Sidebar — gradient ───────────────────────────────── */}
      <aside
        className="w-[210px] shrink-0 flex flex-col z-10 overflow-hidden"
        style={{ background: "linear-gradient(160deg, #00C9AF 0%, #1a7fcc 50%, #5B5FD4 100%)" }}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-md shrink-0">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-extrabold text-white leading-tight tracking-tight truncate">
                Médecine du Travail
              </p>
              <p className="text-[10px] text-white/50 mt-0.5">SMT Laâyoune</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 border-t border-white/15 mb-3" />

        {/* MENU */}
        <div className="flex-1 overflow-y-auto px-3 min-h-0 pb-2">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.15em] text-white/40 px-2 mb-2">Menu</p>
          <nav className="space-y-0.5">
            {MENU_ITEMS.map(item => (
              <NavLink key={item.href} item={item} active={isActive(item.href, item.exact)} />
            ))}
          </nav>

          <div className="mx-2 border-t border-white/15 my-4" />

          <p className="text-[9.5px] font-bold uppercase tracking-[0.15em] text-white/40 px-2 mb-2">Configuration</p>
          <nav className="space-y-0.5">
            {CONFIG_ITEMS.map(item => (
              <NavLink key={item.label} item={item} active={isActive(item.href, item.exact)} />
            ))}
          </nav>
        </div>

        {/* Bottom watermark */}
        <div className="px-5 py-4 shrink-0">
          <p className="text-[10px] text-white/30 text-center">v2.0 · Données confidentielles</p>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
