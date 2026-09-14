import { Link, useLocation } from "wouter";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown, ChevronLeft, ChevronRight, Coins, Monitor, Moon, Sun, User,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/theme-context";
import {
  JOURNAL_SUBLINKS, PRIMARY_NAV, SECONDARY_NAV, breadcrumbFor, isJournalPath,
} from "@/components/nav-config";

const SIDEBAR_MIN_W = 180;
const SIDEBAR_MAX_W = 360;
const SIDEBAR_DEFAULT_W = 236;
const SIDEBAR_COLLAPSED_W = 68;
// Dragging the handle past this point (while still wider than the collapsed
// rail) snaps to collapsed on release, mirroring VS Code / most app rails.
const SIDEBAR_COLLAPSE_THRESHOLD = 130;

function RailLink({
  label, path, icon: Icon, active, indent = false, collapsed = false,
}: { label: string; path: string; icon: any; active: boolean; indent?: boolean; collapsed?: boolean }) {
  return (
    <Link href={path}>
      <a
        aria-current={active ? "page" : undefined}
        title={collapsed ? label : undefined}
        className={`dash-focus relative flex items-center gap-2.5 rounded-lg py-2.5 text-[13px] transition-colors ${
          collapsed ? "justify-center px-0" : indent ? "pl-9 pr-3 text-[12px]" : "px-3"
        } ${
          active
            ? "bg-[var(--dash-violet-soft)] font-semibold text-white shadow-[inset_3px_0_0_var(--dash-violet)]"
            : "text-[var(--dash-navy-ink)] hover:bg-[var(--dash-navy-2)] hover:text-white"
        }`}
      >
        {!indent && <Icon aria-hidden className={`h-[17px] w-[17px] shrink-0 ${active ? "text-[var(--dash-violet)]" : ""}`} />}
        {!collapsed && <span className="truncate">{label}</span>}
      </a>
    </Link>
  );
}

function RailSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="dash-mono px-3 pb-1.5 pt-4 text-[var(--dash-muted-2)]">{children}</div>
  );
}

/** Fixed left rail, resizable by dragging its right edge. Stays navy in both
 *  themes as a deliberate anchor. Collapses to a slim icon rail either by
 *  dragging past the threshold or clicking the edge toggle button. */
export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { preference, cycleTheme, isDark } = useTheme();
  const [journalOpen, setJournalOpen] = useState(() => isJournalPath(location));

  const [expandedWidth, setExpandedWidth] = useState<number>(() => {
    const saved = Number(localStorage.getItem("pq-sidebar-width"));
    return saved >= SIDEBAR_MIN_W && saved <= SIDEBAR_MAX_W ? saved : SIDEBAR_DEFAULT_W;
  });
  const [collapsed, setCollapsed] = useState<boolean>(() => localStorage.getItem("pq-sidebar-collapsed") === "1");
  const [dragging, setDragging] = useState(false);
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);

  // Apply the live width to the shared CSS var that every fixed-offset
  // consumer (`.pq-shell`, the top bar, floating action bars) reads from.
  // useLayoutEffect (not useEffect) so the correct width is set before paint.
  useLayoutEffect(() => {
    if (dragging) return; // during drag we set this imperatively for smoothness
    document.documentElement.style.setProperty("--dash-sidebar-w", `${collapsed ? SIDEBAR_COLLAPSED_W : expandedWidth}px`);
  }, [collapsed, expandedWidth, dragging]);

  useEffect(() => { localStorage.setItem("pq-sidebar-width", String(expandedWidth)); }, [expandedWidth]);
  useEffect(() => { localStorage.setItem("pq-sidebar-collapsed", collapsed ? "1" : "0"); }, [collapsed]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const state = dragState.current;
      if (!state) return;
      const next = Math.min(SIDEBAR_MAX_W, Math.max(SIDEBAR_COLLAPSED_W, state.startWidth + (e.clientX - state.startX)));
      document.documentElement.style.setProperty("--dash-sidebar-w", `${next}px`);
    };
    const onUp = (e: PointerEvent) => {
      const state = dragState.current;
      setDragging(false);
      dragState.current = null;
      if (!state) return;
      const released = Math.min(SIDEBAR_MAX_W, Math.max(SIDEBAR_COLLAPSED_W, state.startWidth + (e.clientX - state.startX)));
      if (released <= SIDEBAR_COLLAPSE_THRESHOLD) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
        setExpandedWidth(Math.max(SIDEBAR_MIN_W, released));
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging]);

  const handleDragStart = (e: React.PointerEvent) => {
    e.preventDefault();
    dragState.current = { startX: e.clientX, startWidth: collapsed ? SIDEBAR_COLLAPSED_W : expandedWidth };
    setDragging(true);
  };

  const toggleCollapsed = () => setCollapsed((c) => !c);

  const { data: progress } = useQuery<{ goldTotal?: number; tasksCompleted?: number }>({
    queryKey: ["/api/progress"],
  });

  const displayName = (user as any)?.email || (user as any)?.username || "Adventurer";
  const ThemeIcon = preference === "light" ? Sun : preference === "dark" ? Moon : Monitor;
  const themeLabel = preference === "light" ? "Light" : preference === "dark" ? "Dark" : "Auto";

  return (
    <aside
      aria-label="Primary"
      className={`group fixed inset-y-0 left-0 z-50 hidden w-[var(--dash-sidebar-w)] flex-col border-r border-black/30 bg-[var(--dash-navy)] md:flex ${dragging ? "" : "transition-[width] duration-150"}`}
    >
      <div className={`flex min-h-0 flex-1 flex-col overflow-y-auto py-5 ${collapsed ? "px-2" : "px-3.5"}`}>
      <Link href="/dashboard">
        <a className={`dash-focus mb-4 flex items-center gap-2.5 ${collapsed ? "justify-center px-0" : "px-2"}`}>
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#d8c4ff] to-[#7c5dff] text-[13px] font-black text-[#0d1325]">
            AB
          </span>
          {!collapsed && <span className="truncate text-[15px] font-bold tracking-tight text-white">Alex B</span>}
        </a>
      </Link>

      {/* Gold + theme — the only status controls that used to live in the top bar */}
      <div className={`mb-4 flex items-center gap-1.5 ${collapsed ? "flex-col px-0" : "px-1"}`}>
        <div
          title={collapsed ? `${(progress?.goldTotal ?? 0).toLocaleString()} gold` : undefined}
          className={`flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 ${collapsed ? "justify-center px-2 py-1.5" : "flex-1 px-3 py-1.5"}`}
        >
          <Coins aria-hidden className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          {!collapsed && <span className="text-[13px] font-bold text-amber-300">{(progress?.goldTotal ?? 0).toLocaleString()}</span>}
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
                    <RailLink {...link} active={active} collapsed={collapsed} />
                  </div>
                  {!collapsed && (
                    <button
                      type="button"
                      onClick={() => setJournalOpen((o) => !o)}
                      aria-expanded={journalOpen}
                      aria-label={journalOpen ? "Collapse journal pages" : "Expand journal pages"}
                      className="dash-focus grid h-8 w-7 shrink-0 place-items-center rounded-md text-[var(--dash-navy-ink)] transition-colors hover:bg-[var(--dash-navy-2)] hover:text-white"
                    >
                      <ChevronDown aria-hidden className={`h-4 w-4 transition-transform ${journalOpen ? "rotate-180" : ""}`} />
                    </button>
                  )}
                </div>
                {!collapsed && journalOpen && (
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
          return <RailLink key={link.path} {...link} active={active} collapsed={collapsed} />;
        })}

        {!collapsed && <RailSectionLabel>More</RailSectionLabel>}
        {SECONDARY_NAV.map((link) => (
          <RailLink key={link.path} {...link} active={location === link.path} collapsed={collapsed} />
        ))}
      </nav>

      {/* Profile summary — pinned to the bottom of the rail */}
      <div className="mt-auto border-t border-white/10 pt-3">
        <Link href="/settings">
          <a
            title={collapsed ? displayName : undefined}
            className={`dash-focus flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-[var(--dash-navy-2)] ${collapsed ? "justify-center" : ""}`}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#f7bd61] to-[#ed688d] text-[#0a1020]">
              <User aria-hidden className="h-4 w-4" />
            </span>
            {!collapsed && (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold text-white">{displayName}</span>
                <span className="block truncate text-[11px] text-[var(--dash-muted-2)]">
                  {(progress?.goldTotal ?? 0).toLocaleString()} gold · {(progress?.tasksCompleted ?? 0).toLocaleString()} quests done
                </span>
              </span>
            )}
          </a>
        </Link>
      </div>
      </div>

      {/* Drag-to-resize handle */}
      <div
        onPointerDown={handleDragStart}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        className="absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize touch-none hover:bg-[var(--dash-violet)]/50"
      />

      {/* Collapse / expand toggle — a subtle arrow at the rail's edge */}
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="dash-focus absolute -right-3 top-[70px] z-20 grid h-6 w-6 place-items-center rounded-full border border-white/15 bg-[var(--dash-navy-2)] text-[var(--dash-navy-ink)] opacity-0 shadow transition-opacity hover:text-white group-hover:opacity-100"
      >
        {collapsed ? <ChevronRight aria-hidden className="h-3.5 w-3.5" /> : <ChevronLeft aria-hidden className="h-3.5 w-3.5" />}
      </button>
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
