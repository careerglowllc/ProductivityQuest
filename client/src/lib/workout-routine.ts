import { MAX_ROUTINE_NOTES, MAX_ROUTINE_TEXT, ROUTINE_DAYS, emptyRoutine, type Routine } from "@shared/fitness-routine";

// The routine is typed text, saved under the synced "workout-" prefix so it follows the account (see synced-storage.ts).
export const ROUTINE_KEY = "workout-routine-v1";

// Whatever is stored is read leniently: a damaged value gives an empty day, never an error.
export function parseRoutine(raw: string | null): Routine {
  const routine = emptyRoutine();
  if (!raw) return routine;
  try {
    const value = JSON.parse(raw) as Record<string, { exercises?: unknown; notes?: unknown } | null> | null;
    if (!value || typeof value !== "object") return routine;
    for (const day of ROUTINE_DAYS) {
      const stored = value[day];
      if (!stored || typeof stored !== "object") continue;
      routine[day] = {
        exercises: typeof stored.exercises === "string" ? stored.exercises.slice(0, MAX_ROUTINE_TEXT) : "",
        notes: typeof stored.notes === "string" ? stored.notes.slice(0, MAX_ROUTINE_NOTES) : "",
      };
    }
  } catch { /* not JSON */ }
  return routine;
}

export function loadRoutine(): Routine {
  try { return parseRoutine(localStorage.getItem(ROUTINE_KEY)); } catch { return emptyRoutine(); }
}

export function saveRoutine(routine: Routine): void {
  try { localStorage.setItem(ROUTINE_KEY, JSON.stringify(routine)); } catch { /* storage full or blocked */ }
}
