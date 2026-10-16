// A person's routine: what a Push, a Pull and a Legs day usually hold. It is typed as text (one exercise per line, with sets if
// they like), turned into a plan here, and then used three ways: the AI is told it, exercises are matched to it, and the lifting
// charts only show lifts that are in it. Pure functions, shared by the server, the page and the tests.
import type { ParsedExercise, ParsedWorkout, WorkoutLogEntry, WorkoutType } from "./fitness-log";

export const ROUTINE_DAYS: readonly WorkoutType[] = ["Push", "Pull", "Legs"];
export const MAX_ROUTINE_EXERCISES = 40;
export const MAX_ROUTINE_TEXT = 4000;
export const MAX_ROUTINE_NOTES = 600;

// What is stored: the text as typed.
export interface RoutineDay { exercises: string; notes: string }
export type Routine = Record<WorkoutType, RoutineDay>;

// What is used: the exercises read from the text.
export interface PlannedExercise { name: string; sets?: number; reps?: string }
export interface PlanDay { exercises: PlannedExercise[]; notes?: string }
export type RoutinePlan = Record<WorkoutType, PlanDay>;

export const emptyRoutine = (): Routine => ({ Push: { exercises: "", notes: "" }, Pull: { exercises: "", notes: "" }, Legs: { exercises: "", notes: "" } });
export const emptyPlan = (): RoutinePlan => ({ Push: { exercises: [] }, Pull: { exercises: [] }, Legs: { exercises: [] } });

// ── Reading the typed text ──────────────────────────────────────────────────
const BULLET = /^\s*(?:[-*\u2022\u00b7\u2013\u2014]|\d{1,2}[.)])\s+/;
// "3 x 8-10", "3x8", "3 sets of 8", "3x60s"
const SETS_AND_REPS = /\(?\s*(\d{1,2})\s*(?:x|\u00d7|sets?\s*(?:of|x))\s*(\d{1,3}(?:\s*[-\u2013]\s*\d{1,3})?)(?:\s*(?:reps?|secs?|seconds?|mins?|minutes?)\b|s\b)?\s*\)?/i;
// "3 sets", or "3x" with no reps
const SETS_ONLY = /\(?\s*(\d{1,2})\s*(?:sets?\b|[x\u00d7]\s*$)\s*\)?/i;

const tidyName = (text: string) => text.replace(/[\s\-\u2013\u2014:,(\[|]+$/g, "").replace(/^[\s\-\u2013\u2014:,)\]|]+/g, "").replace(/\s+/g, " ").trim();

export function parseRoutineLine(line: string): PlannedExercise | null {
  const clean = line.replace(BULLET, "").trim();
  if (!clean) return null;
  let name = clean;
  let sets: number | undefined;
  let reps: string | undefined;
  const both = SETS_AND_REPS.exec(clean);
  if (both) {
    sets = Number(both[1]);
    reps = both[2].replace(/\s+/g, "").replace("\u2013", "-");
    const unit = /(secs?|seconds?|mins?|minutes?)\b/i.exec(both[0])?.[1]?.toLowerCase();
    if (unit) reps += unit.startsWith("min") ? " min" : "s";
    else if (/\ds\b/i.test(both[0])) reps += "s";
    name = clean.replace(both[0], " ");
  } else {
    const only = SETS_ONLY.exec(clean);
    if (only) { sets = Number(only[1]); name = clean.replace(only[0], " "); }
  }
  name = tidyName(name).slice(0, 80);
  if (!name || !/[a-z]/i.test(name)) return null;
  const valid = sets !== undefined && sets >= 1 && sets <= 30;
  return { name, ...(valid ? { sets } : {}), ...(valid && reps ? { reps } : {}) };
}

// One exercise per line (a semicolon also separates). The same exercise twice counts once.
export function parseRoutineText(text: string): PlannedExercise[] {
  const out: PlannedExercise[] = [];
  const seen = new Set<string>();
  for (const line of text.slice(0, MAX_ROUTINE_TEXT).split(/\r?\n|;/)) {
    const planned = parseRoutineLine(line);
    if (!planned) continue;
    const key = Array.from(exerciseTokens(planned.name)).sort().join(" ");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(planned);
    if (out.length >= MAX_ROUTINE_EXERCISES) break;
  }
  return out;
}

export function planFromRoutine(routine: Routine): RoutinePlan {
  const plan = emptyPlan();
  for (const day of ROUTINE_DAYS) {
    const notes = routine[day].notes.replace(/\s+/g, " ").trim().slice(0, MAX_ROUTINE_NOTES);
    plan[day] = { exercises: parseRoutineText(routine[day].exercises), ...(notes ? { notes } : {}) };
  }
  return plan;
}

export const planHasExercises = (plan: RoutinePlan | undefined | null): boolean => !!plan && ROUTINE_DAYS.some((d) => plan[d]?.exercises.length > 0);
export const planHasContent = (plan: RoutinePlan | undefined | null): boolean => !!plan && ROUTINE_DAYS.some((d) => plan[d]?.exercises.length > 0 || !!plan[d]?.notes);

// "Incline Dumbbell Press · 3 × 8-10", "Face Pull · 3 sets", or just the name.
export function describePlanned(p: PlannedExercise): string {
  if (!p.sets) return p.name;
  return p.reps ? `${p.name} · ${p.sets} \u00d7 ${p.reps}` : `${p.name} · ${p.sets} sets`;
}

// ── Matching exercises to the routine ───────────────────────────────────────
const SHORT: Record<string, string[]> = { db: ["dumbbell"], dbs: ["dumbbell"], bb: ["barbell"], kb: ["kettlebell"], ohp: ["overhead", "press"], rdl: ["romanian", "deadlift"], bw: ["bodyweight"] };
const SKIP = new Set(["the", "a", "an", "with", "exercise", "and", "of"]);

function singular(word: string): string {
  if (word.length > 4 && word.endsWith("sses")) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith("s") && !/(ss|us|is)$/.test(word)) return word.slice(0, -1);
  return word;
}

// The words that make up an exercise name, without word order, spelling of shorthand (DB, BB) or plurals.
export function exerciseTokens(name: string): Set<string> {
  const joined = name.toLowerCase().replace(/&/g, " and ").replace(/\b(pull|chin|push|sit|step)[\s-]+ups?\b/g, "$1up");
  const tokens = new Set<string>();
  for (const raw of joined.split(/[^a-z0-9]+/)) {
    if (!raw || SKIP.has(raw)) continue;
    for (const word of SHORT[raw] ?? [raw]) tokens.add(singular(word));
  }
  return tokens;
}

const subset = (small: Set<string>, large: Set<string>) => Array.from(small).every((t) => large.has(t));
const sameTokens = (a: Set<string>, b: Set<string>) => a.size === b.size && subset(a, b);

// Whether two names are the same lift written differently ("Incline DB Press" and "Incline Dumbbell Press").
export function sameExercise(a: string, b: string): boolean {
  const first = exerciseTokens(a);
  return first.size > 0 && sameTokens(first, exerciseTokens(b));
}

export interface RoutineMatch { type: WorkoutType; name: string }

// The routine exercise a name refers to: the same exercise written differently ("Incline DB Press" for "Incline Dumbbell
// Press"), or a longer or shorter name that has two or more words in common and points to only one routine exercise.
export function findRoutineMatch(plan: RoutinePlan | undefined | null, name: string): RoutineMatch | null {
  if (!plan) return null;
  const target = exerciseTokens(name);
  if (target.size === 0) return null;
  const loose = new Map<string, RoutineMatch>();
  for (const type of ROUTINE_DAYS) {
    for (const planned of plan[type]?.exercises ?? []) {
      const tokens = exerciseTokens(planned.name);
      if (sameTokens(tokens, target)) return { type, name: planned.name };
      const [small, large] = tokens.size <= target.size ? [tokens, target] : [target, tokens];
      if (small.size >= 2 && subset(small, large)) loose.set(`${type}:${planned.name}`, { type, name: planned.name });
    }
  }
  return loose.size === 1 ? Array.from(loose.values())[0] : null;
}

// Gives each exercise that is in the routine the routine's own name and day type, so loggings line up with the plan. The
// session's type follows the exercises that were recognised.
export function canonicalizeWorkout(workout: ParsedWorkout, plan: RoutinePlan | undefined | null): ParsedWorkout {
  if (!planHasExercises(plan)) return workout;
  let recognised = 0;
  const counts = new Map<WorkoutType, number>();
  const exercises: ParsedExercise[] = workout.exercises.map((ex) => {
    const match = findRoutineMatch(plan, ex.name);
    if (!match) return ex;
    recognised += 1;
    counts.set(match.type, (counts.get(match.type) ?? 0) + 1);
    return { ...ex, name: match.name, workoutType: match.type };
  });
  if (recognised === 0) return workout;
  const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
  const keepsType = (counts.get(workout.workoutType) ?? 0) === counts.get(top);
  return { ...workout, exercises, workoutType: keepsType ? workout.workoutType : top };
}

// ── The plan against what was done ──────────────────────────────────────────
export interface PlanCheck { planned: number; done: string[]; remaining: string[]; extra: string[] }

// For a day of this type: which planned exercises have sets logged, which are still to do, and which logged ones are not in the plan.
export function planCheck(plan: RoutinePlan | undefined | null, type: WorkoutType, exercises: readonly Pick<ParsedExercise, "name" | "sets">[]): PlanCheck {
  const planned = plan?.[type]?.exercises ?? [];
  const doneNames = new Set<string>();
  const extra: string[] = [];
  for (const ex of exercises) {
    const match = findRoutineMatch(plan, ex.name);
    if (match?.type === type) { if (ex.sets.length > 0) doneNames.add(match.name); }
    else if (ex.sets.length > 0) extra.push(ex.name);
  }
  return {
    planned: planned.length,
    done: planned.filter((p) => doneNames.has(p.name)).map((p) => p.name),
    remaining: planned.filter((p) => !doneNames.has(p.name)).map((p) => p.name),
    extra,
  };
}

// ── What the lift charts use ────────────────────────────────────────────────
// With a routine set up, the logged rows that are lifts in it, under the routine's own name and day type (so "Incline DB
// Press" and "Incline Dumbbell Press" are one lift). With none, every row, as before.
export function routineEntries(entries: readonly WorkoutLogEntry[], plan: RoutinePlan | undefined | null): WorkoutLogEntry[] {
  if (!planHasExercises(plan)) return [...entries];
  const out: WorkoutLogEntry[] = [];
  for (const entry of entries) {
    const match = findRoutineMatch(plan, entry.exercise);
    if (match) out.push({ ...entry, exercise: match.name, workoutType: match.type });
  }
  return out;
}

// The logged exercises that are left out of the charts because they are not in the routine.
export function outsideRoutine(entries: readonly WorkoutLogEntry[], plan: RoutinePlan | undefined | null): string[] {
  if (!planHasExercises(plan)) return [];
  return Array.from(new Set(entries.filter((e) => !findRoutineMatch(plan, e.exercise)).map((e) => e.exercise)));
}
