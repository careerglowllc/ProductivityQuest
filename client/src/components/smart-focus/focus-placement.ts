import type { FocusRanking } from "./use-smart-focus";

/**
 * The newest ranking among the ones kept in memory. Every change to a quest starts a new ranking, and the older
 * ones stay around for a few minutes, so reading just any of them can describe a list from before the change.
 */
export function freshestRanking(entries: ReadonlyArray<{ data?: FocusRanking; updatedAt: number }>): FocusRanking | undefined {
  let best: { data: FocusRanking; updatedAt: number } | undefined;
  for (const entry of entries) {
    if (entry.data && (!best || entry.updatedAt > best.updatedAt)) best = { data: entry.data, updatedAt: entry.updatedAt };
  }
  return best?.data;
}

/** Whether the quest is in that ranking's list; undefined when there is no ranking yet. */
export function placementOf(ranking: FocusRanking | undefined, taskId: number): boolean | undefined {
  return ranking ? ranking.ids.includes(taskId) : undefined;
}
