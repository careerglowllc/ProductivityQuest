// Shared pieces of the AI fitness logging: the shapes a typed or spoken workout or meal is turned into, how the
// model's answer is checked and cleaned, and how the result is merged into the lifting and calorie logs.
// Pure functions only, so the server, the pages and the tests all use the same rules.
import { z } from "zod";

export type WorkoutType = "Push" | "Pull" | "Legs";
export type MetricKind = "weight" | "reps" | "time";
export type Confidence = "low" | "medium" | "high";
export type Completeness = "unknown/partial" | "explicitly complete";

export class FitnessParseError extends Error {}

// ── Dates ───────────────────────────────────────────────────────────────────
export const isIsoDate = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};

export const shiftIsoDate = (iso: string, days: number): string => {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

// A date the model returned is trusted only when it is real, not in the future, and within two years.
export function resolveLogDate(value: unknown, today: string): string {
  if (!isIsoDate(value)) return today;
  if (value > today || value < shiftIsoDate(today, -730)) return today;
  return value;
}

// ── Lifting ─────────────────────────────────────────────────────────────────
export interface LoggedSet { weight?: number; reps?: number; seconds?: number; bodyweight?: boolean; approx?: boolean; eachSide?: boolean; note?: string }
// `sets` are the working sets, the only ones charts, bests and volume use. Warm-up sets are kept apart in `warmupSets`, and
// `warmup` is their text (or a loose "usual warm-up" when no sets were given).
export interface ParsedExercise { name: string; workoutType: WorkoutType; kind: MetricKind; sets: LoggedSet[]; warmupSets?: LoggedSet[]; warmup?: string; notes?: string }
export interface ParsedWorkout { date: string; workoutType: WorkoutType; exercises: ParsedExercise[]; notes?: string }

// One row of the lifting log: one exercise on one day. A day's rows together are that day's session.
export interface WorkoutLogEntry {
  date: string; // YYYY-MM-DD
  workoutType: WorkoutType;
  exercise: string;
  setsRaw: string; // working sets as text, e.g. "225 lb: 6 / 6 / 6"
  warmupSets?: LoggedSet[]; // exact warm-up sets, never part of sets, the metric, the bests or the volume
  warmup?: string;
  notes?: string;
  metric: { kind: MetricKind; value: number; approx?: boolean } | null; // lb, reps or seconds; what the charts plot
  sets?: LoggedSet[]; // exact sets, kept for entries logged with AI
  logId?: string; // set on entries logged with AI, so one logging can be removed again
}

const KG_TO_LB = 2.20462;
const roundTo = (value: number, step: number) => Math.round(value / step) * step;
const cleanNumber = (value: unknown, max: number): number | undefined => {
  const n = typeof value === "string" ? Number(value.replace(/[^\d.\-]/g, "")) : value;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= max ? n : undefined;
};
const text = (value: unknown, max = 300): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.replace(/\s+/g, " ").trim().slice(0, max);
  return trimmed || undefined;
};

// Pull before Push so "leg curl" is Legs and "biceps curl" is Pull; Legs is checked first for the same reason.
const LEGS = /\b(?:squat|leg|lunge|rdl|romanian|stiff[- ]leg|calf|calve|glute|hip thrust|hamstring|quad|neck|step[- ]up|hack)s?\b/i;
const PULL = /\b(?:row|pull[- ]?up|chin[- ]?up|pulldown|lat|curl|face pull|shrug|deadlift|dead hang|hang|rear delt|reverse fly|back extension|plank)s?\b/i;
const PUSH = /\b(?:press|bench|push[- ]?up|dip|fly|flye|lateral raise|raise|tricep|pushdown|shoulder|overhead|ohp|treadmill|run|cardio)s?\b/i;
export function inferWorkoutType(name: string): WorkoutType | null {
  if (LEGS.test(name)) return "Legs";
  if (PULL.test(name)) return "Pull";
  if (PUSH.test(name)) return "Push";
  return null;
}
const asWorkoutType = (value: unknown): WorkoutType | null => {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  return v === "push" ? "Push" : v === "pull" ? "Pull" : v === "legs" || v === "leg" ? "Legs" : null;
};

const rawNumber = z.any();
const rawSet = z.object({
  weight: rawNumber.optional(), unit: z.any().optional(), reps: rawNumber.optional(), seconds: rawNumber.optional(),
  approx: z.any().optional(), eachSide: z.any().optional(), note: z.any().optional(),
}).passthrough();
const rawExercise = z.object({
  name: z.any(), kind: z.any().optional(), workoutType: z.any().optional(), sets: z.array(rawSet).optional(),
  warmupSets: z.array(rawSet).optional(), warmup: z.any().optional(), notes: z.any().optional(),
}).passthrough();
const rawWorkout = z.object({ date: z.any().optional(), workoutType: z.any().optional(), exercises: z.array(rawExercise), notes: z.any().optional() }).passthrough();

const MAX_EXERCISES = 40;
const MAX_SETS = 30;
const MAX_WARMUP_SETS = 12;
const METRIC_KINDS: readonly string[] = ["weight", "reps", "time"];

// Working or warm-up sets from the model's answer: numbers kept to what is plausible, kilos turned into pounds, and a set
// with nothing in it left out.
function cleanSets(list: z.infer<typeof rawSet>[] | undefined, max: number): LoggedSet[] {
  const sets: LoggedSet[] = [];
  for (const s of (list ?? []).slice(0, max)) {
    const unit = typeof s.unit === "string" ? s.unit.trim().toLowerCase() : "";
    const bodyweight = unit === "bw" || unit === "bodyweight";
    let weight = bodyweight ? undefined : cleanNumber(s.weight, 2000);
    let note = text(s.note, 120);
    if (weight && (unit === "kg" || unit === "kgs" || unit === "kilograms")) {
      note = [note, `${weight} kg`].filter(Boolean).join(", ");
      weight = roundTo(weight * KG_TO_LB, 0.5);
    }
    const reps = cleanNumber(s.reps, 1000);
    const seconds = cleanNumber(s.seconds, 86400);
    if (weight === undefined && reps === undefined && seconds === undefined && !bodyweight) continue;
    sets.push({
      ...(weight ? { weight } : {}), ...(reps !== undefined ? { reps } : {}), ...(seconds !== undefined ? { seconds } : {}),
      ...(bodyweight || (weight === undefined && seconds === undefined) ? { bodyweight: true } : {}),
      ...(s.approx === true ? { approx: true } : {}), ...(s.eachSide === true ? { eachSide: true } : {}), ...(note ? { note } : {}),
    });
  }
  return sets;
}

// Checks the model's answer for a workout and turns it into clean, bounded data. Throws FitnessParseError when
// nothing usable is in it. `keepEmpty` is for a workout still being built up: an exercise that has been named
// (perhaps with a warm-up) but has no working sets yet is kept instead of dropped.
export function normalizeWorkout(raw: unknown, today: string, options: { keepEmpty?: boolean } = {}): ParsedWorkout {
  const parsed = rawWorkout.safeParse(raw);
  if (!parsed.success) throw new FitnessParseError("The answer did not look like a workout.");
  const date = resolveLogDate(parsed.data.date, today);

  const exercises: ParsedExercise[] = [];
  for (const item of parsed.data.exercises.slice(0, MAX_EXERCISES)) {
    const name = text(item.name, 80);
    if (!name) continue;
    const sets = cleanSets(item.sets, MAX_SETS);
    const warmupSets = cleanSets(item.warmupSets, MAX_WARMUP_SETS);
    // Warm-up sets are the source of the warm-up text; the model's own text is only kept when it gave no sets ("usual warm-up").
    const warmup = warmupSets.length ? formatWarmupSets(warmupSets) : text(item.warmup);
    const notes = text(item.notes);
    if (sets.length === 0 && !notes && !options.keepEmpty) continue;
    // Held for time (a plank, a hang, the treadmill) is a time even when weight is added; anything with reps is by weight or reps.
    const timed = sets.some((s) => s.seconds !== undefined) && !sets.some((s) => s.reps !== undefined);
    const declared = typeof item.kind === "string" && METRIC_KINDS.includes(item.kind) ? (item.kind as MetricKind) : "reps";
    const kind: MetricKind = sets.length === 0 ? declared : timed ? "time" : sets.some((s) => s.weight) ? "weight" : "reps";
    exercises.push({
      name, kind, sets, ...(warmupSets.length ? { warmupSets } : {}), ...(warmup ? { warmup } : {}), ...(notes ? { notes } : {}),
      workoutType: asWorkoutType(item.workoutType) ?? inferWorkoutType(name) ?? "Push",
    });
  }
  if (exercises.length === 0) throw new FitnessParseError("No exercises were found in that.");

  const counts = new Map<WorkoutType, number>();
  exercises.forEach((e) => counts.set(e.workoutType, (counts.get(e.workoutType) ?? 0) + 1));
  const fallback = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
  // Cardio and other exercises with no clear type take the session's type.
  const sessionType = asWorkoutType(parsed.data.workoutType) ?? fallback;
  return { date, workoutType: sessionType, exercises, ...(text(parsed.data.notes, 500) ? { notes: text(parsed.data.notes, 500) } : {}) };
}

const fmt = (n: number) => String(Math.round(n * 100) / 100);

// Warm-up sets as short text, "60 lb x12; 90 lb x8; BW x10", the wording the older warm-up notes use.
export function formatWarmupSets(sets: readonly LoggedSet[]): string {
  return sets.map((s) => {
    const head = s.weight ? `${fmt(s.weight)} lb` : "BW";
    const rough = s.approx ? "~" : "";
    const amount = s.reps !== undefined ? ` x${rough}${fmt(s.reps)}` : s.seconds !== undefined ? ` ${rough}${fmt(s.seconds)} sec` : "";
    return `${head}${amount}${s.eachSide ? " each side" : ""}${s.note ? ` (${s.note})` : ""}`;
  }).join("; ");
}

// "225 lb: 6 / 6 / 6", "BW: 8 / 6 / 3", "70 lb: 5 / 5; 65 lb: 6", "BW: 45 sec", "~8" for a rough count.
export function formatSets(exercise: Pick<ParsedExercise, "sets"> & Partial<Pick<ParsedExercise, "warmup" | "warmupSets" | "notes">>): string {
  if (exercise.sets.length === 0) return exercise.notes ? "Notes only" : exercise.warmup || exercise.warmupSets?.length ? "Warm-up only" : "No sets yet";
  const groups: { head: string; parts: string[] }[] = [];
  for (const s of exercise.sets) {
    const head = s.weight ? `${fmt(s.weight)} lb` : s.bodyweight || s.reps !== undefined || s.seconds !== undefined ? "BW" : "";
    const part = s.reps !== undefined ? `${s.approx ? "~" : ""}${fmt(s.reps)}` : s.seconds !== undefined ? `${s.approx ? "~" : ""}${fmt(s.seconds)} sec` : "?";
    const last = groups[groups.length - 1];
    if (last && last.head === head) last.parts.push(part); else groups.push({ head, parts: [part] });
  }
  const body = groups.map((g) => (g.head ? `${g.head}: ${g.parts.join(" / ")}` : g.parts.join(" / "))).join("; ");
  return exercise.sets.every((s) => s.eachSide) ? `${body} each side` : body;
}

export function exerciseMetric(exercise: Pick<ParsedExercise, "kind" | "sets">): WorkoutLogEntry["metric"] {
  const pick = (kind: MetricKind, get: (s: LoggedSet) => number | undefined) => {
    const values = exercise.sets.map(get).filter((v): v is number => v !== undefined && v > 0);
    return values.length ? { kind, value: Math.max(...values), ...(exercise.sets.some((s) => s.approx) ? { approx: true } : {}) } : null;
  };
  if (exercise.kind === "weight") return pick("weight", (s) => s.weight) ?? pick("reps", (s) => s.reps);
  if (exercise.kind === "time") return pick("time", (s) => s.seconds);
  return pick("reps", (s) => s.reps);
}

export function workoutToLogEntries(workout: ParsedWorkout, logId: string): WorkoutLogEntry[] {
  return workout.exercises.map((ex) => {
    const notes = [ex.notes, ex.sets.map((s) => s.note).filter(Boolean).join("; ")].filter(Boolean).join(" · ");
    const warmup = ex.warmup ?? (ex.warmupSets?.length ? formatWarmupSets(ex.warmupSets) : undefined);
    return {
      date: workout.date, workoutType: ex.workoutType, exercise: ex.name, setsRaw: formatSets(ex),
      ...(warmup ? { warmup } : {}), ...(ex.warmupSets?.length ? { warmupSets: ex.warmupSets } : {}), ...(notes ? { notes } : {}),
      metric: exerciseMetric(ex), sets: ex.sets, logId,
    };
  });
}

// New rows are added next to the existing ones, tagged so the logging can be undone. A day can hold several loggings.
export const addWorkoutEntries = (log: WorkoutLogEntry[], entries: WorkoutLogEntry[]): WorkoutLogEntry[] => [...log, ...entries];
export const removeWorkoutLogging = (log: WorkoutLogEntry[], logId: string): WorkoutLogEntry[] => log.filter((e) => e.logId !== logId);

// What is saved when a workout is ended: an exercise that was named but never got a set, a warm-up or a note is
// left out, so the log has no empty rows.
export function finishWorkout(workout: ParsedWorkout): ParsedWorkout {
  return { ...workout, exercises: workout.exercises.filter((e) => e.sets.length > 0 || e.warmup || e.notes) };
}

export const removeExercise = (workout: ParsedWorkout, index: number): ParsedWorkout =>
  ({ ...workout, exercises: workout.exercises.filter((_, i) => i !== index) });

// A row's notes are the exercise's own notes followed by any notes on single sets (see workoutToLogEntries); this
// takes the set notes off again.
function exerciseNotesOf(entry: WorkoutLogEntry): string | undefined {
  const setNotes = (entry.sets ?? []).map((s) => s.note).filter(Boolean).join("; ");
  const notes = entry.notes ?? "";
  if (!setNotes) return notes || undefined;
  if (notes === setNotes) return undefined;
  if (notes.endsWith(` · ${setNotes}`)) return notes.slice(0, -(setNotes.length + 3)) || undefined;
  return notes;
}

// Turns the rows of one AI logging back into a workout that can be edited and saved again. Null when there are no
// such rows, or when some row was not logged with AI (it has no exact sets to edit).
export function workoutFromEntries(log: readonly WorkoutLogEntry[], logId: string): ParsedWorkout | null {
  const rows = log.filter((e) => e.logId === logId);
  if (rows.length === 0 || rows.some((e) => !Array.isArray(e.sets))) return null;
  const exercises: ParsedExercise[] = rows.map((e) => {
    const sets = (e.sets ?? []).map((s) => ({ ...s }));
    const notes = exerciseNotesOf(e);
    return {
      name: e.exercise, workoutType: e.workoutType, kind: e.metric?.kind ?? (sets.some((s) => s.seconds !== undefined) ? "time" : "reps"), sets,
      ...(e.warmupSets?.length ? { warmupSets: e.warmupSets.map((s) => ({ ...s })) } : {}),
      ...(e.warmup ? { warmup: e.warmup } : {}), ...(notes ? { notes } : {}),
    };
  });
  const counts = new Map<WorkoutType, number>();
  exercises.forEach((e) => counts.set(e.workoutType, (counts.get(e.workoutType) ?? 0) + 1));
  const workoutType = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
  return { date: rows[0].date, workoutType, exercises };
}

export interface SessionSummary { date: string; exercises: number; sets: number; volume: number }
const SETS_RAW = /^~?(\d+(?:\.\d+)?)\s*lb[^:]*:\s*(.+)$/i;
// Total weight lifted in each session (weight x reps over every set), from exact sets when there are any, otherwise
// from text such as "225 lb: 6 / 6 / 6". Rows it cannot read count as an exercise but add no volume.
export function sessionSummaries(entries: readonly WorkoutLogEntry[]): SessionSummary[] {
  const byDate = new Map<string, SessionSummary>();
  for (const e of entries) {
    const day = byDate.get(e.date) ?? { date: e.date, exercises: 0, sets: 0, volume: 0 };
    day.exercises += 1;
    if (e.sets) {
      for (const s of e.sets) { day.sets += 1; if (s.weight && s.reps) day.volume += s.weight * s.reps * (s.eachSide ? 2 : 1); }
    } else {
      const match = SETS_RAW.exec(e.setsRaw);
      if (match) {
        const reps = match[2].split("/").map((part) => Number(part.replace(/[^\d.]/g, ""))).filter((n) => Number.isFinite(n) && n > 0);
        day.sets += reps.length; day.volume += Number(match[1]) * reps.reduce((a, b) => a + b, 0);
      }
    }
    byDate.set(e.date, day);
  }
  return Array.from(byDate.values()).map((d) => ({ ...d, volume: Math.round(d.volume) })).sort((a, b) => a.date.localeCompare(b.date));
}

// ── Nutrition ───────────────────────────────────────────────────────────────
export const NUTRIENTS = ["calories", "protein", "carbs", "fat", "satFat", "fiber", "sugar", "sodium", "calcium", "magnesium", "potassium", "iron", "vitaminC", "vitaminA", "vitaminD"] as const;
export type NutrientKey = (typeof NUTRIENTS)[number];
export type NutrientTotals = Record<NutrientKey, number>;
export const NUTRIENT_INFO: Record<NutrientKey, { label: string; unit: string; limit: number }> = {
  calories: { label: "Calories", unit: "kcal", limit: 5000 }, protein: { label: "Protein", unit: "g", limit: 400 },
  carbs: { label: "Carbs", unit: "g", limit: 800 }, fat: { label: "Fat", unit: "g", limit: 400 },
  satFat: { label: "Saturated fat", unit: "g", limit: 200 }, fiber: { label: "Fiber", unit: "g", limit: 150 },
  sugar: { label: "Sugar", unit: "g", limit: 500 }, sodium: { label: "Sodium", unit: "mg", limit: 20000 },
  calcium: { label: "Calcium", unit: "mg", limit: 6000 }, magnesium: { label: "Magnesium", unit: "mg", limit: 3000 },
  potassium: { label: "Potassium", unit: "mg", limit: 15000 }, iron: { label: "Iron", unit: "mg", limit: 200 },
  vitaminC: { label: "Vitamin C", unit: "mg", limit: 5000 }, vitaminA: { label: "Vitamin A", unit: "mcg", limit: 20000 },
  vitaminD: { label: "Vitamin D", unit: "mcg", limit: 1000 },
};

export interface ParsedFoodItem extends NutrientTotals { name: string; quantity?: string; confidence: Confidence }
export interface ParsedMeal { date: string; items: ParsedFoodItem[]; totals: NutrientTotals; description: string; confidence: Confidence; dayComplete: boolean; notes?: string }
export interface LoggedMeal { id: string; loggedAt: string; text: string; description: string; items: ParsedFoodItem[]; totals: NutrientTotals; confidence: Confidence }

// One day of the calorie log. Totals include every meal logged with AI; `meals` lists those so one can be removed again.
export interface CalorieDayLog {
  date: string; // YYYY-MM-DD
  calories: number; protein: number; carbs: number; fat: number; sodium: number; magnesium: number; calcium: number; vitaminC: number; vitaminA: number;
  satFat?: number; fiber?: number; sugar?: number; potassium?: number; iron?: number; vitaminD?: number;
  foodDetails: string; // what was eaten before AI logging; meals logged with AI are described in `meals`
  completeness: Completeness; confidence: Confidence; notes?: string;
  meals?: LoggedMeal[];
}

const rawItem = z.object({ name: z.any(), quantity: z.any().optional(), confidence: z.any().optional() }).passthrough();
const rawMeal = z.object({ date: z.any().optional(), dayComplete: z.any().optional(), items: z.array(rawItem), notes: z.any().optional() }).passthrough();
const asConfidence = (value: unknown): Confidence => (value === "high" || value === "low" ? value : "medium");
const roundNutrient = (key: NutrientKey, value: number) => (NUTRIENT_INFO[key].unit === "g" ? Math.round(value * 10) / 10 : Math.round(value));
const emptyTotals = (): NutrientTotals => Object.fromEntries(NUTRIENTS.map((k) => [k, 0])) as NutrientTotals;

export function sumNutrients(items: readonly NutrientTotals[]): NutrientTotals {
  const total = emptyTotals();
  for (const item of items) for (const key of NUTRIENTS) total[key] += item[key] ?? 0;
  for (const key of NUTRIENTS) total[key] = roundNutrient(key, total[key]);
  return total;
}

const lowest = (values: Confidence[]): Confidence => (values.includes("low") ? "low" : values.includes("medium") ? "medium" : "high");
const MAX_ITEMS = 40;

// Checks the model's answer for a meal. Each item's numbers are limited to what is plausible, a missing calorie
// figure is worked out from the macros, and the totals are always added up here rather than trusted from the model.
export function normalizeMeal(raw: unknown, today: string): ParsedMeal {
  const parsed = rawMeal.safeParse(raw);
  if (!parsed.success) throw new FitnessParseError("The answer did not look like a meal.");
  const items: ParsedFoodItem[] = [];
  for (const item of parsed.data.items.slice(0, MAX_ITEMS)) {
    const name = text(item.name, 100);
    if (!name) continue;
    const food = { ...emptyTotals(), name, confidence: asConfidence(item.confidence), ...(text(item.quantity, 60) ? { quantity: text(item.quantity, 60) } : {}) } as ParsedFoodItem;
    for (const key of NUTRIENTS) food[key] = cleanNumber((item as Record<string, unknown>)[key], NUTRIENT_INFO[key].limit) ?? 0;
    if (food.calories === 0 && (food.protein || food.carbs || food.fat)) food.calories = Math.round(food.protein * 4 + food.carbs * 4 + food.fat * 9);
    for (const key of NUTRIENTS) food[key] = roundNutrient(key, food[key]);
    items.push(food);
  }
  if (items.length === 0) throw new FitnessParseError("No food was found in that.");
  return {
    date: resolveLogDate(parsed.data.date, today), items, totals: sumNutrients(items),
    description: mealDescription(items), confidence: lowest(items.map((i) => i.confidence)), dayComplete: parsed.data.dayComplete === true,
    ...(text(parsed.data.notes, 400) ? { notes: text(parsed.data.notes, 400) } : {}),
  };
}

export const mealDescription = (items: readonly Pick<ParsedFoodItem, "name" | "quantity">[]): string =>
  items.map((i) => (i.quantity && !i.name.toLowerCase().includes(i.quantity.toLowerCase()) ? `${i.quantity} ${i.name}` : i.name)).join("; ");

const copyDay = (day: CalorieDayLog): CalorieDayLog => ({ ...day });
const addTo = (day: CalorieDayLog, totals: NutrientTotals, sign: 1 | -1) => {
  for (const key of NUTRIENTS) {
    const next = Math.max(0, roundNutrient(key, ((day[key] as number | undefined) ?? 0) + sign * (totals[key] ?? 0)));
    (day as unknown as Record<string, number>)[key] = next;
  }
};

// Adds a logged meal to its day (creating the day when it is new): the day's totals grow by the meal's, and the meal is
// kept in the day's list.
export function addMealToDay(days: readonly CalorieDayLog[], meal: ParsedMeal, id: string, loggedAt: string, sourceText: string): CalorieDayLog[] {
  const existing = days.find((d) => d.date === meal.date);
  const day: CalorieDayLog = existing ? copyDay(existing) : {
    date: meal.date, calories: 0, protein: 0, carbs: 0, fat: 0, sodium: 0, magnesium: 0, calcium: 0, vitaminC: 0, vitaminA: 0,
    foodDetails: "", completeness: "unknown/partial", confidence: meal.confidence,
  };
  addTo(day, meal.totals, 1);
  day.meals = [...(existing?.meals ?? []), { id, loggedAt, text: sourceText.slice(0, 2000), description: meal.description, items: meal.items, totals: meal.totals, confidence: meal.confidence }];
  day.confidence = existing ? lowest([existing.confidence, meal.confidence]) : meal.confidence;
  if (meal.dayComplete) day.completeness = "explicitly complete";
  return [...days.filter((d) => d.date !== meal.date), day].sort((a, b) => a.date.localeCompare(b.date));
}

// Takes one logged meal back out: its totals come off the day, and a day that is then empty is removed.
export function removeMealFromDay(days: readonly CalorieDayLog[], date: string, mealId: string): CalorieDayLog[] {
  const existing = days.find((d) => d.date === date);
  const meal = existing?.meals?.find((m) => m.id === mealId);
  if (!existing || !meal) return [...days];
  const day = copyDay(existing);
  addTo(day, meal.totals, -1);
  day.meals = (existing.meals ?? []).filter((m) => m.id !== mealId);
  if (day.meals.length === 0) delete day.meals;
  const empty = !day.meals && day.calories === 0 && !day.foodDetails;
  return [...days.filter((d) => d.date !== date), ...(empty ? [] : [day])].sort((a, b) => a.date.localeCompare(b.date));
}

// Takes a logged meal out of whichever day holds it (the day may have been changed since it was saved).
export function removeMealEverywhere(days: readonly CalorieDayLog[], mealId: string): CalorieDayLog[] {
  const holder = days.find((d) => d.meals?.some((m) => m.id === mealId));
  return holder ? removeMealFromDay(days, holder.date, mealId) : [...days];
}

// A meal with its items changed: the totals, description and confidence are worked out again from the items.
// Unlike normalizeMeal this accepts no items at all, for a day's food list that has been emptied.
export function rebuildMeal(meal: ParsedMeal, items: ParsedFoodItem[]): ParsedMeal {
  return { ...meal, items, totals: sumNutrients(items), description: mealDescription(items), confidence: items.length ? lowest(items.map((i) => i.confidence)) : "medium" };
}

export const removeFoodItem = (meal: ParsedMeal, index: number): ParsedMeal => rebuildMeal(meal, meal.items.filter((_, i) => i !== index));

// A meal that was saved to a day, as an editable meal again.
export function mealFromLogged(day: Pick<CalorieDayLog, "date">, meal: LoggedMeal): ParsedMeal {
  return { date: day.date, items: meal.items.map((i) => ({ ...i })), totals: sumNutrients(meal.items), description: meal.description, confidence: meal.confidence, dayComplete: false };
}

// Everything eaten that day, for tables and callouts: the older description plus each meal logged with AI.
export const dayFoodDetails = (day: Pick<CalorieDayLog, "foodDetails" | "meals">): string =>
  [day.foodDetails, ...(day.meals ?? []).map((m) => m.description)].filter(Boolean).join("; ");

// Calories from protein, carbs and fat for the macro chart.
export const macroCalories = (day: Pick<CalorieDayLog, "protein" | "carbs" | "fat">) => ({
  protein: Math.round(day.protein * 4), carbs: Math.round(day.carbs * 4), fat: Math.round(day.fat * 9),
});

// The latest AI loggings, newest first, for the "Logged with AI" lists. Rows added together share a logId; the
// log is kept in the order things were added, so a later row is a newer logging.
export function recentWorkoutLoggings(log: readonly WorkoutLogEntry[], limit = 5): { logId: string; date: string; exercises: string[] }[] {
  const groups = new Map<string, { logId: string; date: string; exercises: string[] }>();
  for (const entry of log) {
    if (!entry.logId) continue;
    const group = groups.get(entry.logId) ?? { logId: entry.logId, date: entry.date, exercises: [] };
    group.exercises.push(entry.exercise);
    groups.set(entry.logId, group);
  }
  return Array.from(groups.values()).reverse().slice(0, limit);
}

export function recentMeals(days: readonly CalorieDayLog[], limit = 5): { id: string; date: string; description: string; calories: number; loggedAt: string }[] {
  return days.flatMap((day) => (day.meals ?? []).map((m) => ({ id: m.id, date: day.date, description: m.description, calories: m.totals.calories, loggedAt: m.loggedAt })))
    .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)).slice(0, limit);
}
