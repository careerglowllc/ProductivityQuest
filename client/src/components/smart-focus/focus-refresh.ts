// When Smart Focus re-reads your quests on its own. It never does while you are on the page: only when you open the
// Smart Focus view, or come back to the app after being away a while.
export const FOCUS_MIN_GAP_MS = 5 * 60 * 1000;
export const FOCUS_AWAY_MS = 5 * 60 * 1000;
export const FOCUS_RANK_STALE_MS = 5 * 60 * 1000;
// After feedback: when to ask again, just past the server's one-minute pause between AI calls.
export const FOCUS_FOLLOW_UP_MS = 65 * 1000;

// True when the quest list was loaded long enough ago to re-read it; false while it is still loading for the first time.
export function focusRefreshDue(updatedAt: number | undefined, now: number, minGapMs = FOCUS_MIN_GAP_MS): boolean {
  return !!updatedAt && now - updatedAt >= minGapMs;
}

// Whether coming back to the app should re-read quests: only after being away a while, and never mid-edit.
export function autoRefreshOnReturn(input: { hiddenAt: number | undefined; now: number; held: boolean; tasksUpdatedAt: number | undefined }): boolean {
  if (input.held || input.hiddenAt === undefined) return false;
  return input.now - input.hiddenAt >= FOCUS_AWAY_MS && focusRefreshDue(input.tasksUpdatedAt, input.now);
}
