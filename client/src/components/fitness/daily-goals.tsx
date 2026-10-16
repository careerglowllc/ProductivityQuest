import { Check } from "lucide-react";
import type { NutrientKey } from "@shared/fitness-log";
import { CALORIE_GOAL, goalDetail, goalRows, type GoalRow } from "@shared/fitness-goals";
import { NUTRIENT_COLORS } from "@/components/fitness/nutrient-chips";
import type { SessionParts } from "@/components/fitness/session-panel";
import { formatDayShort } from "@/lib/fitness-entry";

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

// The day's calories, macros, fiber, calcium and vitamins A, C and D against the daily goals, one bar each, with the percent of
// the goal reached and how far there is to go. Calories, carbs and fat turn amber when passed; the others just read "goal reached".
// It is always there. While a day is open (`parts`) it is that day's live summary and holds its controls: the Day field, the
// foods so far (folded away until tapped), what the last message changed, and End / Undo / Discard.
export function DailyGoals({ day, today, parts = null, updating = false }: { day: Partial<Record<NutrientKey, number>> | undefined; today: string; parts?: SessionParts | null; updating?: boolean }) {
  const rows = goalRows(day);
  const empty = !(day?.calories && day.calories > 0);
  const date = parts?.draft.date;
  const heading = date && date !== today ? `${formatDayShort(date)} vs your goals` : "Today vs your goals";
  const sugar = Math.round((day?.sugar ?? 0) * 10) / 10;
  return (
    <section data-testid="daily-goals" aria-label={heading} className="mb-6 rounded-2xl border border-slate-700/60 bg-slate-900/50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h2 data-testid="goals-title" className="text-sm font-bold text-white">{heading}</h2>
          <span className="text-[11px] text-slate-400">{CALORIE_GOAL.toLocaleString("en-US")} kcal a day</span>
        </div>
        {(updating || parts) && (
          <span className="flex items-center gap-2">
            {updating && <span data-testid="goals-updating" className="animate-pulse text-[11px] text-slate-400">Updating…</span>}
            {parts?.tag}
          </span>
        )}
      </div>
      {parts?.meta}
      <div className="mt-2">
        {empty && <p data-testid="goals-empty" className="mb-2 text-[11px] text-slate-400">{date && date !== today ? "Nothing in this day yet. Add what you ate above and these fill in." : "Nothing logged today yet. Log a meal above and these fill in."}</p>}
        <div className="md:grid md:grid-cols-2 md:gap-x-10">
          <ul className="space-y-1.5">{rows.slice(0, 4).map((row) => <GoalBar key={row.key} row={row} />)}</ul>
          <div className="my-2 border-t border-slate-700/60 md:hidden" aria-hidden />
          <ul className="space-y-1.5">{rows.slice(4).map((row) => <GoalBar key={row.key} row={row} />)}</ul>
        </div>
      </div>
      {sugar > 0 && <p data-testid="goals-sugar" className="mt-2 text-[11px] text-slate-400">Sugar: {sugar.toLocaleString("en-US")} g (no daily goal)</p>}
      {parts?.last}
      {parts?.foods && (
        <details data-testid="goals-foods" className="mt-3 rounded-lg border border-slate-700/60 bg-slate-800/40 px-2.5 py-1.5">
          <summary className="cursor-pointer select-none text-[12px] font-medium text-slate-300">Foods logged ({parts.foodCount})</summary>
          <div className="mt-2 pb-1">{parts.foods}</div>
        </details>
      )}
      {parts?.actions}
      <p className="mt-2 text-[10px] leading-4 text-slate-500">
        Protein, carbs and fat are 25%, 45% and 30% of the calories. Fiber, calcium and the vitamins use the daily value.
        Amounts are the AI's best estimates, not measurements.
      </p>
    </section>
  );
}
