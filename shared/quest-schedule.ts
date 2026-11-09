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

// ── Reminder timing ─────────────────────────────────────────────────────────
// An ongoing reminder is always in the reminders, and its due date follows the overdue rule (moved to today when the account
// rolls overdue quests). A date-specific reminder is for one day, like a birthday: its due date is that day, it shows the day
// before and on the day, and its date is never moved to today. Stored in `reminder_mode`; blank means ongoing.
export const REMINDER_MODES = ["always", "on-date"] as const;
export type ReminderMode = (typeof REMINDER_MODES)[number];
export const DEFAULT_REMINDER_MODE: ReminderMode = "always";
export const isReminderMode = (value: unknown): value is ReminderMode => REMINDER_MODES.includes(value as ReminderMode);
export const REMINDER_MODE_LABELS: Record<ReminderMode, string> = { always: "Ongoing", "on-date": "On a date" };

/** How many days before its date a date-specific reminder starts showing. */
export const REMINDER_LEAD_DAYS = 1;

export type ReminderQuest = ScheduledQuest & { questType?: string | null; reminderMode?: string | null; completed?: boolean | null; recycled?: boolean | null };

/** A reminder that is for one day (its due date), not an ongoing one. Only reminders can be; the field is ignored on other quests. */
export const isDateReminder = (q: { questType?: string | null; reminderMode?: string | null }): boolean => isReminder(q) && q.reminderMode === "on-date";

// The calendar day a stored date stands for, as its UTC midnight (the way dates are stored).
const storedDayStart = (value: DateLike): number | null => { const t = time(value); return t === null ? null : Math.floor(t / 86_400_000) * 86_400_000; };

/**
 * How many days until a date-specific reminder's date (0 = today, 1 = tomorrow), while it is showing; null when it is not
 * showing, which is any other day, or when it is not a date-specific reminder or has no date.
 */
export function dateReminderDaysAway(q: { questType?: string | null; reminderMode?: string | null; dueDate?: DateLike }, now: Date): number | null {
  if (!isDateReminder(q)) return null;
  const day = storedDayStart(q.dueDate);
  if (day === null) return null;
  const away = Math.round((day - dayStart(now, 0)) / 86_400_000);
  return away >= 0 && away <= REMINDER_LEAD_DAYS ? away : null;
}

/** "Today" or "Tomorrow" beside a date-specific reminder while it shows; null otherwise. */
export function dateReminderLabel(q: { questType?: string | null; reminderMode?: string | null; dueDate?: DateLike }, now: Date): string | null {
  const away = dateReminderDaysAway(q, now);
  return away === null ? null : away === 0 ? "Today" : away === 1 ? "Tomorrow" : `In ${away} days`;
}

/** The first and last day a date-specific reminder shows (the day before its date, and its date), as stored days; null without a date. */
export function dateReminderShowRange(dueDate: DateLike): { from: Date; to: Date } | null {
  const day = storedDayStart(dueDate);
  return day === null ? null : { from: new Date(day - REMINDER_LEAD_DAYS * 86_400_000), to: new Date(day) };
}

/** Whether an open reminder belongs in the reminders today: an ongoing one always does, a date-specific one only the day before and on its date. */
export function reminderShowsToday(q: ReminderQuest, now: Date): boolean {
  if (!isReminder(q) || q.completed || q.recycled) return false;
  return isDateReminder(q) ? dateReminderDaysAway(q, now) !== null : true;
}

// Date-specific reminders that are showing come first (today before tomorrow), then most important, then nearest due date
// (undated last). Without `now` it is by importance and due date only.
export function sortReminders<T extends ScheduledQuest & { questType?: string | null; reminderMode?: string | null }>(reminders: readonly T[], now?: Date): T[] {
  const dated = (q: T) => (now ? dateReminderDaysAway(q, now) : null) ?? Infinity;
  return [...reminders].sort((a, b) => ascending(dated(a), dated(b)) || byImportance(a, b) || byDue(a, b));
}

// The reminders to show on today's dashboard: open ongoing ones whose start date, if any, has arrived, and date-specific
// ones on the day before and on their date.
export function remindersForToday<T extends ReminderQuest>(quests: readonly T[], now: Date): T[] {
  const tomorrow = dayStart(now, 1);
  const started = (q: T) => { const start = time(q.startDate); return start === null || start < tomorrow; };
  return sortReminders(quests.filter((q) => reminderShowsToday(q, now) && (isDateReminder(q) || started(q))), now);
}

export const DEADLINE_NEEDS_DUE_DATE = "A deadline quest needs a due date.";
export const DATE_REMINDER_NEEDS_DATE = "A date-specific reminder needs its date.";
export const START_AFTER_DUE = "The start date can't be after the due date.";

// A deadline quest can't be without a due date, so clearing it turns the quest into a general one in the same save.
export const questTypeAfterClearingDue = (q: { questType?: string | null }): "general" | null => (q.questType === "deadline" ? "general" : null);

// Nor can a date-specific reminder, so clearing its date turns it into an ongoing reminder in the same save.
export const reminderModeAfterClearingDue = (q: { questType?: string | null; reminderMode?: string | null }): "always" | null => (isDateReminder(q) ? "always" : null);

export type QuestDates = { questType?: string | null; dueDate?: DateLike; startDate?: DateLike; reminderMode?: string | null };

const DAY_MS = 86_400_000;
const calendarDay = (value: DateLike): number | null => { const t = time(value); return t === null ? null : Math.floor(t / DAY_MS); };

// Rules for a whole quest: deadlines and date-specific reminders need a due date, and the start cannot fall after the due date.
export function validateQuestDates(q: QuestDates): string | null {
  if (q.questType === "deadline" && !time(q.dueDate)) return DEADLINE_NEEDS_DUE_DATE;
  if (isDateReminder(q) && !time(q.dueDate)) return DATE_REMINDER_NEEDS_DATE;
  const start = calendarDay(q.startDate);
  const due = calendarDay(q.dueDate);
  if (start !== null && due !== null && start > due) return START_AFTER_DUE;
  return null;
}

const has = (patch: object, key: string) => (patch as Record<string, unknown>)[key] !== undefined;

export type DatePatchResult = { ok: true; adjust: { startDate?: DateLike } } | { ok: false; error: string };

// What Reschedule saves for one quest when the user picks `day` (a local calendar day): the new due date, and, when the
// quest's start date has already passed, that start date moves to the same day. A start date left in the past would keep the
// quest on today's list as "start reached" no matter when it is due, so rescheduling it would change nothing about when it
// shows up. A start date that is today or later is left alone (the server still pulls it back if it would fall after the new
// due date), and so is any start date when the picked day is itself in the past.
export function reschedulePatch(quest: { startDate?: DateLike }, day: Date, now: Date): { dueDate: string; startDate?: string } {
  const picked = Date.UTC(day.getFullYear(), day.getMonth(), day.getDate());
  const dueDate = new Date(picked).toISOString();
  const start = time(quest.startDate);
  const startPassed = start !== null && start < dayStart(now, 0);
  return startPassed && picked >= dayStart(now, 0) ? { dueDate, startDate: dueDate } : { dueDate };
}

// Checks an edit against the stored quest. Only edits to type, due date or start date are checked, so
// unrelated edits to older quests never fail. Moving only the due date to before the start pulls the start back.
export function resolveQuestDatePatch(existing: QuestDates, patch: QuestDates): DatePatchResult {
  const touchesType = has(patch, "questType");
  const touchesDue = has(patch, "dueDate");
  const touchesStart = has(patch, "startDate");
  const touchesMode = has(patch, "reminderMode");
  if (!touchesType && !touchesDue && !touchesStart && !touchesMode) return { ok: true, adjust: {} };

  const merged: QuestDates = {
    questType: touchesType ? patch.questType : existing.questType,
    dueDate: touchesDue ? patch.dueDate : existing.dueDate,
    startDate: touchesStart ? patch.startDate : existing.startDate,
    reminderMode: touchesMode ? patch.reminderMode : existing.reminderMode,
  };
  if (merged.questType === "deadline" && !time(merged.dueDate)) return { ok: false, error: DEADLINE_NEEDS_DUE_DATE };
  if (isDateReminder(merged) && !time(merged.dueDate)) return { ok: false, error: DATE_REMINDER_NEEDS_DATE };

  const start = calendarDay(merged.startDate);
  const due = calendarDay(merged.dueDate);
  if (start !== null && due !== null && start > due) {
    return touchesStart ? { ok: false, error: START_AFTER_DUE } : { ok: true, adjust: { startDate: merged.dueDate } };
  }
  return { ok: true, adjust: {} };
}
