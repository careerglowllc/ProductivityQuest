import { useEffect, useMemo, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/theme-context";
import { Flame, ArrowLeft, TrendingUp, ListChecks, CalendarDays, Utensils } from "lucide-react";
import { Link } from "wouter";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// Calorie / Nutrition Log
// Persisted under the synced "calories-" localStorage prefix so it follows the
// user's account across devices (see client/src/lib/synced-storage.ts +
// server/routes.ts SYNCED_KEY_PREFIXES).
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "calories-daily-log-v1";
const CALORIE_GOAL = 2200; // rough daily target reference line for the chart

type Completeness = "unknown/partial" | "explicitly complete";
type Confidence = "low" | "medium" | "high";

interface DayLog {
  date: string; // YYYY-MM-DD
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sodium: number;
  magnesium: number;
  calcium: number;
  vitaminC: number;
  vitaminA: number;
  foodDetails: string;
  completeness: Completeness;
  confidence: Confidence;
  notes?: string;
}

const SEED_LOG: DayLog[] = [
  { date: "2026-06-15", calories: 825, protein: 51, carbs: 94, fat: 26.5, sodium: 1365, magnesium: 67, calcium: 525, vitaminC: 2, vitaminA: 800, foodDetails: "3 slices Trader Joe's sourdough; 3 Trader Joe's mini Brie; 1 scoop Optimum Nutrition vanilla whey; ~1.5 tbsp apricot jam", completeness: "unknown/partial", confidence: "medium", notes: "Macros and micros largely taken from the running total logged that day." },
  { date: "2026-06-16", calories: 670, protein: 37, carbs: 39, fat: 41, sodium: 1440, magnesium: 45, calcium: 380, vitaminC: 8, vitaminA: 900, foodDetails: "Usual double hamburger / Double-Double style burger", completeness: "unknown/partial", confidence: "medium", notes: "Single-item day in the chat." },
  { date: "2026-06-17", calories: 1770, protein: 95, carbs: 129, fat: 83.5, sodium: 2030, magnesium: 173, calcium: 600, vitaminC: 45, vitaminA: 2370, foodDetails: "Everything bagel with cream cheese; 8 oz oat-milk cappuccino; 1 Trader Joe's mini Brie; large bowl with ~5-5.5 chicken thighs in curry sauce, ~1 cup rice, ~1.5 cups cabbage salad", completeness: "unknown/partial", confidence: "medium", notes: "Extra Brie initially added by mistake was moved to June 18 and is not included here." },
  { date: "2026-06-18", calories: 2800, protein: 194, carbs: 194, fat: 139.5, sodium: 4655, magnesium: 363, calcium: 900, vitaminC: 30, vitaminA: 900, foodDetails: "1 Trader Joe's mini Brie; 12 oz coconut-water shake with whey, peanut butter and cacao nibs; ~8 oz tri-tip; Italian deli/poor boy sandwich (revised to ~800 kcal); 1 order prime rib tacos (~700 kcal); 1 Almond Joy; coconut water", completeness: "unknown/partial", confidence: "medium", notes: "Uses user's corrections: one taco order, not two; deli sandwich revised from 950 to ~800 kcal." },
  { date: "2026-06-23", calories: 830, protein: 65, carbs: 38, fat: 41, sodium: 830, magnesium: 130, calcium: 350, vitaminC: 25, vitaminA: 2500, foodDetails: "1 Premier Protein bar; ~6-7 oz salmon with tomato-based sauce, cabbage/arugula salad and some couscous/nuts/dressing", completeness: "unknown/partial", confidence: "medium", notes: "Salmon plate estimate was revised upward after photo." },
  { date: "2026-06-26", calories: 1320, protein: 77, carbs: 114, fat: 58, sodium: 1930, magnesium: 145, calcium: 260, vitaminC: 26, vitaminA: 780, foodDetails: "Turkey, Brie & peach grilled sourdough sandwich; 2 Trader Joe's Lamb Vindaloo frozen meals", completeness: "unknown/partial", confidence: "high", notes: "Final corrected June 26 split." },
  { date: "2026-06-27", calories: 1490, protein: 131, carbs: 73, fat: 70, sodium: 2940, magnesium: 105, calcium: 310, vitaminC: 8, vitaminA: 150, foodDetails: "2 beef Chomps; small meat-heavy Vietnamese banh mi; 1 scoop Optimum whey; Korean fried chicken (2 drumsticks + 1 wing, lightly sauced); ~100 kcal leftover bibimbap; 1 bag Quest protein chips", completeness: "unknown/partial", confidence: "medium", notes: "Corrected from an earlier misunderstanding of 'banh mi' as a pork bun." },
  { date: "2026-06-28", calories: 1250, protein: 52, carbs: 115, fat: 58, sodium: 2400, magnesium: 120, calcium: 330, vitaminC: 15, vitaminA: 550, foodDetails: "Generic taco-truck burrito; ~400 kcal miscellaneous foods", completeness: "unknown/partial", confidence: "low", notes: "Large uncertainty because ~400 kcal of food was not itemized." },
  { date: "2026-06-30", calories: 2165, protein: 152, carbs: 181, fat: 99, sodium: 3000, magnesium: 350, calcium: 700, vitaminC: 35, vitaminA: 1800, foodDetails: "Multigrain avocado toast with ~1 tsp almond butter and ~1/2 small avocado; ~7 oz salmon with ~1 cup salad and herbed yogurt sauce; 10-piece nigiri + 4 tuna roll pieces; usual Italian deli sandwich", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-07-01", calories: 355, protein: 19, carbs: 36, fat: 14, sodium: 650, magnesium: 45, calcium: 60, vitaminC: 5, vitaminA: 350, foodDetails: "1 fried egg; ~3/4 cup white rice; ~3 tbsp Thai basil ground chicken", completeness: "unknown/partial", confidence: "medium", notes: "Small Thai basil chicken portion confirmed by photo." },
  { date: "2026-07-02", calories: 1690, protein: 95, carbs: 138, fat: 85, sodium: 3300, magnesium: 220, calcium: 850, vitaminC: 15, vitaminA: 1800, foodDetails: "1 Trader Joe's mini Brie; everything bagel with ~2 tbsp cream cheese; usual double hamburger; 10-piece assorted nigiri", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-07-04", calories: 910, protein: 103, carbs: 5, fat: 51, sodium: 1800, magnesium: 150, calcium: 850, vitaminC: 0, vitaminA: 1500, foodDetails: "3 eggs; ~1/2 lb turkey; ~1/4 lb queso fresco", completeness: "unknown/partial", confidence: "medium", notes: "Very protein-dense, low-carb entry." },
  { date: "2026-07-08", calories: 2595, protein: 159, carbs: 226, fat: 123, sodium: 4400, magnesium: 515, calcium: 775, vitaminC: 15, vitaminA: 1250, foodDetails: "1 Trader Joe's mini Brie; 6 al pastor street tacos; 7-piece nigiri; usual avocado toast with almond butter; 12 oz oat-milk kombucha latte; usual double hamburger", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-07-13", calories: 2380, protein: 199, carbs: 125, fat: 110, sodium: 4000, magnesium: 300, calcium: 1400, vitaminC: 20, vitaminA: 1800, foodDetails: "1 scoop Ascent whey + 1.5 cups whole lactose-free milk; generic steak burrito without rice; 2 chicken piccata breasts; 3 slices Trader Joe's sourdough; 3 slices Trader Joe's cheddar; 1 bag Quest protein chips", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-07-14", calories: 1450, protein: 89, carbs: 108, fat: 70, sodium: 2450, magnesium: 185, calcium: 345, vitaminC: 21, vitaminA: 2620, foodDetails: "2 Philz bacon & cheese egg bites; Lazy Dog Korean ribeye bibimbap bowl (~650 kcal); 6-piece cafeteria nigiri", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-07-15", calories: 950, protein: 43, carbs: 100, fat: 42, sodium: 1850, magnesium: 80, calcium: 430, vitaminC: 3, vitaminA: 550, foodDetails: "Everything bagel with cream cheese; 1 hard-boiled egg; 8 oz oat-milk cappuccino; half deli sandwich with turkey, pastrami, Swiss and mayo", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-07-16", calories: 2080, protein: 119, carbs: 192, fat: 96, sodium: 2500, magnesium: 370, calcium: 1020, vitaminC: 20, vitaminA: 1050, foodDetails: "Trader Joe's everything bagel + 2 tbsp cream cheese + ~4 oz smoked lox; 3 slices Trader Joe's sourdough; 1 avocado; 4 eggs; protein shake with 1 scoop whey, 2 tbsp peanut butter, 1 banana, blueberries and 1.5 cups whole milk", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-07-17", calories: 2360, protein: 162, carbs: 143, fat: 125, sodium: 4200, magnesium: 300, calcium: 700, vitaminC: 15, vitaminA: 1200, foodDetails: "2 everything bagels with cream cheese and smoked salmon (~750 kcal); taco-truck burrito with no rice/no beans; 2 SkinnyDipped candies; 1 UNREAL bar; ribeye with butter/garlic (~550 kcal); 1 bag Quest protein chips", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-07-18", calories: 1510, protein: 87, carbs: 100, fat: 87, sodium: 2100, magnesium: 210, calcium: 1200, vitaminC: 0, vitaminA: 3200, foodDetails: "3 slices Trader Joe's cheddar; 4 slices Trader Joe's sourdough; 5 eggs; ~1.5 tbsp butter; ~3 oz ribeye", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-07-21", calories: 2700, protein: 150, carbs: 231, fat: 120, sodium: 3100, magnesium: 520, calcium: 1350, vitaminC: 35, vitaminA: 3400, foodDetails: "Lazy Dog bowl (~650 kcal); ~15 hazelnuts; 1 cup steel-cut oatmeal; 5 eggs; 4 slices Trader Joe's sourdough; ~1.5 tbsp butter; protein shake with 1.5 cups whole milk, banana, 1.5 scoops whey and peanut butter", completeness: "explicitly complete", confidence: "medium", notes: "User explicitly said this was the end of the July 21 log." },
  { date: "2026-07-22", calories: 2450, protein: 160, carbs: 184, fat: 118, sodium: 3600, magnesium: 430, calcium: 1050, vitaminC: 20, vitaminA: 3600, foodDetails: "1 slice Trader Joe's sourdough; ~1/2 small avocado; 1 hard-boiled egg; large ~10-piece assorted nigiri; 5 eggs; 4 additional slices Trader Joe's sourdough; 1 slice Trader Joe's cheddar; 1 tbsp butter; ~8 oz New York strip steak", completeness: "explicitly complete", confidence: "medium", notes: "User said the day finished with the New York strip steak." },
  { date: "2026-07-23", calories: 1915, protein: 131, carbs: 125, fat: 101, sodium: 3000, magnesium: 350, calcium: 1050, vitaminC: 15, vitaminA: 3000, foodDetails: "1 beef jalapeño Chomps; 1 turkey Chomps; ~8 oz New York strip steak; 1 banana; 2 slices Trader Joe's cheddar; 5 eggs; 4 slices Trader Joe's sourdough; 1 tbsp butter", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-07-26", calories: 800, protein: 65, carbs: 15, fat: 50, sodium: 1800, magnesium: 110, calcium: 120, vitaminC: 5, vitaminA: 450, foodDetails: "Cattlemen's Buffalo Western Wings and some pork chop", completeness: "unknown/partial", confidence: "low", notes: "User supplied a rough combined calorie estimate of ~800 kcal." },
  { date: "2026-07-27", calories: 700, protein: 35, carbs: 50, fat: 35, sodium: 1500, magnesium: 70, calcium: 180, vitaminC: 5, vitaminA: 350, foodDetails: "Wayback Burgers chicken sandwich", completeness: "unknown/partial", confidence: "low", notes: "User estimated ~700 kcal." },
  { date: "2026-07-29", calories: 830, protein: 57, carbs: 69, fat: 39, sodium: 1700, magnesium: 95, calcium: 520, vitaminC: 0, vitaminA: 450, foodDetails: "1 beef Chomp; 1 whole-milk latte; 1 Pure Protein bar; 2 Trader Joe's frozen cannelloni", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-08-01", calories: 1170, protein: 65, carbs: 101, fat: 55, sodium: 2100, magnesium: 120, calcium: 650, vitaminC: 8, vitaminA: 500, foodDetails: "Usual Italian deli sandwich; half breakfast burrito; large London Fog milk latte", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-08-02", calories: 1070, protein: 62, carbs: 57, fat: 65, sodium: 2050, magnesium: 105, calcium: 410, vitaminC: 8, vitaminA: 600, foodDetails: "Generic double-meat Mexican food-truck burrito with cheese, no rice, no beans; large Philz Mint Mojito coffee with medium cream and extra-light sweetness", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-08-04", calories: 1790, protein: 101, carbs: 139, fat: 92, sodium: 2600, magnesium: 250, calcium: 580, vitaminC: 16, vitaminA: 1300, foodDetails: "Usual double hamburger; usual avocado toast with almond butter; 1 Trader Joe's mini Brie; 8-piece assorted nigiri; 2 Trader Joe's Organic Coconut Smoothies; 1 bag Quest protein chips", completeness: "unknown/partial", confidence: "medium", notes: "Coconut smoothie calories corrected from 180 to 120 per bottle after label photo." },
  { date: "2026-08-05", calories: 1330, protein: 88, carbs: 107, fat: 63, sodium: 1800, magnesium: 330, calcium: 520, vitaminC: 35, vitaminA: 1800, foodDetails: "1 cup steel-cut oatmeal with almonds and dried cranberries; 1 hard-boiled egg; 1 Trader Joe's mini Brie; 1 small cacao-nib snack; Thai coconut curry chicken plate with rice, chicken, sauce and vegetables", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-08-11", calories: 2090, protein: 123, carbs: 125, fat: 75, sodium: 3200, magnesium: 350, calcium: 700, vitaminC: 85, vitaminA: 3200, foodDetails: "~1.5 cup mixed fruit cup; ~2.5-3 chicken thighs with yogurt sauce and dressed salad; 16 oz oat-milk chai latte; ~1 cup beef & bison chili; ~7 shrimp with sauce, rice and salad", completeness: "unknown/partial", confidence: "medium" },
  { date: "2026-08-13", calories: 230, protein: 4, carbs: 43, fat: 5, sodium: 100, magnesium: 45, calcium: 280, vitaminC: 40, vitaminA: 350, foodDetails: "Same ~1.5 cup assorted fruit cup as Aug 11; 8 oz decaf oat-milk cappuccino", completeness: "unknown/partial", confidence: "medium", notes: "Very likely a partial-day log." },
];

function loadLog(): DayLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return SEED_LOG;
}

type Granularity = "day" | "week" | "month";

function formatDateShort(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateFull(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

// Monday-start ISO-ish week key, e.g. "2026-06-15" (the Monday of that week)
function weekKey(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay(); // 0 = Sun
  const diffToMonday = (day + 6) % 7;
  dt.setDate(dt.getDate() - diffToMonday);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7); // YYYY-MM
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, 1);
  return dt.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

const CONFIDENCE_COLOR: Record<Confidence, string> = {
  high: "#34D399",
  medium: "#FBBF24",
  low: "#F87171",
};

export default function FitnessCaloriesPage() {
  const isMobile = useIsMobile();
  const { isDark } = useTheme();
  const [log] = useState<DayLog[]>(() => loadLog());
  const [granularity, setGranularity] = useState<Granularity>("day");

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_LOG));
      }
    } catch { /* ignore */ }
  }, []);

  const sortedLog = useMemo(() => [...log].sort((a, b) => a.date.localeCompare(b.date)), [log]);

  const chartData = useMemo(() => {
    if (granularity === "day") {
      return sortedLog.map((d) => ({
        key: d.date,
        label: formatDateShort(d.date),
        calories: d.calories,
        protein: d.protein,
        count: 1,
      }));
    }
    if (granularity === "week") {
      const groups = new Map<string, { total: number; count: number; protein: number }>();
      for (const d of sortedLog) {
        const k = weekKey(d.date);
        const g = groups.get(k) ?? { total: 0, count: 0, protein: 0 };
        g.total += d.calories;
        g.protein += d.protein;
        g.count += 1;
        groups.set(k, g);
      }
      return Array.from(groups.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([k, g]) => ({
          key: k,
          label: `Wk of ${formatDateShort(k)}`,
          calories: Math.round(g.total / g.count),
          protein: Math.round(g.protein / g.count),
          count: g.count,
        }));
    }
    // month
    const groups = new Map<string, { total: number; count: number; protein: number }>();
    for (const d of sortedLog) {
      const k = monthKey(d.date);
      const g = groups.get(k) ?? { total: 0, count: 0, protein: 0 };
      g.total += d.calories;
      g.protein += d.protein;
      g.count += 1;
      groups.set(k, g);
    }
    return Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, g]) => ({
        key: k,
        label: monthLabel(k),
        calories: Math.round(g.total / g.count),
        protein: Math.round(g.protein / g.count),
        count: g.count,
      }));
  }, [sortedLog, granularity]);

  const summary = useMemo(() => {
    const n = sortedLog.length;
    const avgCal = n ? Math.round(sortedLog.reduce((s, d) => s + d.calories, 0) / n) : 0;
    const avgProtein = n ? Math.round(sortedLog.reduce((s, d) => s + d.protein, 0) / n) : 0;
    const maxDay = n ? sortedLog.reduce((max, d) => (d.calories > max.calories ? d : max)) : null;
    const minDay = n ? sortedLog.reduce((min, d) => (d.calories < min.calories ? d : min)) : null;
    return {
      days: n,
      avgCal,
      avgProtein,
      maxDay,
      minDay,
      firstDate: sortedLog[0]?.date,
      lastDate: sortedLog[n - 1]?.date,
    };
  }, [sortedLog]);

  const tableSortedDesc = useMemo(() => [...sortedLog].sort((a, b) => b.date.localeCompare(a.date)), [sortedLog]);

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-b from-slate-900 via-slate-800 to-rose-950" : "bg-gray-50"} ${!isMobile ? "pt-16" : "pt-2"} pb-24 relative overflow-hidden`}>
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-10 left-16 w-1 h-1 bg-rose-200 rounded-full animate-pulse" />
        <div className="absolute top-32 right-24 w-1 h-1 bg-amber-200 rounded-full animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-56 left-1/3 w-1 h-1 bg-emerald-200 rounded-full animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className={`relative ${isMobile ? "max-w-5xl mx-auto px-4 pt-4" : "max-w-5xl mx-auto px-6 pt-10"}`}>
        <Link href="/fitness">
          <a className="inline-flex items-center gap-2 text-slate-400 hover:text-rose-300 text-sm mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Fitness
          </a>
        </Link>

        <div className="text-center mb-8 space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Flame className="h-7 w-7 text-rose-400" />
            <h1 className={`${isMobile ? "text-2xl" : "text-4xl"} font-serif font-bold text-white tracking-wide`}>
              Calorie Log
            </h1>
            <Flame className="h-7 w-7 text-rose-400" />
          </div>
          <p className="text-slate-400 italic text-sm">Daily nutrition tracking — calories, macros, and micros over time</p>
        </div>

        {/* Summary stat cards */}
        <div className={`grid ${isMobile ? "grid-cols-2" : "grid-cols-4"} gap-3 mb-8`}>
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-center">
            <p className="text-2xl font-bold text-rose-300">{summary.days}</p>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide mt-1">Days Logged</p>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center">
            <p className="text-2xl font-bold text-amber-300">{summary.avgCal.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide mt-1">Avg Calories/Day</p>
          </div>
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-center">
            <p className="text-2xl font-bold text-cyan-300">{summary.avgProtein}g</p>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide mt-1">Avg Protein/Day</p>
          </div>
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 text-center">
            <p className="text-sm font-bold text-violet-300">
              {summary.firstDate && formatDateShort(summary.firstDate)} – {summary.lastDate && formatDateShort(summary.lastDate)}
            </p>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide mt-1">Date Range</p>
          </div>
        </div>

        {/* Line chart with granularity filters */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4 sm:p-5 mb-8">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2 text-white font-bold">
              <TrendingUp className="h-4 w-4 text-rose-400" />
              Calorie Trend
            </div>
            <div className="flex items-center gap-1.5">
              {(["day", "week", "month"] as Granularity[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className="px-3 py-1 rounded-full text-xs font-semibold border capitalize transition-all"
                  style={
                    granularity === g
                      ? { backgroundColor: "#F4717222", borderColor: "#F4717288", color: "#F87171" }
                      : { backgroundColor: "transparent", borderColor: "#334155", color: "#94A3B8" }
                  }
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div style={{ width: "100%", height: isMobile ? 220 : 300 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 11 }} />
                <YAxis
                  tick={{ fill: "#94A3B8", fontSize: 11 }}
                  label={{ value: "Calories (kcal)", angle: -90, position: "insideLeft", fill: "#64748B", fontSize: 11 }}
                  domain={["dataMin - 200", "dataMax + 200"]}
                />
                <ReferenceLine y={CALORIE_GOAL} stroke="#64748B" strokeDasharray="4 4" label={{ value: `Goal ${CALORIE_GOAL}`, fill: "#64748B", fontSize: 10, position: "insideTopRight" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0F172A", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#E2E8F0" }}
                  formatter={(value: number, name: string) => [name === "calories" ? `${value.toLocaleString()} kcal` : `${value}g`, name === "calories" ? "Calories" : "Protein"]}
                  labelFormatter={(_label, payload) => {
                    if (!payload || !payload[0]) return "";
                    const p = payload[0].payload;
                    if (granularity === "day") return formatDateFull(p.key);
                    if (granularity === "week") return `Week of ${formatDateFull(p.key)} (${p.count} day${p.count === 1 ? "" : "s"} logged)`;
                    return `${monthLabel(p.key)} (${p.count} day${p.count === 1 ? "" : "s"} logged)`;
                  }}
                />
                <Line type="monotone" dataKey="calories" stroke="#F87171" strokeWidth={2.5} dot={{ r: 3, fill: "#F87171" }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="protein" stroke="#34D399" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-rose-400 inline-block" /> Calories</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-400 inline-block" style={{ borderTop: "1px dashed #34D399" }} /> Protein (g)</span>
            {granularity !== "day" && <span>— averaged per {granularity}</span>}
          </div>
        </div>

        {/* Extremes callouts */}
        <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-2"} gap-3 mb-8`}>
          {summary.maxDay && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">Highest Day</p>
              <p className="text-lg font-bold text-amber-300">{summary.maxDay.calories.toLocaleString()} kcal <span className="text-slate-500 text-xs font-normal">({formatDateShort(summary.maxDay.date)})</span></p>
              <p className="text-xs text-slate-500 mt-1 truncate">{summary.maxDay.foodDetails}</p>
            </div>
          )}
          {summary.minDay && (
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">Lowest Day</p>
              <p className="text-lg font-bold text-cyan-300">{summary.minDay.calories.toLocaleString()} kcal <span className="text-slate-500 text-xs font-normal">({formatDateShort(summary.minDay.date)})</span></p>
              <p className="text-xs text-slate-500 mt-1 truncate">{summary.minDay.foodDetails}</p>
            </div>
          )}
        </div>

        {/* Daily dashboard table */}
        <div>
          <div className="flex items-center gap-2 text-white font-bold mb-3">
            <ListChecks className="h-4 w-4 text-rose-400" />
            Daily Log
          </div>
          <div className="rounded-xl border border-slate-700/60 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-slate-800/60 text-slate-400 text-xs uppercase">
                <tr>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Date</span>
                  </th>
                  <th className="text-right px-3 py-2 font-medium">Cal</th>
                  <th className="text-right px-3 py-2 font-medium">Protein</th>
                  <th className="text-right px-3 py-2 font-medium">Carbs</th>
                  <th className="text-right px-3 py-2 font-medium">Fat</th>
                  <th className="text-left px-3 py-2 font-medium hidden lg:table-cell">
                    <span className="inline-flex items-center gap-1"><Utensils className="h-3 w-3" /> Food Details</span>
                  </th>
                  <th className="text-left px-3 py-2 font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {tableSortedDesc.map((d) => (
                  <tr key={d.date} className="border-t border-slate-800/80 hover:bg-slate-800/30 align-top">
                    <td className="px-3 py-2 text-slate-300 whitespace-nowrap font-medium">{formatDateShort(d.date)}</td>
                    <td className="px-3 py-2 text-right text-rose-300 font-semibold">{d.calories.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{d.protein}g</td>
                    <td className="px-3 py-2 text-right text-slate-300">{d.carbs}g</td>
                    <td className="px-3 py-2 text-right text-slate-300">{d.fat}g</td>
                    <td className="px-3 py-2 text-slate-500 hidden lg:table-cell max-w-md">{d.foodDetails}</td>
                    <td className="px-3 py-2">
                      <span
                        className="text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 border"
                        style={{ color: CONFIDENCE_COLOR[d.confidence], borderColor: `${CONFIDENCE_COLOR[d.confidence]}55` }}
                      >
                        {d.confidence}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-10">
          Data imported from daily food log (Jun 15 – Aug 13, 2026). Some days are partial/estimated logs — see the Confidence column.
          Chart's dashed goal line reflects a rough {CALORIE_GOAL.toLocaleString()} kcal/day reference.
        </p>
      </div>
    </div>
  );
}
