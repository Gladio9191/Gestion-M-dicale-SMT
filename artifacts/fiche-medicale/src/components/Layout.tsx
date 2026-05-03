import { Link, useLocation } from "wouter";
import {
  Activity, Users, FileUp, ClipboardList, FileText,
  ShieldCheck, History, FlaskConical, Plus, CalendarCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ElementType; exact?: boolean };

/* ── Nav Groups ──────────────────────────────────────────────────────────── */
const GROUPS: { title: string; items: NavItem[] }[] = [
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
      { href: "/hygiene/new",        label: "Nouvelle Visite",   icon: ShieldCheck },
      { href: "/hygiene/historique", label: "Historique Visites", icon: History },
    ],
  },
];

const UTILITY: NavItem = { href: "/pointage", label: "Pointage Mensuel", icon: CalendarCheck };

/* ── Nav Item ────────────────────────────────────────────────────────────── */
function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-black/20"
          : "text-sidebar-foreground/70 hover:bg-white/8 hover:text-sidebar-foreground"
      )}
    >
      <Icon className={cn("w-4 h-4 shrink-0", active ? "opacity-100" : "opacity-60 group-hover:opacity-90")} />
      <span className="truncate tracking-[0.01em]">{item.label}</span>
      {active && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary-foreground/70 shrink-0" />
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
      <aside className="w-64 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-sidebar-border/60">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center shrink-0 shadow-lg shadow-sidebar-primary/30">
              <Activity className="w-4.5 h-4.5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <p className="font-bold text-[13px] text-sidebar-foreground leading-tight tracking-tight">
                Médecine du Travail
              </p>
              <p className="text-[11px] text-sidebar-foreground/40 mt-0.5 tracking-wide uppercase">
                Suivi médical
              </p>
            </div>
          </div>
        </div>

        {/* Main nav groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <p className="px-3 mb-2 text-[10.5px] font-semibold uppercase tracking-widest text-sidebar-foreground/35 select-none">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} active={isActive(item.href, item.exact)} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Utility section — visually separated at bottom */}
        <div className="px-3 pb-3">
          <div className="border-t border-sidebar-border/50 pt-4 mt-1">
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/25 select-none">
              Outils
            </p>
            <NavLink item={UTILITY} active={isActive(UTILITY.href)} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-sidebar-border/50">
          <p className="text-[10.5px] text-sidebar-foreground/30 leading-snug tracking-wide">
            Données confidentielles
          </p>
          <p className="text-[10.5px] text-sidebar-foreground/20 tracking-wide">
            Usage médical exclusif
          </p>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
