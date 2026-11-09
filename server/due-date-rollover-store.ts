import { and, eq, isNotNull, isNull, lt, ne, or } from "drizzle-orm";
import { db } from "./db";
import { tasks, users } from "../shared/schema";
import { createRolloverScheduler, type DateReminderStore, type RolloverStore } from "./due-date-rollover";
import { isRecurringType, nextRecurringDateOnOrAfter } from "./recurrence";

// Everything except a date-specific reminder (a reminder whose reminder_mode is "on-date"), whose date is kept as it is.
// Written so a blank reminder_mode (every older reminder) counts as ongoing and is rolled as before.
const notDateReminder = or(ne(tasks.questType, "reminder"), isNull(tasks.reminderMode), ne(tasks.reminderMode, "on-date"));

export const rolloverStore: RolloverStore & DateReminderStore = {
  async account(userId) {
    const [row] = await db.select({ enabled: users.autoRollDueDates, timezone: users.timezone, lastDay: users.lastDueRollDay })
      .from(users).where(eq(users.id, userId));
    return row ? { enabled: row.enabled === true, timezone: row.timezone, lastDay: row.lastDay } : undefined;
  },
  async enabledAccounts() {
    return db.select({ id: users.id, timezone: users.timezone, lastDay: users.lastDueRollDay })
      .from(users).where(eq(users.autoRollDueDates, true));
  },
  async rollOverdue(userId, today) {
    // Active quests only: finished and deleted ones keep the date they had.
    const moved = await db.update(tasks).set({ dueDate: today }).where(and(
      eq(tasks.userId, userId),
      eq(tasks.completed, false),
      eq(tasks.recycled, false),
      isNotNull(tasks.dueDate),
      lt(tasks.dueDate, today),
      notDateReminder,
    )).returning({ id: tasks.id });
    return moved.length;
  },
  async advanceDateReminders(userId, today) {
    // Open date-specific reminders whose date has passed. A repeating one (a yearly birthday) moves on to its next date;
    // a one-time one keeps its date and simply stops showing.
    const passed = await db.select({ id: tasks.id, dueDate: tasks.dueDate, recurType: tasks.recurType }).from(tasks).where(and(
      eq(tasks.userId, userId),
      eq(tasks.completed, false),
      eq(tasks.recycled, false),
      eq(tasks.questType, "reminder"),
      eq(tasks.reminderMode, "on-date"),
      isNotNull(tasks.dueDate),
      lt(tasks.dueDate, today),
    ));
    let moved = 0;
    for (const reminder of passed) {
      if (!reminder.dueDate || !isRecurringType(reminder.recurType)) continue;
      const next = nextRecurringDateOnOrAfter(reminder.dueDate, reminder.recurType, today);
      // Only if it still has the date read above, so a change made meanwhile is never overwritten.
      const [row] = await db.update(tasks).set({ dueDate: next })
        .where(and(eq(tasks.id, reminder.id), eq(tasks.userId, userId), eq(tasks.dueDate, reminder.dueDate)))
        .returning({ id: tasks.id });
      if (row) moved++;
    }
    return moved;
  },
  async markRolled(userId, day) {
    await db.update(users).set({ lastDueRollDay: day }).where(eq(users.id, userId));
  },
};

export const rolloverScheduler = createRolloverScheduler(rolloverStore);
