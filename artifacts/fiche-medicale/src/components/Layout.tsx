import { Link, useLocation } from "wouter";
import {
  Activity, Users, FileUp, ClipboardList, FileText,
  ShieldCheck, History, FlaskConical, Plus, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════
   NAV SECTIONS
═══════════════════════════════════════════════════════════════════════════ */
type NavItem = { href: string; label: string; icon: React.ElementType; exact?: boolean };

const sectionA: NavItem[] = [
  { href: "/employees",  label: "Personnel Global",          icon: Users },
  { href: "/registre",   label: "Registre des Activités",    icon: ClipboardList },
  { href: "/generer",    label: "Générer Fiches (Word)",      icon: FileText },
  { href: "/import",     label: "Import Excel",               icon: FileUp },
  { href: "/employees/new", label: "Nouvel agent",           icon: Plus },
];

const sectionB: NavItem[] = [
  { href: "/expertises", label: "Saisie des Expertises",     icon: FlaskConical },
];

const sectionC: NavItem[] = [
  { href: "/hygiene/new",        label: "Nouvelle Visite",   icon: ShieldCheck },
  { href: "/hygiene/historique", label: "Historique Visites", icon: History },
];

const SECTIONS = [
  {
    letter: "A",
    title:  "Activités Médicales",
    items:  sectionA,
    color:  "text-blue-600 bg-blue-100",
    accent: "bg-blue-600 text-white",
    bar:    "bg-blue-500/20",
  },
  {
    letter: "B",
    title:  "Expertises Médicales",
    items:  sectionB,
    color:  "text-purple-600 bg-purple-100",
    accent: "bg-purple-600 text-white",
    bar:    "bg-purple-500/20",
  },
  {
    letter: "C",
    title:  "Visites d'Hygiène",
    items:  sectionC,
    color:  "text-emerald-600 bg-emerald-100",
    accent: "bg-emerald-600 text-white",
    bar:    "bg-emerald-500/20",
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   LAYOUT
═══════════════════════════════════════════════════════════════════════════ */
export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const isActive = (href: string, exact?: boolean) =>
    exact ? location === href : location === href || location.startsWith(href + "/");

  return (
    <div className="min-h-screen flex bg-background">

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">

        {/* Logo */}
        <div className="px-5 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-bold text-sm text-sidebar-foreground leading-tight">
                Médecine du Travail
              </p>
              <p className="text-[11px] text-muted-foreground">Suivi médical des agents</p>
            </div>
          </div>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-1">
          {SECTIONS.map((section) => (
            <div key={section.letter} className="px-3">
              {/* Section header */}
              <div className="flex items-center gap-2 px-2 py-2 mb-1">
                <span className={cn(
                  "flex items-center justify-center w-5 h-5 rounded text-[11px] font-bold shrink-0",
                  section.color
                )}>
                  {section.letter}
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </span>
              </div>

              {/* Section items */}
              <div className="space-y-0.5 ml-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href, item.exact);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all",
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {active && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
                    </Link>
                  );
                })}
              </div>

              {/* Divider (except last) */}
              {section.letter !== "C" && (
                <div className="mt-3 mb-1 border-t border-sidebar-border" />
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-sidebar-border">
          <p className="text-[11px] text-muted-foreground leading-tight">
            Données confidentielles — usage médical exclusif
          </p>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
