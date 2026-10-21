// A day's workout or food log that is built up one message at a time. The first message starts the day, each later
// message updates the same summary, and nothing reaches the charts until the day is ended. These are the pure rules for
// that draft (what is stored, undo, what changed after a message) so the page, the server and the tests share them.
import { formatSets, formatWarmupSets, isIsoDate, type LoggedSet, type ParsedExercise, type ParsedFoodItem, type ParsedMeal, type ParsedWorkout } from "./fitness-log";

export const MAX_DRAFT_MESSAGES = 60;
export const MAX_UNDO_STEPS = 5;

export interface DraftUndoStep<T> { summary: T; hadMessage: boolean }

// The state saved after every change. `id` becomes the id of the saved log rows, so a day that is reopened and ended
// again replaces what it saved before instead of adding a second copy.
export interface SessionDraft<T extends { date: string }> {
  id: string;
  date: string;
  startedAt: string; // ISO time
  updatedAt: string;
  messages: string[]; // what was typed or said, oldest first
  summary: T;
  undo: DraftUndoStep<T>[];
  reopened?: boolean; // an already saved day opened again for editing
}

export type WorkoutDraft = SessionDraft<ParsedWorkout>;
export type MealDraft = SessionDraft<ParsedMeal>;

export function newDraft<T extends { date: string }>(id: string, now: Date, text: string | null, summary: T, reopened = false): SessionDraft<T> {
  const time = now.toISOString();
  return { id, date: summary.date, startedAt: time, updatedAt: time, messages: text ? [text.slice(0, 4000)] : [], summary, undo: [], ...(reopened ? { reopened: true } : {}) };
}

// Replaces the summary with the AI's updated one (or a hand edit when `text` is null), keeping one step to undo.
export function addEntry<T extends { date: string }>(draft: SessionDraft<T>, now: Date, text: string | null, summary: T): SessionDraft<T> {
  return {
    ...draft, date: summary.date, summary, updatedAt: now.toISOString(),
    messages: text ? [...draft.messages, text.slice(0, 4000)].slice(-MAX_DRAFT_MESSAGES) : draft.messages,
    undo: [...draft.undo, { summary: draft.summary, hadMessage: !!text }].slice(-MAX_UNDO_STEPS),
  };
}

export const canUndo = (draft: SessionDraft<{ date: string }>): boolean => draft.undo.length > 0;

// Takes the last change back, including the message that caused it.
export function undoEntry<T extends { date: string }>(draft: SessionDraft<T>, now: Date): SessionDraft<T> {
  const step = draft.undo[draft.undo.length - 1];
  if (!step) return draft;
  return {
    ...draft, date: step.summary.date, summary: step.summary, updatedAt: now.toISOString(),
    messages: step.hadMessage ? draft.messages.slice(0, -1) : draft.messages, undo: draft.undo.slice(0, -1),
  };
}

// Moves the whole day to another date.
export function setDraftDate<T extends { date: string }>(draft: SessionDraft<T>, now: Date, date: string): SessionDraft<T> {
  if (!isIsoDate(date) || date === draft.date) return draft;
  return addEntry(draft, now, null, { ...draft.summary, date });
}

// The last few messages, sent along so the AI can read a follow-up such as "same again" in context.
export const recentMessages = (draft: SessionDraft<{ date: string }>, count = 8): string[] => draft.messages.slice(-count);

// A refresh from the server can bring a newer copy of the open day (it was added to on another device). It is taken
// only for the same day and only when it is newer, so an older copy arriving late never undoes what was just typed, and
// a day that was just ended is never brought back.
export function adoptNewerDraft<T extends { date: string }>(current: SessionDraft<T> | null, stored: SessionDraft<T> | null): SessionDraft<T> | null {
  return current && stored && stored.id === current.id && stored.updatedAt > current.updatedAt ? stored : current;
}

// A day left open from an earlier date.
export const isStaleDraft = (draft: SessionDraft<{ date: string }>, today: string): boolean => !draft.reopened && draft.date < today;

// Rejects anything stored under the draft key that does not look like a draft, so a damaged value never breaks the page.
export function parseDraft<T extends { date: string }>(raw: string | null, valid: (summary: unknown) => summary is T): SessionDraft<T> | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<SessionDraft<T>> | null;
    if (!value || typeof value !== "object") return null;
    if (typeof value.id !== "string" || !value.id || !isIsoDate(value.date) || !valid(value.summary) || value.summary.date !== value.date) return null;
    if (!Array.isArray(value.messages) || !value.messages.every((m) => typeof m === "string")) return null;
    const undo = Array.isArray(value.undo) ? value.undo.filter((s) => s && typeof s.hadMessage === "boolean" && valid(s.summary)) : [];
    return {
      id: value.id, date: value.date, summary: value.summary, messages: value.messages.slice(-MAX_DRAFT_MESSAGES), undo: undo.slice(-MAX_UNDO_STEPS),
      startedAt: typeof value.startedAt === "string" ? value.startedAt : new Date(0).toISOString(),
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date(0).toISOString(),
      ...(value.reopened ? { reopened: true } : {}),
    };
  } catch { return null; }
}

export const isWorkoutSummary = (value: unknown): value is ParsedWorkout =>
  !!value && typeof value === "object" && isIsoDate((value as ParsedWorkout).date) && Array.isArray((value as ParsedWorkout).exercises)
  && (value as ParsedWorkout).exercises.every((e) => e && typeof e.name === "string" && Array.isArray(e.sets) && (e.warmupSets === undefined || Array.isArray(e.warmupSets)));

export const isMealSummary = (value: unknown): value is ParsedMeal =>
  !!value && typeof value === "object" && isIsoDate((value as ParsedMeal).date) && Array.isArray((value as ParsedMeal).items)
  && (value as ParsedMeal).items.every((i) => i && typeof i.name === "string") && typeof (value as ParsedMeal).totals === "object" && (value as ParsedMeal).totals !== null;

// ── What changed ────────────────────────────────────────────────────────────
const sameSet = (a: LoggedSet, b: LoggedSet) => JSON.stringify(a) === JSON.stringify(b);
const exerciseKey = (e: Pick<ParsedExercise, "name">) => e.name.trim().toLowerCase();

// Plain lines saying what a message changed in the workout, for the "last entry" line under the summary. Empty when
// nothing changed.
export function describeWorkoutChange(before: ParsedWorkout | null, after: ParsedWorkout): string[] {
  const old = new Map((before?.exercises ?? []).map((e) => [exerciseKey(e), e] as const));
  const kept = new Set(after.exercises.map(exerciseKey));
  const lines: string[] = [];
  for (const ex of after.exercises) {
    const prev = old.get(exerciseKey(ex));
    if (!prev) {
      const parts = [ex.warmup ? `warm-up ${ex.warmup}` : "", ex.sets.length ? formatSets(ex) : "", ex.notes ?? ""].filter(Boolean);
      lines.push(`Added ${ex.name}${parts.length ? `: ${parts.join("; ")}` : ""}`);
      continue;
    }
    const parts: string[] = [];
    const extra = ex.sets.length > prev.sets.length && prev.sets.every((s, i) => sameSet(s, ex.sets[i])) ? ex.sets.slice(prev.sets.length) : null;
    if (extra) parts.push(`added ${formatSets({ sets: extra })}`);
    else if (JSON.stringify(prev.sets) !== JSON.stringify(ex.sets)) parts.push(`sets now ${formatSets(ex)}`);
    const warmupBefore = prev.warmupSets ?? [];
    const warmupNow = ex.warmupSets ?? [];
    const extraWarmup = warmupNow.length > warmupBefore.length && warmupBefore.every((s, i) => sameSet(s, warmupNow[i])) ? warmupNow.slice(warmupBefore.length) : null;
    if (extraWarmup) parts.push(`added warm-up ${formatWarmupSets(extraWarmup)}`);
    else if ((prev.warmup ?? "") !== (ex.warmup ?? "")) parts.push(ex.warmup ? `warm-up ${ex.warmup}` : "warm-up removed");
    if ((prev.notes ?? "") !== (ex.notes ?? "")) parts.push(ex.notes ? `note: ${ex.notes}` : "note removed");
    if (parts.length) lines.push(`${ex.name}: ${parts.join("; ")}`);
  }
  for (const [key, ex] of Array.from(old.entries())) if (!kept.has(key)) lines.push(`Removed ${ex.name}`);
  if (before && before.date !== after.date) lines.push(`Day changed to ${after.date}`);
  return lines;
}

const foodLabel = (item: Pick<ParsedFoodItem, "name" | "quantity">) => (item.quantity && !item.name.toLowerCase().includes(item.quantity.toLowerCase()) ? `${item.quantity} ${item.name}` : item.name);
const foodKey = (item: ParsedFoodItem) => JSON.stringify([item.name.trim().toLowerCase(), item.quantity ?? "", item.calories, item.protein, item.carbs, item.fat]);
const kcal = (n: number) => `${Math.round(n).toLocaleString("en-US")} kcal`;

// The same for food: items added, removed or re-estimated since the last summary.
export function describeMealChange(before: ParsedMeal | null, after: ParsedMeal): string[] {
  const addedItems = [...after.items];
  const removedItems: ParsedFoodItem[] = [];
  for (const item of before?.items ?? []) {
    const index = addedItems.findIndex((a) => foodKey(a) === foodKey(item));
    if (index >= 0) addedItems.splice(index, 1); else removedItems.push(item);
  }
  const lines: string[] = [];
  const added: ParsedFoodItem[] = [];
  for (const item of addedItems) {
    const index = removedItems.findIndex((r) => r.name.trim().toLowerCase() === item.name.trim().toLowerCase());
    if (index >= 0) {
      const [was] = removedItems.splice(index, 1);
      lines.push(`Updated ${foodLabel(item)}: ${kcal(was.calories)} to ${kcal(item.calories)}`);
    } else added.push(item);
  }
  const out = added.map((i) => `Added ${foodLabel(i)} (${kcal(i.calories)})`);
  out.push(...lines, ...removedItems.map((r) => `Removed ${foodLabel(r)}`));
  if (before && before.date !== after.date) out.push(`Day changed to ${after.date}`);
  return out;
}

// What the button that saves the day says: "End today's workout" for today's, with the date for an older one, and "Save
// changes" for a saved day opened again.
export function endButtonLabel(kind: "workout" | "meal", draft: SessionDraft<{ date: string }>, today: string, dateLabel: string): string {
  if (draft.reopened) return "Save changes";
  if (draft.date === today) return kind === "workout" ? "End today's workout" : "End day";
  return kind === "workout" ? `End ${dateLabel} workout` : `End ${dateLabel}`;
}

// A day can be ended once it holds something worth saving.
export const workoutHasContent = (workout: ParsedWorkout): boolean => workout.exercises.some((e) => e.sets.length > 0 || e.warmup || e.notes);
export const mealHasContent = (meal: ParsedMeal): boolean => meal.items.length > 0;
