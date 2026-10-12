import { importanceRank } from "./quest-type";

// Due date = the hard deadline. Start date = "start working on this from here" (optional).
// A missing start date adds no start-based behaviour, so quests that predate the field behave as before.

type DateLike = string | Date | null | undefined;
export type ScheduledQuest = { dueDate?: DateLike; startDate?: DateLike; importance?: string | null };

export const URGENT_WINDOW_DAYS = 3;
export const THIS_WEEK_DAYS = 7;

// Dates are stored as the user's calendar day at UTC midnight, so "today" is built the same way.
export const dayStart = (now: Date, offsetDays = 0): number =>
  Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays);

function time(value: DateLike): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

export const isOverdue = (q: ScheduledQuest, now: Date): boolean => {
  const due = time(q.dueDate);
  return due !== null && due < dayStart(now, 0);
};

// Due today or overdue, or its start date has arrived. Quests with no start date only qualify through their due date.
export function isOnTodaysList(q: ScheduledQuest, now: Date): boolean {
  const due = time(q.dueDate);
  const start = time(q.startDate);
  const tomorrow = dayStart(now, 1);
  return (due !== null && due < tomorrow) || (start !== null && start < tomorrow);
}

// Starts later and is not close to its deadline yet, so it should stay out of today's working lists.
export const isNotStartedYet = (q: ScheduledQuest, now: Date): boolean => {
  const band = smartBand(q, now);
  return band === "this-week" || band === "upcoming";
};

export type SmartBand = "urgent" | "ready" | "this-week" | "upcoming";
export const SMART_BANDS: readonly SmartBand[] = ["urgent", "ready", "this-week", "upcoming"];
export const SMART_BAND_LABELS: Record<SmartBand, string> = {
  urgent: "Urgent",
  ready: "Ready now",
  "this-week": "Starting this week",
  upcoming: "Upcoming",
};
export const SMART_BAND_HINTS: Record<SmartBand, string> = {
  urgent: `Overdue or due within ${URGENT_WINDOW_DAYS} days`,
  ready: "Start date reached, or no start date",
  "this-week": `Starts within the next ${THIS_WEEK_DAYS} days`,
  upcoming: `Starts more than ${THIS_WEEK_DAYS} days from now`,
};

// A close deadline overrides the start date: it is urgent even if the quest has not started yet.
export function smartBand(q: ScheduledQuest, now: Date): SmartBand {
  const due = time(q.dueDate);
  const start = time(q.startDate);
  if (due !== null && due < dayStart(now, URGENT_WINDOW_DAYS + 1)) return "urgent";
  if (start === null || start < dayStart(now, 1)) return "ready";
  if (start < dayStart(now, 1 + THIS_WEEK_DAYS)) return "this-week";
  return "upcoming";
}

const nullsLast = (t: number | null) => t ?? Infinity;
const ascending = (a: number, b: number) => (a === b ? 0 : a < b ? -1 : 1);

// Urgent: nearest deadline first. Everything else: earliest start first (no start after dated ones), then due date.
function compareWithinBand(band: SmartBand, a: ScheduledQuest, b: ScheduledQuest): number {
  const dueOrder = ascending(nullsLast(time(a.dueDate)), nullsLast(time(b.dueDate)));
  const startOrder = ascending(nullsLast(time(a.startDate)), nullsLast(time(b.startDate)));
  const importanceOrder = importanceRank(b.importance) - importanceRank(a.importance);
  return band === "urgent"
    ? dueOrder || importanceOrder || startOrder
    : startOrder || importanceOrder || dueOrder;
}

export function sortSmart<T extends ScheduledQuest>(quests: readonly T[], now: Date): T[] {
  return groupSmart(quests, now).flatMap((group) => group.quests);
}

export function groupSmart<T extends ScheduledQuest>(quests: readonly T[], now: Date): { band: SmartBand; label: string; quests: T[] }[] {
  const byBand = new Map<SmartBand, T[]>(SMART_BANDS.map((band) => [band, []]));
  for (const quest of quests) byBand.get(smartBand(quest, now))!.push(quest);
  return SMART_BANDS
    .map((band) => ({ band, label: SMART_BAND_LABELS[band], quests: byBand.get(band)!.sort((a, b) => compareWithinBand(band, a, b)) }))
    .filter((group) => group.quests.length > 0);
}

// Quests that have a start date still in the future, soonest first. Backs the "Upcoming" filter.
export function sortUpcoming<T extends ScheduledQuest>(quests: readonly T[], now: Date): T[] {
  const tomorrow = dayStart(now, 1);
  return quests
    .filter((q) => { const start = time(q.startDate); return start !== null && start >= tomorrow; })
    .sort((a, b) => compareWithinBand("upcoming", a, b));
}

// Reminders are standing best practices rather than work to schedule, so Smart Focus keeps them out
// and the quests page lists them in their own compact strip instead.
export const isReminder = (q: { questType?: string | null }): boolean => q.questType === "reminder";

// The Smart Focus feed: every open quest except reminders, in feed order.
export function smartFocusQuests<T extends ScheduledQuest & { questType?: string | null }>(quests: readonly T[], now: Date): T[] {
  return sortSmart(quests.filter((q) => !isReminder(q)), now);
}

// Most important first, then nearest due date (undated last).
export function sortReminders<T extends ScheduledQuest>(reminders: readonly T[]): T[] {
  return [...reminders].sort((a, b) =>
    importanceRank(b.importance) - importanceRank(a.importance)
    || ascending(nullsLast(time(a.dueDate)), nullsLast(time(b.dueDate))));
}

export const DEADLINE_NEEDS_DUE_DATE = "A deadline quest needs a due date.";
export const START_AFTER_DUE = "The start date can't be after the due date.";

export type QuestDates = { questType?: string | null; dueDate?: DateLike; startDate?: DateLike };

const DAY_MS = 86_400_000;
const calendarDay = (value: DateLike): number | null => { const t = time(value); return t === null ? null : Math.floor(t / DAY_MS); };

// Rules for a whole quest: deadlines need a due date, and the start cannot fall after the due date.
export function validateQuestDates(q: QuestDates): string | null {
  if (q.questType === "deadline" && !time(q.dueDate)) return DEADLINE_NEEDS_DUE_DATE;
  const start = calendarDay(q.startDate);
  const due = calendarDay(q.dueDate);
  if (start !== null && due !== null && start > due) return START_AFTER_DUE;
  return null;
}

const has = (patch: object, key: string) => (patch as Record<string, unknown>)[key] !== undefined;

export type DatePatchResult = { ok: true; adjust: { startDate?: DateLike } } | { ok: false; error: string };

// Checks an edit against the stored quest. Only edits to type, due date or start date are checked, so
// unrelated edits to older quests never fail. Moving only the due date to before the start pulls the start back.
export function resolveQuestDatePatch(existing: QuestDates, patch: QuestDates): DatePatchResult {
  const touchesType = has(patch, "questType");
  const touchesDue = has(patch, "dueDate");
  const touchesStart = has(patch, "startDate");
  if (!touchesType && !touchesDue && !touchesStart) return { ok: true, adjust: {} };

  const merged: QuestDates = {
    questType: touchesType ? patch.questType : existing.questType,
    dueDate: touchesDue ? patch.dueDate : existing.dueDate,
    startDate: touchesStart ? patch.startDate : existing.startDate,
  };
  if (merged.questType === "deadline" && !time(merged.dueDate)) return { ok: false, error: DEADLINE_NEEDS_DUE_DATE };

  const start = calendarDay(merged.startDate);
  const due = calendarDay(merged.dueDate);
  if (start !== null && due !== null && start > due) {
    return touchesStart ? { ok: false, error: START_AFTER_DUE } : { ok: true, adjust: { startDate: merged.dueDate } };
  }
  return { ok: true, adjust: {} };
}
