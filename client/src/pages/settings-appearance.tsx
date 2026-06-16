import { Link } from "wouter";
import { Sun, Moon, Monitor, ChevronLeft, Palette } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/theme-context";

export default function AppearanceSettingsPage() {
  const isMobile = useIsMobile();
  const { preference, setPreference, isDark } = useTheme();

  const options = [
    {
      value: "light" as const,
      label: "Light",
      description: "Bright theme for daytime use",
      icon: Sun,
      iconColor: "text-yellow-400",
      gradient: "from-yellow-400 to-orange-400",
    },
    {
      value: "dark" as const,
      label: "Dark",
      description: "Easy on the eyes, great for night",
      icon: Moon,
      iconColor: "text-indigo-400",
      gradient: "from-indigo-500 to-purple-600",
    },
    {
      value: "auto" as const,
      label: "Auto",
      description: "Matches your device system setting",
      icon: Monitor,
      iconColor: "text-slate-300",
      gradient: "from-slate-500 to-slate-600",
    },
  ];

  return (
    <div
      className={`min-h-screen ${
        isDark
          ? "bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950"
          : "bg-gray-50"
      } ${!isMobile ? "pt-16" : ""} pb-24 relative overflow-hidden`}
    >
      {/* Starfield */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-10 left-10 w-1 h-1 bg-yellow-200 rounded-full animate-pulse" />
        <div className="absolute top-20 right-20 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-40 left-1/4 w-1 h-1 bg-purple-200 rounded-full animate-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute top-60 right-1/3 w-1 h-1 bg-yellow-200 rounded-full animate-pulse" style={{ animationDelay: "0.5s" }} />
      </div>

      <div className={`container mx-auto ${isMobile ? "px-4 py-4" : "px-4 py-8"} relative z-10`}>
        <div className={`${isMobile ? "max-w-full" : "max-w-2xl"} mx-auto`}>

          {/* Back button + Header */}
          <div className={isMobile ? "mb-5" : "mb-8"}>
            <Link href="/settings">
              <a className="inline-flex items-center gap-1.5 text-yellow-400/80 hover:text-yellow-400 transition-colors mb-3 text-sm">
                <ChevronLeft className="w-4 h-4" />
                Back to Settings
              </a>
            </Link>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center shadow-lg">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <h1 className={`${isMobile ? "text-xl" : "text-3xl"} font-serif font-bold text-yellow-100`}>
                Appearance
              </h1>
            </div>
            <p className="text-yellow-200/70 text-sm ml-[52px]">
              Choose how ProductivityQuest looks
            </p>
          </div>

          {/* Theme options */}
          <div className="space-y-3">
            {options.map((opt) => {
              const Icon = opt.icon;
              const isSelected = preference === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setPreference(opt.value)}
                  className={`w-full text-left rounded-xl border transition-all p-4 flex items-center gap-4 ${
                    isSelected
                      ? "bg-slate-700/70 border-yellow-500/60 shadow-lg shadow-yellow-600/10"
                      : "bg-slate-800/50 border-slate-700/40 hover:border-slate-600/60 hover:bg-slate-800/70"
                  }`}
                >
                  {/* Icon bubble */}
                  <div
                    className={`w-11 h-11 rounded-lg bg-gradient-to-br ${opt.gradient} flex items-center justify-center flex-shrink-0 shadow`}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>

                  {/* Label + description */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-yellow-100 text-base">{opt.label}</p>
                    <p className="text-yellow-200/60 text-sm">{opt.description}</p>
                  </div>

                  {/* Selection indicator */}
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected
                        ? "border-yellow-400 bg-yellow-400"
                        : "border-slate-500"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-slate-900" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Current status note */}
          <p className="mt-6 text-center text-yellow-200/40 text-xs">
            Currently using:{" "}
            <span className="text-yellow-300/70 font-medium capitalize">{preference}</span> mode
          </p>
        </div>
      </div>
    </div>
  );
}
