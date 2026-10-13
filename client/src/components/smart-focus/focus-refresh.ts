// How often Smart Focus re-reads your quests while the app stays open, and the shortest gap between re-reads.
export const FOCUS_TICK_MS = 15 * 60 * 1000;
export const FOCUS_MIN_GAP_MS = 5 * 60 * 1000;
export const FOCUS_RANK_STALE_MS = 5 * 60 * 1000;

// True when the quest list was loaded long enough ago to re-read it; false while it is still loading for the first time.
export function focusRefreshDue(updatedAt: number | undefined, now: number, minGapMs = FOCUS_MIN_GAP_MS): boolean {
  return !!updatedAt && now - updatedAt >= minGapMs;
}
