import { Link, useLocation } from "wouter";
import {
  Activity, Users, FileUp, ClipboardList, FileText,
  ShieldCheck, History, FlaskConical, Plus, CalendarCheck, BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ElementType; exact?: boolean };

/* ── Nav Groups ──────────────────────────────────────────────────────────── */
const GROUPS: { title: string; items: NavItem[]; secondary?: NavItem }[] = [
  {
    title: "Activités Médicales",
    items: [
      { href: "/employees",     label: "Personnel Global",       icon: Users },
      { href: "/registre",      label: "Registre des Activités", icon: ClipboardList },
      { href: "/generer",       label: "Générer Fiches",         icon: FileText },
      { href: "/import",        label: "Import Excel",           icon: FileUp },
      { href: "/employees/new", label: "Nouvel Agent",           icon: Plus },
    ],
  },
  {
    title: "Expertises Médicales",
    items: [
      { href: "/expertises", label: "Saisie des Expertises", icon: FlaskConical },
    ],
  },
  {
    title: "Visites d'Hygiène",
    items: [
      { href: "/hygiene/new",        label: "Nouvelle Visite",    icon: ShieldCheck },
      { href: "/hygiene/historique", label: "Historique Visites", icon: History },
    ],
  },
  {
    title: "Objectifs & Qualité",
    items: [
      { href: "/evaluation", label: "Évaluation des Objectifs", icon: BarChart2 },
    ],
    secondary: { href: "/pointage", label: "Pointage Mensuel", icon: CalendarCheck },
  },
];

/* ── Nav Item ────────────────────────────────────────────────────────────── */
function NavLink({ item, active, muted }: { item: NavItem; active: boolean; muted?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
          : muted
            ? "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground/80"
            : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
      )}
    >
      <Icon className={cn(
        "w-4 h-4 shrink-0 transition-opacity",
        active ? "opacity-100" : muted ? "opacity-40 group-hover:opacity-60" : "opacity-55 group-hover:opacity-80"
      )} />
      <span className="truncate">{item.label}</span>
      {active && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary-foreground/60 shrink-0" />
      )}
    </Link>
  );
}

/* ── Layout ──────────────────────────────────────────────────────────────── */
export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const isActive = (href: string, exact?: boolean) =>
    exact ? location === href : location === href || location.startsWith(href + "/");

  return (
    <div className="min-h-screen flex bg-background">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col shadow-[1px_0_0_0_hsl(214_20%_90%)]">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center shrink-0 shadow-md shadow-sidebar-primary/25">
              <Activity className="w-4.5 h-4.5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <p className="font-bold text-[13px] text-sidebar-foreground leading-tight tracking-tight">
                Médecine du Travail
              </p>
              <p className="text-[11px] text-sidebar-foreground/45 mt-0.5 tracking-wide">
                Suivi médical des agents
              </p>
            </div>
          </div>
        </div>

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
          {GROUPS.map((group) => (
            <div key={group.title}>
              {/* Section label */}
              <p className="px-3 mb-2 text-[10.5px] font-semibold uppercase tracking-widest text-sidebar-foreground/35 select-none">
                {group.title}
              </p>

              {/* Primary items */}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    active={isActive(item.href, item.exact)}
                  />
                ))}
              </div>

              {/* Secondary item (e.g. Pointage) — soft separator + muted style */}
              {group.secondary && (
                <div className="mt-3 pt-3 border-t border-sidebar-border/60">
                  <NavLink
                    item={group.secondary}
                    active={isActive(group.secondary.href)}
                    muted
                  />
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-sidebar-border">
          <p className="text-[10.5px] text-sidebar-foreground/35 leading-snug">
            Données confidentielles — usage médical exclusif
          </p>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
