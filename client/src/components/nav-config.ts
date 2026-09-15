import {
  LayoutDashboard, CheckSquare, Calendar, Sparkles, DollarSign, BookOpen, Crown,
  ShoppingCart, Users, Compass, Dumbbell, Flame, HeartHandshake, Heart, Zap, ClipboardList, BookMarked, Settings,
} from "lucide-react";

export type NavLink = { label: string; path: string; icon: any };

/** Journal sub-pages — now navigated via the journal hub's own "related pages"
 *  pill row (see journal-ui.tsx JOURNAL_NAV), not a sidebar sub-menu. Kept here
 *  for `isJournalPath()` (active-state highlighting) and breadcrumb labels. */
export const JOURNAL_SUBLINKS: (NavLink & { colorClass: string })[] = [
  { label: "Daily GEWS", path: "/journal/daily-gews", icon: HeartHandshake, colorClass: "text-amber-400" },
  { label: "Current Empowering Thoughts/Beliefs", path: "/journal/empowering-thoughts", icon: Sparkles, colorClass: "text-amber-400" },
  { label: "Gratitude Journal", path: "/journal/gratitude", icon: Heart, colorClass: "text-pink-400" },
  { label: "Excitement Journal", path: "/journal/excitement", icon: Zap, colorClass: "text-orange-400" },
  { label: "Weekly Deep Planning", path: "/journal/weekly-planning", icon: ClipboardList, colorClass: "text-amber-400" },
  { label: "Reference Beliefs", path: "/reference-beliefs", icon: BookMarked, colorClass: "text-amber-400" },
];

export function isJournalPath(location: string) {
  return location === "/journal" || JOURNAL_SUBLINKS.some((l) => location === l.path);
}

/** Primary rail destinations. Explore/Fitness/Calorie Tracker sit right after Journal —
 *  they used to ride along inside the old Journal sidebar sub-menu, which was removed
 *  once the journal hub grew its own "related pages" nav; these three still need a
 *  direct sidebar entry point since they aren't journal pages themselves. */
export const PRIMARY_NAV: NavLink[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Quests", path: "/tasks", icon: CheckSquare },
  { label: "Calendar", path: "/calendar", icon: Calendar },
  { label: "Skills", path: "/skills", icon: Sparkles },
  { label: "Finances", path: "/finances", icon: DollarSign },
  { label: "Journal", path: "/journal", icon: BookOpen },
  { label: "Explore", path: "/explore", icon: Compass },
  { label: "Fitness", path: "/fitness", icon: Dumbbell },
  { label: "Calorie Tracker", path: "/fitness/calories", icon: Flame },
];

/** Secondary destinations — kept out of the primary list so the rail stays scannable. */
export const SECONDARY_NAV: NavLink[] = [
  { label: "Questlines", path: "/campaigns", icon: Crown },
  { label: "Shop", path: "/shop", icon: ShoppingCart },
  { label: "NPCs", path: "/npcs", icon: Users },
  { label: "All pages", path: "/more", icon: Compass },
];

const BREADCRUMBS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/tasks": "Quests",
  "/calendar": "Calendar",
  "/skills": "Skills",
  "/finances": "Finances",
  "/journal": "Journal",
  "/campaigns": "Questlines",
  "/shop": "Shop",
  "/npcs": "NPCs",
  "/more": "All pages",
  "/settings": "Settings",
  "/recycling-bin": "Recycling Bin",
  "/cpap": "CPAP",
  "/accomplishments": "Accomplishments",
  "/explore": "Explore",
  "/recipes": "Recipes",
  ...Object.fromEntries(JOURNAL_SUBLINKS.map((l) => [l.path, l.label])),
};

export function breadcrumbFor(location: string): string {
  if (BREADCRUMBS[location]) return BREADCRUMBS[location];
  if (location.startsWith("/settings")) return "Settings";
  if (location.startsWith("/fitness")) return "Fitness";
  if (location.startsWith("/journal")) return "Journal";
  return "ProductivityQuest";
}

export { Settings as SettingsIcon };
