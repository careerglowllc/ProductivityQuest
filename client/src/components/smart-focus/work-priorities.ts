import type { FocusProfile } from "@shared/smart-focus-ai";

const level = (n: number) => `${Math.abs(n)} importance ${Math.abs(n) === 1 ? "level" : "levels"}`;
const phrase = (n: number, when: string) => n === 0 ? `no change ${when}` : `${n > 0 ? "up" : "down"} ${level(n)} ${when}`;

// Plain-language lines for the account's work-filter weighting, one per filter with a non-zero weight.
export function describeWorkPriorities(profile: FocusProfile | null | undefined): string[] {
  return Object.entries(profile?.workFilters ?? {})
    .filter(([, w]) => Number.isFinite(w?.weekday) && Number.isFinite(w?.weekend) && (w.weekday !== 0 || w.weekend !== 0))
    .map(([name, w]) => `${name}: ${phrase(w.weekday, "on weekdays")}, ${phrase(w.weekend, "on weekends")}`);
}
