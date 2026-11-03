// The compact "Today's schedule" on a phone shows a short window instead of the whole day: from 30 minutes ago to 3 hours
// from now. These are the pure rules for what falls in the window, so the widget and the tests share them.
export const WINDOW_BEFORE_MINUTES = 30;
export const WINDOW_AFTER_MINUTES = 180;

export interface ScheduleEvent {
  id: string; title: string; start: string; end: string;
  allDay?: boolean; calendarColor?: string; calendarName?: string; source?: string;
}
export type RowState = "past" | "now" | "next";
export interface ScheduleRow { event: ScheduleEvent; start: Date; end: Date; state: RowState }
export interface ScheduleWindow { from: Date; to: Date; allDay: ScheduleEvent[]; rows: ScheduleRow[]; nowIndex: number }

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

const parse = (value: string): Date | null => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const startOfDay = (day: Date) => new Date(day.getFullYear(), day.getMonth(), day.getDate());

// An all-day event is flagged by the server; one that runs a whole number of days from midnight to midnight counts too.
function isAllDay(event: ScheduleEvent, start: Date, end: Date): boolean {
  if (event.allDay) return true;
  const span = end.getTime() - start.getTime();
  return span >= DAY && start.getTime() === startOfDay(start).getTime() && end.getTime() === startOfDay(end).getTime();
}

// What the compact schedule shows at `now`: all-day events that cover today, then the timed events that overlap the window
// in start order, each marked as over, happening now, or coming up. `nowIndex` is where the "now" line goes: before the
// first event that has not started yet (rows.length when none is coming up).
export function scheduleWindow(events: readonly ScheduleEvent[], now: Date, before = WINDOW_BEFORE_MINUTES, after = WINDOW_AFTER_MINUTES): ScheduleWindow {
  const from = new Date(now.getTime() - before * MINUTE);
  const to = new Date(now.getTime() + after * MINUTE);
  const dayStart = startOfDay(now);
  const dayEnd = new Date(dayStart.getTime() + DAY);
  const allDay: ScheduleEvent[] = [];
  const rows: ScheduleRow[] = [];
  for (const event of events) {
    const start = parse(event.start);
    if (!start) continue;
    const end = parse(event.end) ?? start;
    if (isAllDay(event, start, end)) {
      if (start < dayEnd && end > dayStart) allDay.push(event);
      continue;
    }
    const overlaps = end > start ? start < to && end > from : start >= from && start <= to;
    if (!overlaps) continue;
    const state: RowState = end <= now && end > start ? "past" : start <= now && (end > now || end <= start) ? "now" : start > now ? "next" : "past";
    rows.push({ event, start, end, state });
  }
  rows.sort((a, b) => a.start.getTime() - b.start.getTime() || a.end.getTime() - b.end.getTime() || a.event.title.localeCompare(b.event.title));
  const firstUpcoming = rows.findIndex((row) => row.start > now);
  return { from, to, allDay, rows, nowIndex: firstUpcoming === -1 ? rows.length : firstUpcoming };
}

export const timeLabel = (date: Date): string => date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
