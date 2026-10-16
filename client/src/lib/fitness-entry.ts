import { apiRequest } from "@/lib/queryClient";
import { localDay } from "@/lib/quotes";
import { NUTRIENT_INFO, formatSets, removeExercise, removeFoodItem, type NutrientKey, type ParsedMeal, type ParsedWorkout } from "@shared/fitness-log";
import { planCheck, planHasContent, type RoutinePlan } from "@shared/fitness-routine";
import {
  addEntry, describeMealChange, describeWorkoutChange, mealHasContent, newDraft, recentMessages, setDraftDate, undoEntry, workoutHasContent,
  type MealDraft, type WorkoutDraft,
} from "@shared/fitness-session";

export type FitnessKind = "workout" | "meal";
export type ParseResult = { kind: "workout"; workout: ParsedWorkout } | { kind: "meal"; meal: ParsedMeal };

export const localToday = (now = new Date()): string => localDay(now);

// The server answers with { message } on errors; the request helper wraps that as "422: {...}".
export function fitnessErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "";
  try {
    const body = JSON.parse(raw.slice(raw.indexOf("{")));
    if (typeof body.message === "string" && body.message) return body.message;
  } catch { /* not JSON */ }
  return "Could not reach the AI. Check your connection and try again.";
}

export type FitnessDraft = WorkoutDraft | MealDraft;

// Sends what was just typed, together with the day so far and the messages before it, and gets back the whole updated day.
export async function requestSessionUpdate(kind: FitnessKind, text: string, draft: FitnessDraft | null, today = localToday(), plan?: RoutinePlan): Promise<ParseResult> {
  const context = draft ? { current: draft.summary, recent: recentMessages(draft) } : {};
  // What a Push, Pull and Legs day usually hold, so the AI can recognise the lifts and the day.
  const routine = kind === "workout" && planHasContent(plan) ? { routine: plan } : {};
  const response = await apiRequest("POST", "/api/fitness/parse", { kind, text, today, session: true, ...context, ...routine });
  return response.json();
}

// Plain-language lines for each exercise of the day so far.
export function describeWorkout(workout: ParsedWorkout): { title: string; detail: string }[] {
  return workout.exercises.map((ex) => ({
    title: `${ex.name} · ${ex.workoutType}`,
    detail: [ex.sets.length ? formatSets(ex) : "No sets yet", ex.warmup ? `Warm-up: ${ex.warmup}` : "", ex.notes ?? ""].filter(Boolean).join(" — "),
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

export const newLogId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ── The day being built up ──────────────────────────────────────────────────
export const draftLines = (kind: FitnessKind, draft: FitnessDraft): { title: string; detail: string }[] =>
  kind === "workout" ? describeWorkout((draft as WorkoutDraft).summary) : describeMeal((draft as MealDraft).summary);

export const draftHasContent = (kind: FitnessKind, draft: FitnessDraft): boolean =>
  kind === "workout" ? workoutHasContent((draft as WorkoutDraft).summary) : mealHasContent((draft as MealDraft).summary);

// Applies the AI's updated day. The first message starts a new day; a later one replaces the summary and keeps one step
// to undo. When the answer changes nothing the draft is returned as it was, with no changes listed.
export function applyUpdate(kind: FitnessKind, draft: FitnessDraft | null, result: ParseResult, text: string, now: Date, newId: () => string): { draft: FitnessDraft; changes: string[] } {
  if (result.kind !== kind) throw new Error("The AI answered with the wrong kind of log.");
  if (result.kind === "workout") {
    const before = draft ? (draft as WorkoutDraft).summary : null;
    const changes = describeWorkoutChange(before, result.workout);
    if (!draft) return { draft: newDraft(newId(), now, text, result.workout), changes };
    return changes.length ? { draft: addEntry(draft as WorkoutDraft, now, text, result.workout), changes } : { draft, changes };
  }
  const before = draft ? (draft as MealDraft).summary : null;
  const changes = describeMealChange(before, result.meal);
  if (!draft) return { draft: newDraft(newId(), now, text, result.meal), changes };
  return changes.length ? { draft: addEntry(draft as MealDraft, now, text, result.meal), changes } : { draft, changes };
}

// Takes one exercise or food item out of the day by hand.
export function removeDraftItem(kind: FitnessKind, draft: FitnessDraft, index: number, now: Date): FitnessDraft {
  return kind === "workout"
    ? addEntry(draft as WorkoutDraft, now, null, removeExercise((draft as WorkoutDraft).summary, index))
    : addEntry(draft as MealDraft, now, null, removeFoodItem((draft as MealDraft).summary, index));
}

// Undo and moving the day work the same for both kinds; these keep the draft's type for the page.
export const undoDraft = (draft: FitnessDraft, now: Date): FitnessDraft => undoEntry(draft as WorkoutDraft, now);
export const moveDraft = (draft: FitnessDraft, now: Date, date: string): FitnessDraft => setDraftDate(draft as WorkoutDraft, now, date);

const dateOf = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
export const formatDayLabel = (iso: string): string => dateOf(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
export const formatDayShort = (iso: string): string => dateOf(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// "Today's pull day" or "Today's food" for today, with the date for an earlier day.
export function draftTitle(kind: FitnessKind, draft: FitnessDraft, today: string): string {
  const isToday = draft.date === today;
  if (kind === "workout") {
    const type = (draft as WorkoutDraft).summary.workoutType.toLowerCase();
    return isToday ? `Today's ${type} day` : `${type[0].toUpperCase()}${type.slice(1)} day · ${formatDayLabel(draft.date)}`;
  }
  return isToday ? "Today's food" : `Food · ${formatDayLabel(draft.date)}`;
}

// One line under the workout summary: how much of this type of day's plan is done, and what is still to do.
export function planCheckText(plan: RoutinePlan | undefined, draft: FitnessDraft): string | null {
  const summary = (draft as WorkoutDraft).summary;
  if (!planHasContent(plan) || !summary.exercises) return null;
  const check = planCheck(plan, summary.workoutType, summary.exercises);
  if (check.planned === 0) return null;
  const more = (names: string[]) => (names.length > 4 ? `${names.slice(0, 4).join(", ")} +${names.length - 4} more` : names.join(", "));
  return [
    `${summary.workoutType} plan: ${check.done.length} of ${check.planned} done`,
    check.remaining.length ? `still to do: ${more(check.remaining)}` : "all done",
    ...(check.extra.length ? [`not in the plan: ${more(check.extra)}`] : []),
  ].join(" · ");
}
