export type StatsKind = "workout" | "meal";

// Under the synced "workout-" / "calories-" prefixes, so the choice follows the account across devices and logouts.
export const STATS_OPEN_KEYS: Record<StatsKind, string> = { workout: "workout-stats-open-v1", meal: "calories-stats-open-v1" };

// Open until the person has collapsed it.
export function loadStatsOpen(kind: StatsKind): boolean {
  try { return localStorage.getItem(STATS_OPEN_KEYS[kind]) !== "0"; } catch { return true; }
}

export function saveStatsOpen(kind: StatsKind, open: boolean): void {
  try { localStorage.setItem(STATS_OPEN_KEYS[kind], open ? "1" : "0"); } catch { /* storage full or blocked */ }
}
