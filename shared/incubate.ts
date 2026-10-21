// Incubating a quest: it stays in the list but is held back from the feed until a day the person picks. That is only its
// start date moving, so everything that already hides a quest until it starts hides it, and shows it again once the day arrives.
import { START_AFTER_DUE, dayStart, smartBand, validateQuestDates } from "./quest-schedule";

type DateLike = string | Date | null | undefined;
export type IncubatingQuest = { kanbanStage?: string | null; startDate?: DateLike; dueDate?: DateLike };

export const INCUBATE_STAGE = "Incubate";
export const INCUBATE_PRESETS: readonly { label: string; days: number }[] = [
  { label: "1 week", days: 7 }, { label: "2 weeks", days: 14 }, { label: "1 month", days: 30 }, { label: "3 months", days: 91 },
];

// Dates are stored as a calendar day at UTC midnight (see quest-schedule), whatever the time zone the day was picked in.
export const storedDay = (day: Date): string => new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate())).toISOString();

// A stored day as the same calendar day on the device, for a date picker.
export const localDayOf = (stored: DateLike): Date | undefined => {
  if (!stored) return undefined;
  const d = new Date(stored);
  return Number.isNaN(d.getTime()) ? undefined : new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

export const presetDay = (now: Date, days: number): Date => new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);

export type IncubateProblem = "not-future" | "after-due";

// Why a day can't be the incubate date: it has to be after today, and a start date can't fall after the due date.
export function incubateProblem(day: Date, quest: Pick<IncubatingQuest, "dueDate">, now: Date): IncubateProblem | null {
  const stored = storedDay(day);
  if (new Date(stored).getTime() < dayStart(now, 1)) return "not-future";
  return validateQuestDates({ dueDate: quest.dueDate, startDate: stored }) === START_AFTER_DUE ? "after-due" : null;
}

// A deadline this close keeps a quest in play whatever its start date, so incubating it will not take it off the list.
export const staysInList = (day: Date, quest: Pick<IncubatingQuest, "dueDate">, now: Date): boolean =>
  smartBand({ dueDate: quest.dueDate, startDate: storedDay(day) }, now) === "urgent";

// What choosing the Incubate stage saves: the stage and the day it comes back.
export const incubatePatch = (day: Date): { kanbanStage: string; startDate: string } => ({ kanbanStage: INCUBATE_STAGE, startDate: storedDay(day) });

// What moving to another stage saves. Leaving Incubate while the start date is still ahead lets go of that date too, or
// a quest the person has just started on would stay hidden from the feed.
export function stagePatch(quest: IncubatingQuest, stage: string, now: Date): { kanbanStage: string; startDate?: null } {
  const start = quest.startDate ? new Date(quest.startDate).getTime() : NaN;
  const waiting = quest.kanbanStage === INCUBATE_STAGE && stage !== INCUBATE_STAGE && start >= dayStart(now, 1);
  return waiting ? { kanbanStage: stage, startDate: null } : { kanbanStage: stage };
}

export type IncubateStatus = { kind: "until"; start: string } | { kind: "ended" } | { kind: "unset" };

// Where an incubating quest stands, for the line under the stage. Null when it is not incubating.
export function incubateStatus(quest: IncubatingQuest, now: Date): IncubateStatus | null {
  if (quest.kanbanStage !== INCUBATE_STAGE) return null;
  const start = quest.startDate ? new Date(quest.startDate).getTime() : NaN;
  if (Number.isNaN(start)) return { kind: "unset" };
  return start >= dayStart(now, 1) ? { kind: "until", start: new Date(start).toISOString() } : { kind: "ended" };
}
