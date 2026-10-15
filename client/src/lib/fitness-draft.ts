import { isMealSummary, isWorkoutSummary, parseDraft, type MealDraft, type WorkoutDraft } from "@shared/fitness-session";

// The open day is saved after every change under the synced "workout-" / "calories-" prefixes, so it is not lost when the
// page closes and follows the account to another device (see client/src/lib/synced-storage.ts).
export const WORKOUT_DRAFT_KEY = "workout-session-v1";
export const MEAL_DRAFT_KEY = "calories-session-v1";

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function write(key: string, draft: unknown | null): void {
  try {
    if (draft === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(draft));
  } catch { /* storage full or blocked */ }
}

export const loadWorkoutDraft = (): WorkoutDraft | null => parseDraft(read(WORKOUT_DRAFT_KEY), isWorkoutSummary);
export const saveWorkoutDraft = (draft: WorkoutDraft | null): void => write(WORKOUT_DRAFT_KEY, draft);
export const loadMealDraft = (): MealDraft | null => parseDraft(read(MEAL_DRAFT_KEY), isMealSummary);
export const saveMealDraft = (draft: MealDraft | null): void => write(MEAL_DRAFT_KEY, draft);
