// What today's lifts look like next to the personal bests behind them: one card per exercise and one bar per working set.
import { sameExercise } from "./fitness-routine";
import type { LoggedSet, MetricKind, ParsedExercise, WorkoutLogEntry, WorkoutType } from "./fitness-log";

// What a bar measures for exercises done for weight: the weight on the bar, or the set's volume (weight x reps).
// Exercises done for reps or for time always measure those.
export type BarMode = "weight" | "volume";

const num = (text: string): number | undefined => {
  const n = parseFloat(text.replace(/[~,]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

// The sets in a row that was not logged with AI, read from text such as "225 lb: 6 / 6 / 6", "BW: 8 / 6 / 3" or "BW: 50 sec".
// Text it cannot read (a cardio line, a list of different weights) gives no sets.
export function setsFromText(setsRaw: string): LoggedSet[] {
  const weighted = /^~?(\d+(?:\.\d+)?)\s*lb[^:]*:\s*(.+)$/i.exec(setsRaw.trim());
  const bodyweight = /^BW:\s*(.+)$/i.exec(setsRaw.trim());
  const match = weighted ?? bodyweight;
  if (!match) return [];
  const weight = weighted ? Number(weighted[1]) : undefined;
  const tail = weighted ? weighted[2] : bodyweight![1];
  const eachSide = /each side|per arm|per side/i.test(tail);
  return tail.split("/").flatMap((part): LoggedSet[] => {
    const value = num(part.replace(/each side|per arm|per side/gi, ""));
    if (value === undefined) return [];
    const approx = part.includes("~") || undefined;
    const base: LoggedSet = { ...(approx ? { approx: true } : {}), ...(eachSide ? { eachSide: true } : {}) };
    if (/sec/i.test(part)) return [{ ...base, seconds: value, ...(weight ? { weight } : { bodyweight: true }) }];
    return [{ ...base, reps: value, ...(weight ? { weight } : { bodyweight: true }) }];
  });
}

// The sets of a logged row: the exact ones when it was logged with AI, otherwise what can be read from its text, otherwise
// one set standing for the row's top number.
export function rowSets(row: Pick<WorkoutLogEntry, "sets" | "setsRaw" | "metric">): LoggedSet[] {
  if (row.sets) return row.sets;
  const read = setsFromText(row.setsRaw);
  if (read.length > 0) return read;
  if (!row.metric) return [];
  return row.metric.kind === "weight" ? [{ weight: row.metric.value }] : row.metric.kind === "time" ? [{ seconds: row.metric.value, bodyweight: true }] : [{ reps: row.metric.value, bodyweight: true }];
}

const kindOfRow = (row: Pick<WorkoutLogEntry, "metric">, sets: readonly LoggedSet[]): MetricKind =>
  row.metric?.kind ?? (sets.some((s) => s.seconds !== undefined) ? "time" : sets.some((s) => s.weight) ? "weight" : "reps");

// The number a set's bar is drawn to.
export function setMeasure(set: LoggedSet, kind: MetricKind, mode: BarMode): number {
  if (kind === "time") return set.seconds ?? 0;
  if (kind === "reps") return set.reps ?? 0;
  if (mode === "weight") return set.weight ?? 0;
  return set.weight && set.reps ? set.weight * set.reps * (set.eachSide ? 2 : 1) : 0;
}

const grouped = (n: number) => (Math.round(n * 10) / 10).toLocaleString("en-US");

// A bar's amount in words: "120 lb", "8 reps", "45 sec".
export function measureText(value: number, kind: MetricKind): string {
  return kind === "time" ? `${grouped(value)} sec` : kind === "reps" ? `${grouped(value)} ${value === 1 ? "rep" : "reps"}` : `${grouped(value)} lb`;
}

// What is written beside a set's bar.
export function setLabel(set: LoggedSet, kind: MetricKind, mode: BarMode): string {
  const side = set.eachSide ? " each side" : "";
  const rough = set.approx ? "~" : "";
  if (kind === "time") return `${set.weight ? `${grouped(set.weight)} lb \u00b7 ` : ""}${rough}${grouped(set.seconds ?? 0)} sec${side}`;
  if (kind === "reps") return `${rough}${grouped(set.reps ?? 0)} ${set.reps === 1 ? "rep" : "reps"}${side}`;
  const head = set.weight ? `${grouped(set.weight)} lb` : "BW";
  if (mode === "volume") return set.weight && set.reps ? `${rough}${grouped(setMeasure(set, kind, mode))} lb (${grouped(set.weight)} \u00d7 ${grouped(set.reps)})${side}` : "\u2014";
  return set.reps !== undefined ? `${head} \u00d7 ${rough}${grouped(set.reps)}${side}` : head;
}

// The best a lift has done on any other day, in the same measure. Null when it has no other day.
export function bestOnOtherDays(entries: readonly WorkoutLogEntry[], name: string, kind: MetricKind, mode: BarMode, date: string): { value: number; date: string } | null {
  let best: { value: number; date: string } | null = null;
  for (const entry of entries) {
    if (entry.date === date || !sameExercise(entry.exercise, name)) continue;
    for (const set of rowSets(entry)) {
      const value = setMeasure(set, kind, mode);
      if (value > (best?.value ?? 0)) best = { value, date: entry.date };
    }
  }
  return best;
}

export interface BarSet { index: number; value: number; label: string; beatsBest: boolean }
// A warm-up set's bar. Warm-ups are shown next to the working sets but are never compared with a best or counted in the top.
export interface WarmupBar { index: number; value: number; label: string }
export type CardStatus = "empty" | "first" | "new" | "matched" | "below";
export interface ExerciseCard {
  name: string; workoutType: WorkoutType; kind: MetricKind;
  sets: BarSet[]; // working sets only
  warmups: WarmupBar[]; // exact warm-up sets, when there are any
  best: number | null; bestDate: string | null; // from other days
  top: number; // the highest bar today
  scale: number; // the amount a full-width bar stands for, a little over the larger of the best and the top
  status: CardStatus;
  warmup?: string; notes?: string; // warm-up as text only when it has no exact sets (said loosely, or an older entry)
  draftIndex: number | null; // its place in the open day, so it can be removed there; null for an exercise already saved
}

interface Source { name: string; workoutType: WorkoutType; kind: MetricKind; sets: readonly LoggedSet[]; warmupSets?: readonly LoggedSet[]; warmup?: string; notes?: string; draftIndex: number | null }

function buildCard(source: Source, entries: readonly WorkoutLogEntry[], mode: BarMode, date: string): ExerciseCard {
  const best = bestOnOtherDays(entries, source.name, source.kind, mode, date);
  const sets: BarSet[] = source.sets.map((set, i) => {
    const value = setMeasure(set, source.kind, mode);
    return { index: i + 1, value, label: setLabel(set, source.kind, mode), beatsBest: best !== null && value > best.value };
  });
  // With no working sets to say what the lift is measured in, a warm-up with a weight on it is read by weight.
  const warmupKind: MetricKind = source.sets.length === 0 && (source.warmupSets ?? []).some((s) => s.weight) ? "weight" : source.kind;
  const warmups: WarmupBar[] = (source.warmupSets ?? []).map((set, i) => ({ index: i + 1, value: setMeasure(set, warmupKind, mode), label: setLabel(set, warmupKind, mode) }));
  const top = sets.reduce((max, s) => Math.max(max, s.value), 0);
  const status: CardStatus = sets.length === 0 || top === 0 ? "empty" : best === null ? "first" : top > best.value ? "new" : top === best.value ? "matched" : "below";
  const widest = Math.max(best?.value ?? 0, top);
  return {
    name: source.name, workoutType: source.workoutType, kind: source.kind, sets, warmups,
    best: best?.value ?? null, bestDate: best?.date ?? null, top, scale: widest > 0 ? widest * 1.08 : 1, status,
    ...(source.warmup && warmups.length === 0 ? { warmup: source.warmup } : {}), ...(source.notes ? { notes: source.notes } : {}), draftIndex: source.draftIndex,
  };
}

// One card for each exercise done on `date`: the ones already saved for that day, then those in the open day. A saved day that
// has been reopened is shown from the open day, not from its saved rows. Bests come from every other day of the log.
export function liftCards(input: { entries: readonly WorkoutLogEntry[]; draft?: { id: string; exercises: readonly ParsedExercise[] } | null; date: string; mode: BarMode }): ExerciseCard[] {
  const { entries, draft, date, mode } = input;
  const saved: Source[] = entries.filter((e) => e.date === date && !(draft && e.logId === draft.id)).map((row) => {
    const sets = rowSets(row);
    return { name: row.exercise, workoutType: row.workoutType, kind: kindOfRow(row, sets), sets, warmupSets: row.warmupSets, warmup: row.warmup, notes: row.notes, draftIndex: null };
  });
  const open: Source[] = (draft?.exercises ?? []).map((ex, i) => ({ name: ex.name, workoutType: ex.workoutType, kind: ex.kind, sets: ex.sets, warmupSets: ex.warmupSets, warmup: ex.warmup, notes: ex.notes, draftIndex: i }));
  return [...saved, ...open].map((source) => buildCard(source, entries, mode, date));
}
