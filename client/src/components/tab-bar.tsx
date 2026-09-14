import { Link, useLocation } from "wouter";
import { LayoutDashboard, CheckSquare, Calendar, BookOpen, Settings, Compass } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { AppSidebar, AppTopBar } from "@/components/app-sidebar";
import { isJournalPath } from "@/components/nav-config";

// Mobile bottom nav: Dashboard, Quests, Calendar, Journal, Settings, All.
// Shop is dropped here (still reachable from Dashboard / the More hub); Settings
// and All point at the same destinations they do in the desktop rail.
const MOBILE_TABS = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Quests", path: "/tasks", icon: CheckSquare },
  { name: "Calendar", path: "/calendar", icon: Calendar },
  { name: "Journal", path: "/journal", icon: BookOpen },
  { name: "Settings", path: "/settings", icon: Settings },
  { name: "All", path: "/more", icon: Compass },
];

export function TabBar() {
  const [location] = useLocation();
  const isMobile = useIsMobile();

  // Mobile: persistent bottom navigation
  if (isMobile) {
    return (
      <nav
        aria-label="Primary"
        className="safe-area-inset-bottom fixed inset-x-0 bottom-0 z-50 border-t border-[var(--dash-line)] bg-[var(--dash-surface)]"
      >
        <div className="mx-auto flex max-w-lg items-center px-1">
          {MOBILE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.name === "Journal" ? isJournalPath(location) : location === tab.path;

            // className goes on <Link> itself — wouter v3 renders the anchor, so a nested
            // <a> would leave the real flex child unstyled and break even tab sizing.
            return (
              <Link
                key={tab.path}
                href={tab.path}
                aria-label={tab.name}
                aria-current={isActive ? "page" : undefined}
                className={`dash-focus flex min-h-[56px] min-w-[44px] shrink grow basis-0 flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? "text-[var(--dash-violet)]" : "text-[var(--dash-muted-2)]"
                }`}
                style={{ touchAction: "manipulation" }}
              >
                <Icon aria-hidden className={`h-[22px] w-[22px] ${isActive ? "stroke-[2.5]" : ""}`} />
                <span className={`text-[10px] leading-none ${isActive ? "font-semibold" : "font-medium"}`}>
                  {tab.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  // Desktop: fixed left rail + top utility bar
  return (
    <>
      <AppSidebar />
      <AppTopBar />
    </>
  );
}
