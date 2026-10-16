// What the open day adds to today's numbers, and today's running totals, for the thin "today" row on the phone layout.
import {
  addMealToDay, addWorkoutEntries, finishWorkout, removeMealEverywhere, removeWorkoutLogging, sessionSummaries, workoutToLogEntries,
  type CalorieDayLog, type WorkoutLogEntry, type WorkoutType,
} from "./fitness-log";
import { mealHasContent, type MealDraft, type WorkoutDraft } from "./fitness-session";

// The calorie log as it would be if the open day were ended now, so numbers update with every message. The saved log is not changed.
export function mealLogWithDraft(log: readonly CalorieDayLog[], draft: MealDraft | null): CalorieDayLog[] {
  if (!draft) return [...log];
  const without = removeMealEverywhere(log, draft.id);
  return mealHasContent(draft.summary) ? addMealToDay(without, draft.summary, draft.id, draft.updatedAt, "") : without;
}

export function workoutLogWithDraft(entries: readonly WorkoutLogEntry[], draft: WorkoutDraft | null): WorkoutLogEntry[] {
  if (!draft) return [...entries];
  const without = removeWorkoutLogging([...entries], draft.id);
  const workout = finishWorkout(draft.summary);
  return workout.exercises.length ? addWorkoutEntries(without, workoutToLogEntries(workout, draft.id)) : without;
}

export interface TodayMeals { hasAny: boolean; calories: number; protein: number; carbs: number; fat: number }

export function todayMeals(log: readonly CalorieDayLog[], today: string): TodayMeals {
  const day = log.find((d) => d.date === today);
  if (!day || !(day.calories > 0)) return { hasAny: false, calories: 0, protein: 0, carbs: 0, fat: 0 };
  return { hasAny: true, calories: Math.round(day.calories), protein: Math.round(day.protein), carbs: Math.round(day.carbs), fat: Math.round(day.fat) };
}

export interface TodayLift { hasAny: boolean; exercises: number; sets: number; volume: number; types: WorkoutType[] }

export function todayLift(entries: readonly WorkoutLogEntry[], today: string): TodayLift {
  const rows = entries.filter((e) => e.date === today);
  if (rows.length === 0) return { hasAny: false, exercises: 0, sets: 0, volume: 0, types: [] };
  const [session] = sessionSummaries(rows);
  const counts = new Map<WorkoutType, number>();
  for (const row of rows) counts.set(row.workoutType, (counts.get(row.workoutType) ?? 0) + 1);
  const types = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([type]) => type);
  return { hasAny: true, exercises: rows.length, sets: session.sets, volume: session.volume, types };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export interface StripText { empty: boolean; main: string; detail: string }

// The words in the thin row. Empty days get a short invitation instead of zeros.
export function mealStripText(today: TodayMeals): StripText {
  if (!today.hasAny) return { empty: true, main: "Nothing logged yet", detail: "Tell me what you ate below" };
  return { empty: false, main: `${today.calories.toLocaleString("en-US")} kcal`, detail: `P ${today.protein}g · C ${today.carbs}g · F ${today.fat}g` };
}

export function liftStripText(today: TodayLift): StripText {
  if (!today.hasAny) return { empty: true, main: "No workout yet", detail: "Log your first exercise below" };
  const volume = today.volume > 0 ? ` · ${Math.round(today.volume).toLocaleString("en-US")} lb` : "";
  return { empty: false, main: today.types.join(" + "), detail: `${plural(today.exercises, "exercise")} · ${plural(today.sets, "set")}${volume}` };
}
