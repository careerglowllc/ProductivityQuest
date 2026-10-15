// Rolling overdue quests forward to today, for accounts that turn the setting on.
// Due dates are stored as midnight UTC of the calendar day they mean, and shown by their UTC date.

/** The calendar day ("YYYY-MM-DD") it is right now in the time zone; an unknown zone counts as UTC. */
export function localDay(now: Date, timeZone?: string | null): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timeZone || "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/** A due date as the app stores it: midnight UTC on that calendar day. */
export const dueDateForDay = (day: string): Date => new Date(`${day}T00:00:00.000Z`);

/** The calendar day a stored due date means, or null when there is none. */
export function dayOfDueDate(due: Date | string | null | undefined): string | null {
  if (!due) return null;
  const date = new Date(due);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

/** Whether a due date is on an earlier calendar day than `today`. */
export function isOverdueOn(due: Date | string | null | undefined, today: string): boolean {
  const day = dayOfDueDate(due);
  return day !== null && day < today;
}

/**
 * Milliseconds until the day changes in the time zone, counted from the clock as if the day had 24 hours.
 * On the two days a year the clock changes it is an hour out, so callers check the day again when it runs out.
 */
export function msUntilNextDay(now: Date, timeZone?: string | null): number {
  const format = (zone: string) => new Intl.DateTimeFormat("en-GB", { timeZone: zone, hourCycle: "h23", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(now);
  let parts: Intl.DateTimeFormatPart[];
  try { parts = format(timeZone || "UTC"); } catch { parts = format("UTC"); }
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const secondsIntoDay = part("hour") * 3600 + part("minute") * 60 + part("second");
  return (86400 - secondsIntoDay) * 1000 - now.getUTCMilliseconds();
}
