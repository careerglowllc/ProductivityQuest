import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import type { CalorieWeek, LiftWeek } from "@shared/fitness-stats";
import { useStatsOpen } from "@/hooks/use-stats-open";
import {
  calorieBars, calorieHighlights, calorieLogRows, calorieStatsSubtitle, liftBars, liftHighlights, liftLogRows, liftStatsSubtitle,
  type BarDay, type LogRow,
} from "@/lib/fitness-stats-text";

const BAR_AREA = 72; // px of the tallest bar

// Seven bars for the week, today in the accent colour. A dashed line marks the goal when there is one.
function WeekBars({ days, goal, accent, unit }: { days: BarDay[]; goal?: number; accent: string; unit: string }) {
  const max = Math.max(1, goal ?? 0, ...days.map((d) => d.value));
  const height = (value: number) => (value > 0 ? Math.max(3, Math.round((value / max) * BAR_AREA)) : 2);
  return (
    <div data-testid="week-bars" role="img" aria-label={`This week, ${unit} per day`} className="relative">
      <div className="relative flex items-end justify-between gap-1.5" style={{ height: BAR_AREA + 14 }}>
        {goal !== undefined && (
          <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-slate-500/70" data-testid="goal-line" style={{ bottom: Math.round((goal / max) * BAR_AREA) }}>
            <span className="absolute -top-3 right-0 text-[9px] text-slate-500">goal {goal.toLocaleString("en-US")}</span>
          </div>
        )}
        {days.map((d) => (
          <div key={d.key} className="flex flex-1 flex-col items-center justify-end gap-0.5">
            <span className="h-3 text-[9px] leading-3 text-slate-400">{d.short}</span>
            <div
              data-testid={d.isToday ? "bar-today" : "bar"}
              className={`w-full rounded-t ${d.value > 0 ? "" : "bg-slate-700/60"}`}
              style={{ height: height(d.value), ...(d.value > 0 ? { backgroundColor: accent, opacity: d.isToday ? 1 : 0.55 } : {}) }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between gap-1.5">
        {days.map((d) => (
          <span key={d.key} className={`flex-1 text-center text-[10px] ${d.isToday ? "font-bold text-white" : "text-slate-500"}`}>{d.letter}</span>
        ))}
      </div>
    </div>
  );
}

function Tile({ value, label, accent }: { value: string; label: string; accent: string }) {
  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 px-2 py-1.5 text-center">
      <p className="text-base font-bold leading-tight" style={{ color: accent }}>{value}</p>
      <p className="text-[9px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function WeeklyLog({ rows }: { rows: LogRow[] }) {
  return (
    <ul data-testid="week-log" className="divide-y divide-slate-800/80 rounded-lg border border-slate-700/50 bg-slate-900/40">
      {rows.map((r) => (
        <li key={r.key} className="flex items-center justify-between gap-3 px-2.5 py-1.5 text-[12px]">
          <span className={`w-14 shrink-0 ${r.isToday ? "font-semibold text-white" : "text-slate-400"}`}>{r.label}</span>
          <span className={`min-w-0 flex-1 truncate text-right ${r.empty ? "text-slate-600" : "text-slate-200"}`}>{r.text}</span>
        </li>
      ))}
    </ul>
  );
}

function Highlights({ items, accent }: { items: string[]; accent: string }) {
  return (
    <div data-testid="highlights" className="flex flex-wrap gap-1.5">
      {items.map((text) => (
        <span key={text} className="rounded-full border px-2 py-0.5 text-[11px] text-slate-200" style={{ borderColor: `${accent}55`, backgroundColor: `${accent}14` }}>{text}</span>
      ))}
    </div>
  );
}

// A collapsible widget under the entry box. Open by default; the choice is remembered on the account.
export function StatsWidget({ kind, subtitle, children }: { kind: "workout" | "meal"; subtitle: string; children: ReactNode }) {
  const [open, setOpen] = useStatsOpen(kind);
  const id = `stats-body-${kind}`;
  return (
    <section data-testid={`stats-${kind}`} aria-label="Stats" className="mb-6 rounded-2xl border border-slate-700/60 bg-slate-900/50">
      <button
        type="button"
        data-testid="stats-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-sm font-bold text-white">Stats</span>
          <span data-testid="stats-subtitle" className="block truncate text-[11px] text-slate-400">{open ? "This week" : subtitle}</span>
        </span>
        <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div id={id} hidden={!open} data-testid="stats-body" className="space-y-3 px-4 pb-4">{children}</div>
    </section>
  );
}

export function CalorieStats({ week, today, goal, accent, allTime }: {
  week: CalorieWeek; today: string; goal: number; accent: string; allTime: { days: number; avgCalories: number; avgProtein: number };
}) {
  return (
    <StatsWidget kind="meal" subtitle={calorieStatsSubtitle(week)}>
      <div className="grid grid-cols-3 gap-2">
        <Tile value={week.loggedDays ? week.avgCalories.toLocaleString("en-US") : "—"} label="Avg kcal" accent={accent} />
        <Tile value={week.loggedDays ? `${week.avgProtein}g` : "—"} label="Avg protein" accent={accent} />
        <Tile value={`${week.loggedDays}/7`} label="Days logged" accent={accent} />
      </div>
      <WeekBars days={calorieBars(week, today)} goal={goal} accent={accent} unit="calories" />
      <Highlights items={calorieHighlights(week)} accent={accent} />
      <WeeklyLog rows={calorieLogRows(week, today)} />
      <p data-testid="all-time" className="text-center text-[10px] text-slate-500">
        All time: {allTime.days} days logged · avg {allTime.avgCalories.toLocaleString("en-US")} kcal · {allTime.avgProtein}g protein
      </p>
    </StatsWidget>
  );
}

export function LiftStats({ week, today, accent, allTime }: { week: LiftWeek; today: string; accent: string; allTime: { sessions: number; exercises: number } }) {
  return (
    <StatsWidget kind="workout" subtitle={liftStatsSubtitle(week)}>
      <div className="grid grid-cols-3 gap-2">
        <Tile value={String(week.workouts)} label="Workouts" accent={accent} />
        <Tile value={week.volume > 0 ? week.volume.toLocaleString("en-US") : "—"} label="Volume (lb)" accent={accent} />
        <Tile value={String(week.sets)} label="Sets" accent={accent} />
      </div>
      <WeekBars days={liftBars(week, today)} accent={accent} unit="volume in pounds" />
      <Highlights items={liftHighlights(week)} accent={accent} />
      <WeeklyLog rows={liftLogRows(week, today)} />
      <p data-testid="all-time" className="text-center text-[10px] text-slate-500">
        All time: {allTime.sessions} sessions · {allTime.exercises} exercises tracked
      </p>
    </StatsWidget>
  );
}
