import { apiRequest } from "@/lib/queryClient";
import { localDay } from "@/lib/quotes";
import { NUTRIENT_INFO, formatSets, isIsoDate, type NutrientKey, type ParsedMeal, type ParsedWorkout } from "@shared/fitness-log";

export type FitnessKind = "workout" | "meal";
export type ParseResult = { kind: "workout"; workout: ParsedWorkout } | { kind: "meal"; meal: ParsedMeal };

export const localToday = (now = new Date()): string => localDay(now);

// Adds a dictated phrase to what is already typed, with one space between them and no doubled spaces.
export function joinTranscript(existing: string, spoken: string): string {
  const add = spoken.replace(/\s+/g, " ").trim();
  if (!add) return existing;
  const base = existing.replace(/\s+$/, "");
  return base ? `${base} ${add}` : add;
}

// The server answers with { message } on errors; the request helper wraps that as "422: {...}".
export function fitnessErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "";
  try {
    const body = JSON.parse(raw.slice(raw.indexOf("{")));
    if (typeof body.message === "string" && body.message) return body.message;
  } catch { /* not JSON */ }
  return "Could not reach the AI. Check your connection and try again.";
}

export async function requestParse(kind: FitnessKind, text: string, today = localToday()): Promise<ParseResult> {
  const response = await apiRequest("POST", "/api/fitness/parse", { kind, text, today });
  return response.json();
}

// Plain-language lines for the confirmation step, so nothing is saved that you have not seen.
export function describeWorkout(workout: ParsedWorkout): { title: string; detail: string }[] {
  return workout.exercises.map((ex) => ({
    title: `${ex.name} · ${ex.workoutType}`,
    detail: [formatSets(ex), ex.warmup ? `Warm-up: ${ex.warmup}` : "", ex.notes ?? ""].filter(Boolean).join(" — "),
  }));
}

const SHOWN: NutrientKey[] = ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium", "calcium"];
export const nutrientText = (totals: Record<NutrientKey, number>, keys: NutrientKey[] = SHOWN): string =>
  keys.map((key) => `${NUTRIENT_INFO[key].label} ${totals[key].toLocaleString("en-US")}${NUTRIENT_INFO[key].unit === "kcal" ? "" : NUTRIENT_INFO[key].unit}`).join(" · ");

export function describeMeal(meal: ParsedMeal): { title: string; detail: string }[] {
  return meal.items.map((item) => ({
    title: `${item.quantity ? `${item.quantity} ` : ""}${item.name}${item.confidence === "low" ? " (rough guess)" : ""}`,
    detail: nutrientText(item, ["calories", "protein", "carbs", "fat"]),
  }));
}

// The date can be corrected on the confirmation step; anything that is not a real date leaves the answer as it was.
export function withEditedDate(result: ParseResult, date: string): ParseResult {
  if (!isIsoDate(date)) return result;
  return result.kind === "workout" ? { kind: "workout", workout: { ...result.workout, date } } : { kind: "meal", meal: { ...result.meal, date } };
}

export const newLogId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
