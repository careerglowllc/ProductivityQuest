import { and, eq, like, ne } from "drizzle-orm";
import { db } from "./db";
import { userKv } from "../shared/schema";
import { storage } from "./storage";
import type { CommandStore } from "./command-center";
import type { CommandEntry } from "../shared/command-center";

export const COMMAND_KEY_PREFIX = "command-entry:";
const deleted = '{"deleted":true}';
const scoped = (userId: string, id: string) => and(
  eq(userKv.userId, userId), eq(userKv.key, COMMAND_KEY_PREFIX + id), ne(userKv.value, deleted),
);
export const commandStore: CommandStore = {
  async email(userId) { return (await storage.getUser(userId))?.email ?? undefined; },
  async list(userId) {
    const rows = await db.select({ value: userKv.value }).from(userKv).where(and(
      eq(userKv.userId, userId), like(userKv.key, COMMAND_KEY_PREFIX + "%"), ne(userKv.value, deleted),
    ));
    return rows.map(row => JSON.parse(row.value) as CommandEntry);
  },
  async get(userId, id) {
    const [row] = await db.select({ value: userKv.value }).from(userKv).where(scoped(userId, id));
    return row ? JSON.parse(row.value) as CommandEntry : undefined;
  },
  async insertOnce(userId, entry) {
    const result = await db.insert(userKv).values({ userId, key: COMMAND_KEY_PREFIX + entry.id, value: JSON.stringify(entry) })
      .onConflictDoNothing({ target: [userKv.userId, userKv.key] }).returning({ id: userKv.id });
    return result.length > 0;
  },
  async update(userId, entry) {
    const result = await db.update(userKv).set({ value: JSON.stringify(entry), updatedAt: new Date() })
      .where(scoped(userId, entry.id)).returning({ id: userKv.id });
    return result.length > 0;
  },
  async remove(userId, id) {
    // Keep a tombstone so the dated briefing is never re-seeded after deletion.
    const result = await db.update(userKv).set({ value: deleted, updatedAt: new Date() })
      .where(scoped(userId, id)).returning({ id: userKv.id });
    return result.length > 0;
  },
};
