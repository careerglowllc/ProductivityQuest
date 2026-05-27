import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { TrendingUp, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

type AccomplishmentCategory = "practical" | "mindset" | "life" | "adventure" | "career" | "health" | "relationships" | "financial";

const CATEGORIES: Record<AccomplishmentCategory, { label: string; color: string; bg: string; border: string }> = {
  practical:     { label: "Practical Skills",   color: "#34D399", bg: "bg-emerald-500/15",  border: "border-emerald-500/40" },
  mindset:       { label: "Mindset & Spirit",   color: "#A78BFA", bg: "bg-violet-500/15",   border: "border-violet-500/40" },
  life:          { label: "Life Milestones",    color: "#FCD34D", bg: "bg-yellow-500/15",   border: "border-yellow-500/40" },
  adventure:     { label: "Adventure & Travel", color: "#38BDF8", bg: "bg-sky-500/15",      border: "border-sky-500/40" },
  career:        { label: "Career & Business",  color: "#FB923C", bg: "bg-orange-500/15",   border: "border-orange-500/40" },
  health:        { label: "Health & Body",      color: "#F472B6", bg: "bg-pink-500/15",     border: "border-pink-500/40" },
  relationships: { label: "Relationships",      color: "#F87171", bg: "bg-red-500/15",      border: "border-red-500/40" },
  financial:     { label: "Financial",          color: "#4ADE80", bg: "bg-green-500/15",    border: "border-green-500/40" },
};

type Accomplishment = { year: number; title: string; detail: string; category: AccomplishmentCategory; emoji: string };

const ACCOMPLISHMENTS: Accomplishment[] = [
  { year: 2016, title: "Switched to Engineering", detail: "Made the pivotal career-path decision to pursue engineering — a leap of faith that set the whole journey in motion.", category: "career", emoji: "⚙️" },
  { year: 2016, title: "Self-Help Deep Dive (2016–2018)", detail: "Devoured the canon — Man's Search for Meaning, 7 Habits, and dozens more. Planted seeds of intentional living.", category: "mindset", emoji: "📚" },
  { year: 2019, title: "Military Service", detail: "Served and gained discipline, brotherhood, and a foundational worldview that everything else gets measured against.", category: "career", emoji: "🎖️" },
  { year: 2019, title: "Finance & FIRE Awakening (2019–2021)", detail: "Discovered Naval Ravikant, FIRE movement, and the real rules of money and wealth. Changed the way I see time and work forever.", category: "financial", emoji: "📈" },
  { year: 2020, title: "Boston, College & Engineering Glory", detail: "4.0, Magna Cum Laude, dream job offer — after countless all-nighters, last-second cramming, and relentless grind. Won in the academic arena.", category: "career", emoji: "🎓" },
  { year: 2020, title: "Rock Climbing & Challenging Comfort Zone", detail: "Hit real rock walls with Karl, Ben and crew. Learned to trust the rope, face height, and push physical limits IRL.", category: "health", emoji: "🧗" },
  { year: 2021, title: "Wim Hof Method", detail: "Adopted breathwork and cold exposure. Discovered what the body is capable of when the mind stops complaining.", category: "health", emoji: "🧊" },
  { year: 2021, title: "First Motorcycle — Kawasaki Ninja 300", detail: "Got my license, bought the bike, and learned to ride. Freedom, risk, and the open road became personal.", category: "practical", emoji: "🏍️" },
  { year: 2022, title: "Thailand — Reflection, Path & Transformation", detail: "A solo journey that cracked something open. Began the long arc from who I was to who I was becoming — still unfolding.", category: "adventure", emoji: "🌏" },
  { year: 2022, title: "Ireland & Europe Travels (First Time)", detail: "Explored castles, coastlines, and cultures far outside the American bubble. History became tangible.", category: "adventure", emoji: "🍀" },
  { year: 2023, title: "Colombia — $30/Day Living & Real Life Adventures", detail: "Learned to live richly on very little. Survived the cop pull-over, hit-and-run chaos, and found beauty in the balance of danger and magic.", category: "adventure", emoji: "🌿" },
  { year: 2023, title: "Mexico Immersion", detail: "Culture, food, people and perspective. Another layer stripped off of Bay Area insularity.", category: "adventure", emoji: "🌮" },
  { year: 2023, title: "Japan Discovery", detail: "Experienced world-class quality of life, discipline, and food culture. Set a new benchmark for what civilization can look like.", category: "adventure", emoji: "🗾" },
  { year: 2023, title: "Learning to Sing with Joanna", detail: "Opened a creative and emotional channel I'd kept closed. Cut bad ties and found a freer, more expressive version of myself.", category: "relationships", emoji: "🎶" },
  { year: 2023, title: "First Real Relationship — Joanna", detail: "Learned how to love, be loved, communicate, and navigate real intimacy. Growth that can't come from any book.", category: "relationships", emoji: "❤️" },
  { year: 2024, title: "GT Master's — Proactive CS Pivot & Timely Exit", detail: "Got into Georgia Tech's OMSCS through sheer proactivity. Recognized early that AI was making the degree obsolete and pivoted out before sinking years in. Dodged a major bullet and redirected toward business.", category: "career", emoji: "🧠" },
  { year: 2024, title: "Redding Family & Fourth of July Traditions", detail: "Discovered the magic of small-town American summers, firework sessions, and the Redding family. Moments that redefine 'home'.", category: "life", emoji: "🎆" },
  { year: 2024, title: "First Firework Session", detail: "Lit off fireworks for the first time. Simple, childlike joy — underrated milestone.", category: "life", emoji: "✨" },
  { year: 2024, title: "Puerto Rico — Island Living", detail: "Sun, culture, food and a different rhythm of life. Added another data point to the map of what 'good living' can mean.", category: "adventure", emoji: "🌊" },
  { year: 2024, title: "Varun's Engagement & Yuliya — Untethered Soul Glimpses", detail: "A moment of witnessing love, celebration, and the potential of presence. Sparked deeper reading and reflection on the untethered path.", category: "mindset", emoji: "🌸" },
  { year: 2024, title: "Religious & Philosophical Deep Dive (2024–2026)", detail: "Confronted the biggest questions — death, meaning, God, suffering. Built a real framework. Not just beliefs inherited but ones forged through reading, thinking and living.", category: "mindset", emoji: "🔭" },
  { year: 2024, title: "Hair Transplant & Physical Transformation", detail: "Made the call, went through the process, and saw it through. Confidence upgrade and proof that taking action beats rumination.", category: "health", emoji: "💇" },
  { year: 2024, title: "Working Through Family Trauma & Shell", detail: "Began actively detoxing from toxic family patterns. The unlearning is hard — but it's the most freeing work there is.", category: "mindset", emoji: "🌱" },
  { year: 2025, title: "Learned to Change a Car Tire", detail: "No more waiting on the side of the road. Basic but empowering — the kind of self-reliance that matters when it counts.", category: "practical", emoji: "🔧" },
  { year: 2025, title: "Existential Peace — Masterpiece Essay", detail: "Addressed years of existential and religious anxiety. Synthesized a personal nihilism-meets-meaning framework and wrote it all down. Finally at peace with the big questions.", category: "mindset", emoji: "🕊️" },
  { year: 2025, title: "Bought First House — 2605 Plumbago Ct", detail: "Learned the entire homebuying process: offers, inspections, escrow, financing, refinancing. A massive adult unlock.", category: "life", emoji: "🏠" },
  { year: 2025, title: "California Wisdom — Beyond the Bay Area Bubble", detail: "Explored hidden gems in rural and Central California. Permanently dismantled Bay Area superiority complex. Found beauty in slower, deeper living.", category: "life", emoji: "🌾" },
  { year: 2025, title: "Got a Puppy — Unconditional Love Unlocked", detail: "Learned to care for a dog and discovered what unconditional love actually feels like in practice. Life is measurably better with a good dog.", category: "life", emoji: "🐶" },
  { year: 2025, title: "LLC — Founded, Ran & Learned the Business World", detail: "Started CareerGlow LLC, deployed real apps, studied marketing strategy, and gained deep insight into the CEO mindset. Found my calling.", category: "career", emoji: "🚀" },
  { year: 2025, title: "Disneyland LA — Fear Conquered", detail: "Faced and defeated roller coaster phobia. Rode every major ride at Disneyland and DCA. Childhood fears — done.", category: "health", emoji: "🎢" },
  { year: 2026, title: "Learned to Change Car Oil", detail: "Added another practical self-reliance tool to the belt. Less dependency, more capability.", category: "practical", emoji: "🛢️" },
  { year: 2026, title: "Built a Gate", detail: "Designed and built a real gate from scratch. Hands, wood, tools — and a result that stands.", category: "practical", emoji: "🚪" },
  { year: 2026, title: "Learned Drywall", detail: "Patched, taped and finished drywall. The house teaches humility and competence in equal measure.", category: "practical", emoji: "🏗️" },
  { year: 2026, title: "Plastering, Painting & Spackling", detail: "Took walls from rough to smooth to painted. A satisfying arc of craft from damage to beauty.", category: "practical", emoji: "🖌️" },
  { year: 2026, title: "Got Ducks", detail: "Adopted ducks and gained a mindset shift: stop overthinking hard things and just be more active. Turns out ducks are delightful.", category: "life", emoji: "🦆" },
  { year: 2026, title: "Solved ED — For Good (Mostly)", detail: "Addressed and resolved a sensitive health issue that had lingered. An underrated life quality unlock that deserves to be logged.", category: "health", emoji: "💪" },
  { year: 2026, title: "Ireland & Europe Travels (2026)", detail: "Explored more of Europe with fresh eyes and a richer context. Every trip builds on the last.", category: "adventure", emoji: "🏰" },
];

export default function TimelinePage() {
  const isMobile = useIsMobile();
  const [activeCategories, setActiveCategories] = useState<Set<AccomplishmentCategory>>(
    new Set(Object.keys(CATEGORIES) as AccomplishmentCategory[])
  );
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const years = Array.from(new Set(ACCOMPLISHMENTS.map(a => a.year))).sort((a, b) => a - b);

  const toggleCategory = (cat: AccomplishmentCategory) => {
    setActiveCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) { if (next.size > 1) next.delete(cat); } else next.add(cat);
      return next;
    });
  };

  const toggleExpand = (key: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const filtered = ACCOMPLISHMENTS.filter(a => activeCategories.has(a.category));
  const byYear = years
    .map(y => ({ year: y, items: filtered.filter(a => a.year === y) }))
    .filter(g => g.items.length > 0);

  const chartData = years.map(y => ({
    year: y,
    count: filtered.filter(a => a.year === y).length,
    total: ACCOMPLISHMENTS.filter(a => a.year === y).length,
  }));
  const maxCount = Math.max(...chartData.map(d => d.total), 1);

  return (
    <div className={`min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 ${!isMobile ? "pt-16" : "pt-2"} pb-24 relative overflow-hidden`}>
      {/* Subtle starfield */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-10 left-16 w-1 h-1 bg-emerald-200 rounded-full animate-pulse" />
        <div className="absolute top-32 right-24 w-1 h-1 bg-sky-200 rounded-full animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-56 left-1/3 w-1 h-1 bg-violet-200 rounded-full animate-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute top-80 right-1/3 w-1 h-1 bg-yellow-200 rounded-full animate-pulse" style={{ animationDelay: "0.5s" }} />
      </div>

      <div className={`relative max-w-4xl mx-auto ${isMobile ? "px-4 pt-4" : "px-6 pt-10"}`}>

        {/* Back link */}
        <Link href="/skills">
          <a className="inline-flex items-center gap-2 text-slate-400 hover:text-emerald-300 text-sm mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Skills
          </a>
        </Link>

        {/* Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="flex items-center justify-center gap-3">
            <TrendingUp className="h-7 w-7 text-emerald-400" />
            <h1 className={`${isMobile ? "text-2xl" : "text-4xl"} font-serif font-bold text-white tracking-wide`}>
              Accomplishments Timeline
            </h1>
            <TrendingUp className="h-7 w-7 text-emerald-400" />
          </div>
          <p className="text-slate-400 italic text-sm">A living record of growth — practical, mental, spiritual, and experiential</p>
          <p className="text-emerald-400/70 text-xs">{ACCOMPLISHMENTS.length} accomplishments across {years.length} years</p>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {(Object.entries(CATEGORIES) as [AccomplishmentCategory, typeof CATEGORIES[AccomplishmentCategory]][]).map(([key, meta]) => {
            const isActive = activeCategories.has(key);
            const count = ACCOMPLISHMENTS.filter(a => a.category === key).length;
            return (
              <button
                key={key}
                onClick={() => toggleCategory(key)}
                className={`flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 border transition-all ${
                  isActive
                    ? `${meta.bg} ${meta.border} text-white`
                    : "bg-slate-800/40 border-slate-700/40 text-slate-500 line-through"
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: isActive ? meta.color : "#475569" }} />
                <span className="font-semibold">{meta.label}</span>
                <span className="opacity-60">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Bar chart */}
        <div className="rounded-xl border border-emerald-500/20 bg-slate-800/50 p-4 mb-10">
          <p className="text-xs text-slate-400 mb-3 text-center">Accomplishments per year</p>
          <div className="flex items-end gap-1.5 h-32 px-2">
            {chartData.map(d => {
              const totalH = Math.max(6, (d.total / maxCount) * 100);
              const fillH = d.count === 0 ? 0 : (d.count / d.total) * 100;
              return (
                <div key={d.year} className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-[9px] text-emerald-400 font-bold">{d.count > 0 ? d.count : ""}</span>
                  <div className="w-full relative" style={{ height: `${totalH}%` }}>
                    <div className="absolute bottom-0 w-full rounded-t bg-slate-700/50 h-full" />
                    <div
                      className="absolute bottom-0 w-full rounded-t bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all"
                      style={{ height: `${fillH}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-500">{d.year}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical spine */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-500/70 via-yellow-500/40 to-violet-500/30" />

          <div className="space-y-10 pl-16">
            {byYear.map(({ year, items }) => (
              <div key={year}>
                {/* Year marker */}
                <div className="flex items-center gap-4 mb-5 -ml-16">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 border-2 border-yellow-400/60 flex items-center justify-center shadow-lg shadow-yellow-900/30 shrink-0">
                    <span className="text-slate-900 font-bold text-xs leading-none">{year}</span>
                  </div>
                  <div>
                    <span className="text-yellow-200 font-bold text-xl font-serif">{year}</span>
                    <span className="text-slate-500 text-xs ml-2">· {items.length} accomplishment{items.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((item, idx) => {
                    const cat = CATEGORIES[item.category];
                    const key = `${item.year}-${idx}`;
                    const isExpanded = expandedItems.has(key);
                    return (
                      <div
                        key={key}
                        onClick={() => toggleExpand(key)}
                        className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${cat.bg} ${cat.border} hover:scale-[1.01] hover:shadow-lg`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl shrink-0">{item.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-white font-semibold text-sm leading-snug">{item.title}</p>
                              <span
                                className="text-[9px] rounded-full px-2 py-0.5 shrink-0 mt-0.5"
                                style={{ background: cat.color + "22", color: cat.color, border: `1px solid ${cat.color}50` }}
                              >
                                {cat.label}
                              </span>
                            </div>
                            {isExpanded ? (
                              <p className="text-slate-300 text-xs mt-2 leading-relaxed">{item.detail}</p>
                            ) : (
                              <p className="text-slate-500 text-[10px] mt-1">tap to expand</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer flourish */}
        <div className="mt-16 text-center text-slate-600 text-xs italic pb-4">
          "The unexamined life is not worth living." — Socrates
        </div>
      </div>
    </div>
  );
}
