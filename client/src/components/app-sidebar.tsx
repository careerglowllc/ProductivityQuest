import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown, Coins, Monitor, Moon, Sun, User,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/theme-context";
import {
  JOURNAL_SUBLINKS, PRIMARY_NAV, SECONDARY_NAV, breadcrumbFor, isJournalPath,
} from "@/components/nav-config";

function RailLink({
  label, path, icon: Icon, active, indent = false,
}: { label: string; path: string; icon: any; active: boolean; indent?: boolean }) {
  return (
    <Link href={path}>
      <a
        aria-current={active ? "page" : undefined}
        className={`dash-focus relative flex items-center gap-2.5 rounded-lg py-2.5 text-[13px] transition-colors ${
          indent ? "pl-9 pr-3 text-[12px]" : "px-3"
        } ${
          active
            ? "bg-[var(--dash-violet-soft)] font-semibold text-white shadow-[inset_3px_0_0_var(--dash-violet)]"
            : "text-[var(--dash-navy-ink)] hover:bg-[var(--dash-navy-2)] hover:text-white"
        }`}
      >
        {!indent && <Icon aria-hidden className={`h-[17px] w-[17px] shrink-0 ${active ? "text-[var(--dash-violet)]" : ""}`} />}
        <span className="truncate">{label}</span>
      </a>
    </Link>
  );
}

function RailSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="dash-mono px-3 pb-1.5 pt-4 text-[var(--dash-muted-2)]">{children}</div>
  );
}

/** Fixed 236px left rail. Stays navy in both themes as a deliberate anchor. */
export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { preference, cycleTheme, isDark } = useTheme();
  const [journalOpen, setJournalOpen] = useState(() => isJournalPath(location));

  const { data: progress } = useQuery<{ goldTotal?: number; tasksCompleted?: number }>({
    queryKey: ["/api/progress"],
  });

  const displayName = (user as any)?.email || (user as any)?.username || "Adventurer";
  const ThemeIcon = preference === "light" ? Sun : preference === "dark" ? Moon : Monitor;
  const themeLabel = preference === "light" ? "Light" : preference === "dark" ? "Dark" : "Auto";

  return (
    <aside
      aria-label="Primary"
      className="fixed inset-y-0 left-0 z-50 hidden w-[var(--dash-sidebar-w)] flex-col overflow-y-auto border-r border-black/30 bg-[var(--dash-navy)] px-3.5 py-5 md:flex"
    >
      <Link href="/dashboard">
        <a className="dash-focus mb-4 flex items-center gap-2.5 px-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#d8c4ff] to-[#7c5dff] text-[13px] font-black text-[#0d1325]">
            AB
          </span>
          <span className="text-[15px] font-bold tracking-tight text-white">Alex B</span>
        </a>
      </Link>

      {/* Gold + theme — the only status controls that used to live in the top bar */}
      <div className="mb-4 flex items-center gap-1.5 px-1">
        <div className="flex flex-1 items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5">
          <Coins aria-hidden className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-[13px] font-bold text-amber-300">{(progress?.goldTotal ?? 0).toLocaleString()}</span>
        </div>
        <button
          onClick={cycleTheme}
          aria-label={`Theme: ${themeLabel}. Click to change.`}
          title={`Theme: ${themeLabel} — click to change`}
          className="dash-focus grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 text-[var(--dash-navy-ink)] transition-colors hover:text-white"
        >
          <ThemeIcon aria-hidden className={`h-4 w-4 ${isDark ? "text-amber-300" : ""}`} />
        </button>
      </div>

      <nav className="flex flex-col gap-[3px]">
        {PRIMARY_NAV.map((link) => {
          if (link.label === "Journal") {
            const active = isJournalPath(location);
            return (
              <div key={link.path}>
                <div className="flex items-center gap-1">
                  <div className="min-w-0 flex-1">
                    <RailLink {...link} active={active} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setJournalOpen((o) => !o)}
                    aria-expanded={journalOpen}
                    aria-label={journalOpen ? "Collapse journal pages" : "Expand journal pages"}
                    className="dash-focus grid h-8 w-7 shrink-0 place-items-center rounded-md text-[var(--dash-navy-ink)] transition-colors hover:bg-[var(--dash-navy-2)] hover:text-white"
                  >
                    <ChevronDown aria-hidden className={`h-4 w-4 transition-transform ${journalOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>
                {journalOpen && (
                  <div className="mt-[3px] flex flex-col gap-[2px]">
                    {JOURNAL_SUBLINKS.map((sub) => (
                      <RailLink key={sub.path} {...sub} active={location === sub.path} indent />
                    ))}
                  </div>
                )}
              </div>
            );
          }
          const active =
            location === link.path ||
            (link.path === "/tasks" && location === "/campaigns");
          return <RailLink key={link.path} {...link} active={active} />;
        })}

        <RailSectionLabel>More</RailSectionLabel>
        {SECONDARY_NAV.map((link) => (
          <RailLink key={link.path} {...link} active={location === link.path} />
        ))}
      </nav>

      {/* Profile summary — pinned to the bottom of the rail */}
      <div className="mt-auto border-t border-white/10 pt-3">
        <Link href="/settings">
          <a className="dash-focus flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-[var(--dash-navy-2)]">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#f7bd61] to-[#ed688d] text-[#0a1020]">
              <User aria-hidden className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-semibold text-white">{displayName}</span>
              <span className="block truncate text-[11px] text-[var(--dash-muted-2)]">
                {(progress?.goldTotal ?? 0).toLocaleString()} gold · {(progress?.tasksCompleted ?? 0).toLocaleString()} quests done
              </span>
            </span>
          </a>
        </Link>
      </div>
    </aside>
  );
}

/** Fixed 64px utility bar sitting to the right of the rail. Gold, theme, and
 *  profile now live in the sidebar — this stays a plain breadcrumb strip. */
export function AppTopBar() {
  const [location] = useLocation();

  return (
    <header className="fixed inset-x-0 top-0 z-40 hidden h-16 border-b border-[var(--dash-line)] bg-[var(--dash-surface)] md:block md:left-[var(--dash-sidebar-w)]">
      <div className="flex h-full items-center px-8">
        <p className="dash-mono truncate text-[var(--dash-muted)]">
          {breadcrumbFor(location)} <span className="opacity-40">/</span> Today
        </p>
      </div>
    </header>
  );
}
