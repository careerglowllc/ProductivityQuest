import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { userKv } from "../shared/schema";
import { storage } from "./storage";
import { emptyFocusMemory, type FocusMemory } from "../shared/smart-focus-ai";

export const FOCUS_KEY_PREFIX = "smart-focus:";
const key = FOCUS_KEY_PREFIX + "memory";
async function row(userId: string) {
  return (await db.select().from(userKv).where(and(eq(userKv.userId, userId), eq(userKv.key, key))))[0];
}
export const focusStore = {
  tasks: (userId: string) => storage.getTasks(userId),
  async timezone(userId: string) { return (await storage.getUser(userId))?.timezone || "America/New_York"; },
  async read(userId: string): Promise<FocusMemory> {
    const current = await row(userId);
    return current ? JSON.parse(current.value) : emptyFocusMemory();
  },
  async change(userId: string, change: (memory: FocusMemory) => void) {
    // Optimistic CAS prevents simultaneous tabs/workers from overwriting private feedback.
    for (let attempt = 0; attempt < 6; attempt++) {
      const current = await row(userId);
      const memory: FocusMemory = current ? JSON.parse(current.value) : emptyFocusMemory();
      change(memory);
      const value = JSON.stringify(memory);
      if (current) {
        const result = await db.update(userKv).set({ value, updatedAt: new Date() }).where(and(
          eq(userKv.userId, userId), eq(userKv.key, key), eq(userKv.value, current.value),
        )).returning({ id: userKv.id });
        if (result.length) return;
      } else {
        const result = await db.insert(userKv).values({ userId, key, value })
          .onConflictDoNothing({ target: [userKv.userId, userKv.key] }).returning({ id: userKv.id });
        if (result.length) return;
      }
    }
    throw new Error("Concurrent preference update; please retry.");
  },
};
