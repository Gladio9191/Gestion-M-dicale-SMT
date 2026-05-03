import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity, Users, FileUp, ClipboardList, FileText,
  ShieldCheck, History, FlaskConical, Plus, CalendarCheck,
  BarChart2, Home, Settings, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import TopBar from "@/components/TopBar";

/* ── Types ──────────────────────────────────────────────────────────────── */
type NavItem = { href: string; label: string; icon: React.ElementType; exact?: boolean };
type PrimaryGroup = {
  id: string;
  icon: React.ElementType;
  label: string;
  color: string;
  bg: string;
  items: NavItem[];
  secondary?: NavItem;
};

/* ── Navigation structure ─────────────────────────────────────────────── */
const PRIMARY_GROUPS: PrimaryGroup[] = [
  {
    id: "activites",
    icon: Home,
    label: "Activités",
    color: "#2563EB",
    bg: "#EFF6FF",
    items: [
      { href: "/",             label: "Tableau de bord",      icon: Home,          exact: true },
      { href: "/employees",    label: "Personnel Global",      icon: Users },
      { href: "/registre",     label: "Registre des Activités",icon: ClipboardList },
      { href: "/generer",      label: "Générer Fiches",        icon: FileText },
      { href: "/import",       label: "Import Excel",          icon: FileUp },
      { href: "/employees/new",label: "Nouvel Agent",          icon: Plus },
    ],
  },
  {
    id: "expertises",
    icon: FlaskConical,
    label: "Expertises",
    color: "#7C3AED",
    bg: "#F5F3FF",
    items: [
      { href: "/expertises", label: "Saisie des Expertises", icon: FlaskConical },
    ],
  },
  {
    id: "hygiene",
    icon: ShieldCheck,
    label: "Hygiène",
    color: "#059669",
    bg: "#ECFDF5",
    items: [
      { href: "/hygiene/new",        label: "Nouvelle Visite",    icon: ShieldCheck },
      { href: "/hygiene/historique", label: "Historique Visites", icon: History },
    ],
  },
  {
    id: "objectifs",
    icon: BarChart2,
    label: "Objectifs",
    color: "#DC2626",
    bg: "#FEF2F2",
    items: [
      { href: "/evaluation", label: "Évaluation des Objectifs", icon: BarChart2 },
    ],
    secondary: { href: "/pointage", label: "Pointage Mensuel", icon: CalendarCheck },
  },
];

/* ── Helpers ─────────────────────────────────────────────────────────── */
function detectGroup(pathname: string): string {
  if (pathname === "/" || pathname.startsWith("/employees") || pathname.startsWith("/registre") ||
      pathname.startsWith("/generer") || pathname.startsWith("/import"))
    return "activites";
  if (pathname.startsWith("/expertises")) return "expertises";
  if (pathname.startsWith("/hygiene"))   return "hygiene";
  if (pathname.startsWith("/evaluation") || pathname.startsWith("/pointage")) return "objectifs";
  return "activites";
}

/* ── Primary icon button ─────────────────────────────────────────────── */
function PrimaryBtn({ group, active, onClick }: {
  group: PrimaryGroup; active: boolean; onClick: () => void;
}) {
  const Icon = group.icon;
  return (
    <button
      onClick={onClick}
      title={group.label}
      className={cn(
        "primary-btn relative w-11 h-11 rounded-2xl flex items-center justify-center group",
        active ? "shadow-md" : "hover:bg-white/10"
      )}
      style={active ? { backgroundColor: group.color } : {}}
    >
      <Icon className={cn("w-5 h-5 transition-colors", active ? "text-white" : "text-slate-400 group-hover:text-slate-200")} />
      {active && (
        <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-white" />
      )}
    </button>
  );
}

/* ── Secondary nav link ───────────────────────────────────────────────── */
function SecLink({ item, active, muted }: { item: NavItem; active: boolean; muted?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium group",
        active
          ? "text-white shadow-sm"
          : muted
            ? "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      )}
      style={active ? { backgroundColor: "var(--active-color)" } : {}}
    >
      <Icon className={cn("w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110", active ? "text-white" : muted ? "text-slate-300" : "text-slate-400 group-hover:text-slate-600")} />
      <span className="flex-1 truncate">{item.label}</span>
      {active && <ChevronRight className="w-3 h-3 text-white/60 shrink-0" />}
    </Link>
  );
}

/* ── Layout ───────────────────────────────────────────────────────────── */
export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [activeGroup, setActiveGroup] = useState(() => detectGroup(location));

  useEffect(() => {
    setActiveGroup(detectGroup(location));
  }, [location]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? location === href : location === href || location.startsWith(href + "/");

  const group = PRIMARY_GROUPS.find(g => g.id === activeGroup) ?? PRIMARY_GROUPS[0];

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">

      {/* ── PRIMARY sidebar (dark, slim) ─────────────────────────────── */}
      <aside className="w-[72px] shrink-0 bg-[#0F172A] flex flex-col items-center py-4 gap-2 z-20">
        {/* Logo */}
        <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-900/40">
          <Activity className="w-5 h-5 text-white" />
        </div>

        {/* Group icons */}
        <div className="flex flex-col gap-2 flex-1">
          {PRIMARY_GROUPS.map(g => (
            <PrimaryBtn
              key={g.id}
              group={g}
              active={activeGroup === g.id}
              onClick={() => setActiveGroup(g.id)}
            />
          ))}
        </div>

        {/* Settings */}
        <button className="w-11 h-11 rounded-2xl flex items-center justify-center text-slate-500 hover:bg-white/10 hover:text-slate-300 transition-all mt-2">
          <Settings className="w-5 h-5" />
        </button>
      </aside>

      {/* ── SECONDARY sidebar (light, wide) ──────────────────────────── */}
      <aside
        className="w-56 shrink-0 bg-white border-r border-slate-100 flex flex-col"
        style={{ "--active-color": group.color } as React.CSSProperties}
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: group.bg }}
            >
              <group.icon className="w-4 h-4" style={{ color: group.color }} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                {group.label}
              </p>
              <p className="text-[12px] font-medium text-slate-700 leading-tight">
                Médecine du Travail
              </p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {group.items.map(item => (
            <SecLink
              key={item.href}
              item={item}
              active={isActive(item.href, item.exact)}
            />
          ))}

          {group.secondary && (
            <div className="pt-3 mt-3 border-t border-slate-100">
              <SecLink
                item={group.secondary}
                active={isActive(group.secondary.href)}
                muted
              />
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 leading-snug">
            Données confidentielles
          </p>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
