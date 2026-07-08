import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  ShoppingCart,
  Sparkles,
  Trophy,
  Crown,
  Users,
  Activity,
  DollarSign,
  Trash2,
  Settings,
  Compass,
  BookOpen,
  Dumbbell,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/theme-context";

interface NavLink {
  name: string;
  path: string;
  icon: typeof LayoutDashboard;
  color: string; // tailwind text + border accent base, e.g. "purple"
  description: string;
}

// Every page in the app, grouped for the "More" hub.
const SECTIONS: { title: string; links: NavLink[] }[] = [
  {
    title: "Quests & Planning",
    links: [
      { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard, color: "purple", description: "Overview & stats" },
      { name: "Quests", path: "/tasks", icon: CheckSquare, color: "yellow", description: "Tasks & to-dos" },
      { name: "Calendar", path: "/calendar", icon: Calendar, color: "pink", description: "Schedule & events" },
      { name: "Questlines", path: "/campaigns", icon: Crown, color: "purple", description: "Long-term campaigns" },
    ],
  },
  {
    title: "Progress",
    links: [
      { name: "Skills", path: "/skills", icon: Sparkles, color: "blue", description: "Skill constellation" },
      { name: "Shop", path: "/shop", icon: ShoppingCart, color: "green", description: "Spend your gold" },
    ],
  },
  {
    title: "Life Tracking",
    links: [
      { name: "Finances", path: "/finances", icon: DollarSign, color: "green", description: "Income & expenses" },
      { name: "CPAP", path: "/cpap", icon: Activity, color: "cyan", description: "Sleep therapy tracker" },
      { name: "NPCs", path: "/npcs", icon: Users, color: "blue", description: "People rolodex" },
      { name: "Journal", path: "/journal", icon: BookOpen, color: "orange", description: "Essays & reflections" },
      { name: "Accomplishments", path: "/accomplishments", icon: Trophy, color: "yellow", description: "Milestones reached" },
      { name: "Explore", path: "/explore", icon: Compass, color: "cyan", description: "Places & travel" },
      { name: "Fitness", path: "/fitness", icon: Dumbbell, color: "pink", description: "Calories & lifting" },
    ],
  },
  {
    title: "System",
    links: [
      { name: "Settings", path: "/settings", icon: Settings, color: "yellow", description: "Preferences & sync" },
      { name: "Recycle", path: "/recycling-bin", icon: Trash2, color: "orange", description: "Deleted quests" },
      { name: "Getting Started", path: "/getting-started", icon: BookOpen, color: "cyan", description: "Guide & onboarding" },
    ],
  },
];

const COLOR_MAP: Record<string, { border: string; icon: string }> = {
  purple: { border: "border-purple-500/30 hover:border-purple-400/60", icon: "text-purple-400 group-hover:text-purple-300" },
  yellow: { border: "border-yellow-500/30 hover:border-yellow-400/60", icon: "text-yellow-400 group-hover:text-yellow-300" },
  pink: { border: "border-pink-500/30 hover:border-pink-400/60", icon: "text-pink-400 group-hover:text-pink-300" },
  blue: { border: "border-blue-500/30 hover:border-blue-400/60", icon: "text-blue-400 group-hover:text-blue-300" },
  green: { border: "border-green-500/30 hover:border-green-400/60", icon: "text-green-400 group-hover:text-green-300" },
  cyan: { border: "border-cyan-500/30 hover:border-cyan-400/60", icon: "text-cyan-400 group-hover:text-cyan-300" },
  orange: { border: "border-orange-500/30 hover:border-orange-400/60", icon: "text-orange-400 group-hover:text-orange-300" },
};

export default function MorePage() {
  const isMobile = useIsMobile();
  const { isDark } = useTheme();

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" : "bg-gray-50"} ${isMobile ? "pb-20 px-3 pt-4" : "pt-20 px-4"}`}>
      <div className="max-w-5xl mx-auto py-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Compass className="h-7 w-7 text-yellow-400" />
          <div>
            <h1 className="text-2xl font-serif font-bold text-yellow-100">More</h1>
            <p className="text-sm text-yellow-200/60">All pages & tools in one place</p>
          </div>
        </div>

        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-7">
            <h2 className="text-xs font-bold uppercase tracking-wider text-yellow-400/70 mb-3">{section.title}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {section.links.map((link) => {
                const Icon = link.icon;
                const c = COLOR_MAP[link.color];
                return (
                  <Link key={link.path} href={link.path}>
                    <Card className={`hover:shadow-xl transition-all cursor-pointer bg-slate-800/60 backdrop-blur-md border-2 ${c.border} group h-full`}>
                      <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
                        <Icon className={`w-7 h-7 mb-2 ${c.icon} transition-colors`} />
                        <h3 className="text-sm font-semibold text-yellow-100 font-serif">{link.name}</h3>
                        <p className="text-[11px] text-yellow-200/50 mt-0.5 leading-tight">{link.description}</p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
