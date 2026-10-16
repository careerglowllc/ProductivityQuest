// The week's numbers behind the Stats widget on the phone layout: the last seven days ending today, and what looks good about them.
import { shiftIsoDate, sessionSummaries, type CalorieDayLog, type WorkoutLogEntry, type WorkoutType } from "./fitness-log";

export const lastDays = (today: string, count = 7): string[] => Array.from({ length: count }, (_, i) => shiftIsoDate(today, i - (count - 1)));

// Days in a row with something logged, counted back from today, or from yesterday while today is still empty.
function streakOf(has: (date: string) => boolean, today: string): number {
  let day = has(today) ? today : shiftIsoDate(today, -1);
  let count = 0;
  while (has(day) && count < 366) { count += 1; day = shiftIsoDate(day, -1); }
  return count;
}

const round = (n: number) => Math.round(n);

export interface CalorieWeekDay { date: string; calories: number; protein: number; logged: boolean }
export interface CalorieWeek {
  days: CalorieWeekDay[];
  loggedDays: number;
  avgCalories: number; // over the days logged
  avgProtein: number;
  streak: number;
  bestProtein: { date: string; protein: number } | null;
  vsLastWeek: number | null; // average kcal per logged day, this week minus last week; null when last week has no days
  daysUnderGoal: number;
}

export function calorieWeek(log: readonly CalorieDayLog[], today: string, goal: number): CalorieWeek {
  const byDate = new Map(log.map((d) => [d.date, d] as const));
  const logged = (date: string) => (byDate.get(date)?.calories ?? 0) > 0;
  const days: CalorieWeekDay[] = lastDays(today).map((date) => {
    const d = byDate.get(date);
    return { date, calories: round(d?.calories ?? 0), protein: round(d?.protein ?? 0), logged: logged(date) };
  });
  const loggedDays = days.filter((d) => d.logged);
  const avg = (items: { calories: number }[]) => (items.length ? items.reduce((s, d) => s + d.calories, 0) / items.length : 0);
  const previous = lastDays(shiftIsoDate(today, -7)).filter(logged).map((date) => ({ calories: byDate.get(date)!.calories }));
  const best = loggedDays.reduce<CalorieWeekDay | null>((max, d) => (d.protein > (max?.protein ?? 0) ? d : max), null);
  return {
    days, loggedDays: loggedDays.length, avgCalories: round(avg(loggedDays)),
    avgProtein: loggedDays.length ? round(loggedDays.reduce((s, d) => s + d.protein, 0) / loggedDays.length) : 0,
    streak: streakOf(logged, today), bestProtein: best ? { date: best.date, protein: best.protein } : null,
    vsLastWeek: previous.length && loggedDays.length ? round(avg(loggedDays) - avg(previous)) : null,
    daysUnderGoal: loggedDays.filter((d) => d.calories <= goal).length,
  };
}

export interface LiftWeekDay { date: string; trained: boolean; exercises: number; sets: number; volume: number; types: WorkoutType[] }
export interface LiftWeek {
  days: LiftWeekDay[];
  workouts: number; // days trained
  sets: number;
  volume: number;
  volumeChangePct: number | null; // against the 7 days before; null when those had no volume
  heaviest: { exercise: string; weight: number; date: string } | null;
  split: Record<WorkoutType, number>; // exercises logged this week by type
}

export function liftWeek(entries: readonly WorkoutLogEntry[], today: string): LiftWeek {
  const dates = lastDays(today);
  const sessions = new Map(sessionSummaries(entries).map((s) => [s.date, s] as const));
  const days: LiftWeekDay[] = dates.map((date) => {
    const rows = entries.filter((e) => e.date === date);
    const s = sessions.get(date);
    const counts = new Map<WorkoutType, number>();
    for (const row of rows) counts.set(row.workoutType, (counts.get(row.workoutType) ?? 0) + 1);
    return {
      date, trained: rows.length > 0, exercises: rows.length, sets: s?.sets ?? 0, volume: round(s?.volume ?? 0),
      types: Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([type]) => type),
    };
  });
  const volume = days.reduce((sum, d) => sum + d.volume, 0);
  const priorVolume = lastDays(shiftIsoDate(today, -7)).reduce((sum, date) => sum + round(sessions.get(date)?.volume ?? 0), 0);
  const inWeek = new Set(dates);
  let heaviest: LiftWeek["heaviest"] = null;
  const split: Record<WorkoutType, number> = { Push: 0, Pull: 0, Legs: 0 };
  for (const e of entries) {
    if (!inWeek.has(e.date)) continue;
    split[e.workoutType] += 1;
    if (e.metric?.kind === "weight" && e.metric.value > (heaviest?.weight ?? 0)) heaviest = { exercise: e.exercise, weight: e.metric.value, date: e.date };
  }
  return {
    days, workouts: days.filter((d) => d.trained).length, sets: days.reduce((sum, d) => sum + d.sets, 0), volume,
    volumeChangePct: priorVolume > 0 ? round(((volume - priorVolume) / priorVolume) * 100) : null, heaviest, split,
  };
}

// All-time line for the foot of the widget (it replaces the big count cards on the phone layout).
export const allTimeCalories = (log: readonly CalorieDayLog[]) => {
  const days = log.filter((d) => d.calories > 0);
  return { days: days.length, avgCalories: days.length ? round(days.reduce((s, d) => s + d.calories, 0) / days.length) : 0, avgProtein: days.length ? round(days.reduce((s, d) => s + d.protein, 0) / days.length) : 0 };
};

export const allTimeLifting = (entries: readonly WorkoutLogEntry[]) => ({
  sessions: new Set(entries.map((e) => e.date)).size,
  exercises: new Set(entries.map((e) => e.exercise)).size,
});
