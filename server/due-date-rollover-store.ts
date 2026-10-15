import { and, eq, isNotNull, lt } from "drizzle-orm";
import { db } from "./db";
import { tasks, users } from "../shared/schema";
import { createRolloverScheduler, type RolloverStore } from "./due-date-rollover";

export const rolloverStore: RolloverStore = {
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
    )).returning({ id: tasks.id });
    return moved.length;
  },
  async markRolled(userId, day) {
    await db.update(users).set({ lastDueRollDay: day }).where(eq(users.id, userId));
  },
};

export const rolloverScheduler = createRolloverScheduler(rolloverStore);
