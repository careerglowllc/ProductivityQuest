import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/theme-context";
import { Dumbbell, ArrowLeft, Flame } from "lucide-react";
import { Link } from "wouter";

type FitnessCategory = {
  key: string;
  label: string;
  emoji: string;
  description: string;
  color: string;
  border: string;
  bg: string;
  iconColor: string;
  icon: typeof Dumbbell;
};

const CATEGORIES: FitnessCategory[] = [
  {
    key: "calories",
    label: "Calorie Logging",
    emoji: "🍎",
    description: "Track daily food intake and calories to stay on top of your nutrition goals.",
    color: "#FB7185",
    border: "border-rose-500/40",
    bg: "bg-rose-500/10",
    iconColor: "text-rose-400",
    icon: Flame,
  },
  {
    key: "lifting",
    label: "Weightlifting Logging",
    emoji: "🏋️",
    description: "Log workouts, sets, reps, and weights to track strength progress over time.",
    color: "#34D399",
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    icon: Dumbbell,
  },
];

export default function FitnessPage() {
  const isMobile = useIsMobile();
  const { isDark } = useTheme();

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-b from-slate-900 via-slate-800 to-emerald-950" : "bg-gray-50"} ${!isMobile ? "pt-16" : "pt-2"} pb-24 relative overflow-hidden`}>
      {/* Subtle starfield */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-10 left-16 w-1 h-1 bg-emerald-200 rounded-full animate-pulse" />
        <div className="absolute top-32 right-24 w-1 h-1 bg-rose-200 rounded-full animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-56 left-1/3 w-1 h-1 bg-teal-200 rounded-full animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className={`relative ${isMobile ? "max-w-4xl mx-auto px-4 pt-4" : "max-w-4xl mx-auto px-6 pt-10"}`}>
        {/* Back link */}
        <Link href="/journal">
          <a className="inline-flex items-center gap-2 text-slate-400 hover:text-emerald-300 text-sm mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Journal
          </a>
        </Link>

        {/* Header */}
        <div className="text-center mb-10 space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Dumbbell className="h-7 w-7 text-emerald-400" />
            <h1 className={`${isMobile ? "text-2xl" : "text-4xl"} font-serif font-bold text-white tracking-wide`}>
              Fitness
            </h1>
            <Dumbbell className="h-7 w-7 text-emerald-400" />
          </div>
          <p className="text-slate-400 italic text-sm">Track your nutrition and strength — one rep and one meal at a time</p>
        </div>

        {/* Category cards */}
        <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-2"} gap-4`}>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
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
          This page is a placeholder — calorie logging and weightlifting logging are on the way.
        </p>
      </div>
    </div>
  );
}
