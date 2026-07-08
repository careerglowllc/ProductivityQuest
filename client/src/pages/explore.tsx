import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/theme-context";
import { Compass, ArrowLeft, Globe, Map, FerrisWheel, Utensils } from "lucide-react";
import { Link } from "wouter";

type ExploreCategory = {
  key: string;
  label: string;
  emoji: string;
  description: string;
  color: string;
  border: string;
  bg: string;
  iconColor: string;
};

const CATEGORIES: ExploreCategory[] = [
  {
    key: "countries",
    label: "Countries Visited",
    emoji: "🌍",
    description: "Every country you've set foot in — a growing map of the world explored.",
    color: "#38BDF8",
    border: "border-sky-500/40",
    bg: "bg-sky-500/10",
    iconColor: "text-sky-400",
  },
  {
    key: "states",
    label: "US States Visited",
    emoji: "🗺️",
    description: "The 50-state checklist — track which states you've explored across the country.",
    color: "#A78BFA",
    border: "border-violet-500/40",
    bg: "bg-violet-500/10",
    iconColor: "text-violet-400",
  },
  {
    key: "activities",
    label: "Activities in Cities",
    emoji: "🎡",
    description: "Memorable things you've done city by city — tours, shows, adventures, and more.",
    color: "#FB923C",
    border: "border-orange-500/40",
    bg: "bg-orange-500/10",
    iconColor: "text-orange-400",
  },
  {
    key: "food",
    label: "Food in Cities",
    emoji: "🍜",
    description: "A running log of standout meals and dishes discovered around the world.",
    color: "#F472B6",
    border: "border-pink-500/40",
    bg: "bg-pink-500/10",
    iconColor: "text-pink-400",
  },
];

const CATEGORY_ICONS: Record<string, typeof Globe> = {
  countries: Globe,
  states: Map,
  activities: FerrisWheel,
  food: Utensils,
};

export default function ExplorePage() {
  const isMobile = useIsMobile();
  const { isDark } = useTheme();

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-b from-slate-900 via-slate-800 to-sky-950" : "bg-gray-50"} ${!isMobile ? "pt-16" : "pt-2"} pb-24 relative overflow-hidden`}>
      {/* Subtle starfield */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-10 left-16 w-1 h-1 bg-sky-200 rounded-full animate-pulse" />
        <div className="absolute top-32 right-24 w-1 h-1 bg-violet-200 rounded-full animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-56 left-1/3 w-1 h-1 bg-orange-200 rounded-full animate-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute top-80 right-1/3 w-1 h-1 bg-pink-200 rounded-full animate-pulse" style={{ animationDelay: "0.5s" }} />
      </div>

      <div className={`relative ${isMobile ? "max-w-4xl mx-auto px-4 pt-4" : "max-w-4xl mx-auto px-6 pt-10"}`}>
        {/* Back link */}
        <Link href="/journal">
          <a className="inline-flex items-center gap-2 text-slate-400 hover:text-sky-300 text-sm mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Journal
          </a>
        </Link>

        {/* Header */}
        <div className="text-center mb-10 space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Compass className="h-7 w-7 text-sky-400" />
            <h1 className={`${isMobile ? "text-2xl" : "text-4xl"} font-serif font-bold text-white tracking-wide`}>
              Explore
            </h1>
            <Compass className="h-7 w-7 text-sky-400" />
          </div>
          <p className="text-slate-400 italic text-sm">A living map of the places, experiences, and flavors you've discovered</p>
        </div>

        {/* Category cards */}
        <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-2"} gap-4`}>
          {CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.key] ?? Globe;
            return (
              <div
                key={cat.key}
                className={`rounded-2xl border ${cat.border} ${cat.bg} p-5 transition-all hover:scale-[1.02] cursor-default`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`flex items-center justify-center h-11 w-11 rounded-xl bg-slate-900/40 ${cat.iconColor}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>{cat.emoji}</span> {cat.label}
                    </h2>
                  </div>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">{cat.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-500">No entries yet</span>
                  <span
                    className="text-[10px] uppercase tracking-wide rounded-full px-2.5 py-1 border"
                    style={{ color: cat.color, borderColor: `${cat.color}55` }}
                  >
                    Coming soon
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-slate-600 text-xs mt-10">
          This page is a placeholder — logging and tracking for each category is on the way.
        </p>
      </div>
    </div>
  );
}
