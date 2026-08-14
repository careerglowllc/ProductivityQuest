import { useEffect, useMemo, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/theme-context";
import { Flame, ArrowLeft, TrendingUp, ListChecks, CalendarDays, Utensils } from "lucide-react";
import { Link } from "wouter";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import {
  type CalorieDayLog as DayLog,
  type Confidence,
  CALORIE_GOAL,
  loadCalorieLog as loadLog,
  ensureCalorieLogSeeded,
} from "@/lib/calorie-log";

// ─────────────────────────────────────────────────────────────────────────────
// Calorie / Nutrition Log
// Persisted under the synced "calories-" localStorage prefix so it follows the
// user's account across devices (see client/src/lib/synced-storage.ts +
// server/routes.ts SYNCED_KEY_PREFIXES). Data + types live in
// client/src/lib/calorie-log.ts so this page and the lifting overlay share
// a single source of truth.
// ─────────────────────────────────────────────────────────────────────────────

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
    ensureCalorieLogSeeded();
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
