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

const byDue = (a: ScheduledQuest, b: ScheduledQuest) => ascending(nullsLast(time(a.dueDate)), nullsLast(time(b.dueDate)));
const byStart = (a: ScheduledQuest, b: ScheduledQuest) => ascending(nullsLast(time(a.startDate)), nullsLast(time(b.startDate)));
const byImportance = (a: ScheduledQuest, b: ScheduledQuest) => importanceRank(b.importance) - importanceRank(a.importance);

export const SMART_FOCUS_CAP = 10;
export const COMING_UP_DAYS = 7;

export type FocusBand = "urgent" | "today" | "coming-up";
export const FOCUS_BANDS: readonly FocusBand[] = ["urgent", "today", "coming-up"];
export const FOCUS_BAND_LABELS: Record<FocusBand, string> = { urgent: "Urgent", today: "Starting today", "coming-up": "Coming up" };
export const FOCUS_BAND_HINTS: Record<FocusBand, string> = {
  urgent: "Overdue or due today",
  today: "Start date reached",
  "coming-up": `High priority, due within ${COMING_UP_DAYS} days`,
};

export const isHighPriority = (q: ScheduledQuest): boolean => importanceRank(q.importance) >= importanceRank("Med-High");

// Where a quest belongs in Smart Focus, or null when it doesn't belong: nothing due or starting today, and
// anything due in the coming week only counts when it is high priority.
export function focusBand(q: ScheduledQuest, now: Date): FocusBand | null {
  const due = time(q.dueDate);
  const start = time(q.startDate);
  if (due !== null && due < dayStart(now, 1)) return "urgent";
  if (start !== null && start < dayStart(now, 1)) return "today";
  if (due !== null && due < dayStart(now, 1 + COMING_UP_DAYS) && isHighPriority(q)) return "coming-up";
  return null;
}

export type SmartFocus<T> = { groups: { band: FocusBand; label: string; quests: T[] }[]; shown: number; total: number };

// The Smart Focus list: only what qualifies, never more than `cap`. Urgent fills first, then starting today,
// then coming up, so the cap trims the least pressing quests. Reminders are left out (they have their own strip).
export function smartFocus<T extends ScheduledQuest & { questType?: string | null }>(quests: readonly T[], now: Date, cap = SMART_FOCUS_CAP): SmartFocus<T> {
  const byBand: Record<FocusBand, T[]> = { urgent: [], today: [], "coming-up": [] };
  for (const quest of quests) {
    if (isReminder(quest)) continue;
    const band = focusBand(quest, now);
    if (band) byBand[band].push(quest);
  }
  byBand.urgent.sort((a, b) => byDue(a, b) || byImportance(a, b) || byStart(a, b));
  byBand.today.sort((a, b) => byStart(a, b) || byImportance(a, b) || byDue(a, b));
  byBand["coming-up"].sort((a, b) => byDue(a, b) || byImportance(a, b) || byStart(a, b));

  const total = FOCUS_BANDS.reduce((sum, band) => sum + byBand[band].length, 0);
  let room = Math.max(0, cap);
  const groups = FOCUS_BANDS.map((band) => {
    const kept = byBand[band].slice(0, room);
    room -= kept.length;
    return { band, label: FOCUS_BAND_LABELS[band], quests: kept };
  }).filter((group) => group.quests.length > 0);
  return { groups, shown: groups.reduce((sum, group) => sum + group.quests.length, 0), total };
}

// Quests that have a start date still in the future, soonest first. Backs the "Upcoming" filter.
export function sortUpcoming<T extends ScheduledQuest>(quests: readonly T[], now: Date): T[] {
  const tomorrow = dayStart(now, 1);
  return quests
    .filter((q) => { const start = time(q.startDate); return start !== null && start >= tomorrow; })
    .sort((a, b) => byStart(a, b) || byImportance(a, b) || byDue(a, b));
}

// Reminders are standing best practices rather than work to schedule, so Smart Focus keeps them out
// and the quests page lists them in their own compact strip instead.
export const isReminder = (q: { questType?: string | null }): boolean => q.questType === "reminder";

// Most important first, then nearest due date (undated last).
export function sortReminders<T extends ScheduledQuest>(reminders: readonly T[]): T[] {
  return [...reminders].sort((a, b) => byImportance(a, b) || byDue(a, b));
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
