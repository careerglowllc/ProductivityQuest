import { Check } from "lucide-react";
import type { NutrientKey } from "@shared/fitness-log";
import { CALORIE_GOAL, goalDetail, goalRows, type GoalRow } from "@shared/fitness-goals";
import { NUTRIENT_COLORS } from "@/components/fitness/nutrient-chips";

const OVER = "#F59E0B";

function GoalBar({ row }: { row: GoalRow }) {
  const color = row.status === "over" ? OVER : NUTRIENT_COLORS[row.key] ?? "#94A3B8";
  return (
    <li data-testid={`goal-${row.key}`} data-status={row.status}>
      <div className="flex items-center gap-2">
        <span className="w-[74px] shrink-0 text-[12px] font-medium text-slate-200">{row.label}</span>
        <div
          role="progressbar"
          aria-label={`${row.label}, ${row.percent}% of the daily goal`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(100, row.percent)}
          className="h-2 flex-1 overflow-hidden rounded-full bg-slate-700/60"
        >
          <div data-testid={`goal-fill-${row.key}`} className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.round(row.fill * 100)}%`, backgroundColor: color }} />
        </div>
        <span data-testid={`goal-percent-${row.key}`} className="flex w-12 shrink-0 items-center justify-end gap-0.5 text-[12px] font-bold tabular-nums" style={{ color: row.status === "under" ? "#E2E8F0" : color }}>
          {row.status === "met" && <Check aria-hidden className="h-3 w-3" />}
          {row.percent}%
        </span>
      </div>
      <p className="pl-[82px] text-[10px] leading-4 text-slate-500">{goalDetail(row)}</p>
    </li>
  );
}

// Today's calories, macros, fiber, calcium and vitamins A, C and D against the daily goals, one bar each, with the percent of
// the goal reached and how far there is to go. Calories, carbs and fat turn amber when passed; the others just read "goal reached".
export function DailyGoals({ day, includesOpenDay = false }: { day: Partial<Record<NutrientKey, number>> | undefined; includesOpenDay?: boolean }) {
  const rows = goalRows(day);
  const empty = !(day?.calories && day.calories > 0);
  return (
    <section data-testid="daily-goals" aria-label="Today against your goals" className="mb-6 rounded-2xl border border-slate-700/60 bg-slate-900/50 px-4 py-3">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold text-white">Today vs your goals</h2>
        <span className="text-[11px] text-slate-400">{CALORIE_GOAL.toLocaleString("en-US")} kcal a day</span>
      </div>
      {empty && <p data-testid="goals-empty" className="mb-2 text-[11px] text-slate-400">Nothing logged today yet. Log a meal above and these fill in.</p>}
      <div className="md:grid md:grid-cols-2 md:gap-x-10">
        <ul className="space-y-1.5">{rows.slice(0, 4).map((row) => <GoalBar key={row.key} row={row} />)}</ul>
        <div className="my-2 border-t border-slate-700/60 md:hidden" aria-hidden />
        <ul className="space-y-1.5">{rows.slice(4).map((row) => <GoalBar key={row.key} row={row} />)}</ul>
      </div>
      <p className="mt-2 text-[10px] leading-4 text-slate-500">
        Protein, carbs and fat are 25%, 45% and 30% of the calories. Fiber, calcium and the vitamins use the daily value.
        {includesOpenDay ? " Includes the food you are still logging." : ""}
      </p>
    </section>
  );
}
