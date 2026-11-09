// Whether a recurrence repeats at all ("one-time", "none", blank and an emoji-decorated "⏳One-time" do not), the same rule
// completion uses to decide between rescheduling and archiving.
export function isRecurringType(recurType: string | null | undefined): boolean {
  const normalized = (recurType || "").toLowerCase().replace(/[^a-z-]/g, "");
  return normalized !== "" && normalized !== "one-time" && normalized !== "none";
}

// Next occurrence of a recurring quest's date, used for both its due date and its start date.
export function nextRecurringDate(currentDate: Date | null, recurType: string | null): Date {
  const baseDate = currentDate ? new Date(currentDate) : new Date();
  const nextDate = new Date(baseDate);

  switch (recurType) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'every other day':
      nextDate.setDate(nextDate.getDate() + 2);
      break;
    case '2x week':
      // Twice a week = approximately every 3-4 days
      nextDate.setDate(nextDate.getDate() + 3);
      break;
    case '3x week':
      // Three times a week = approximately every 2-3 days
      nextDate.setDate(nextDate.getDate() + 2);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case '2x month':
      // Twice a month = approximately every 15 days
      nextDate.setDate(nextDate.getDate() + 15);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'every 2 months':
      nextDate.setMonth(nextDate.getMonth() + 2);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'every 6 months':
      nextDate.setMonth(nextDate.getMonth() + 6);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    case 'every 2 years':
      nextDate.setFullYear(nextDate.getFullYear() + 2);
      break;
    case 'every 3 years':
      nextDate.setFullYear(nextDate.getFullYear() + 3);
      break;
    case 'every 5 years':
      nextDate.setFullYear(nextDate.getFullYear() + 5);
      break;
    default:
      // Default to next day if unknown recur type
      nextDate.setDate(nextDate.getDate() + 1);
  }

  return nextDate;
}

// The first occurrence on or after `today`: a recurring date that has passed (a birthday last year) moves on to the next one
// that is still ahead. A date already on or after `today` is returned as it is. Bounded, so a bad recurrence can't loop.
// Stepped on the stored UTC calendar day, so a clock change on the machine running it can never move the day.
export function nextRecurringDateOnOrAfter(date: Date, recurType: string | null, today: Date): Date {
  const asLocal = (d: Date) => new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds());
  const asUtc = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()));
  let next = new Date(date);
  for (let i = 0; i < 10_000 && next.getTime() < today.getTime(); i++) next = asUtc(nextRecurringDate(asLocal(next), recurType));
  return next;
}

// A recurring quest's start date moves forward by the same recurrence as its due date, keeping the lead time.
// The result never lands after the next due date.
export function nextRecurringStart(startDate: Date | null, recurType: string | null, nextDue: Date): Date | null {
  if (!startDate) return null;
  const next = nextRecurringDate(startDate, recurType);
  return next.getTime() > nextDue.getTime() ? nextDue : next;
}
