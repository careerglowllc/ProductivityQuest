import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  notionApiKey: text("notion_api_key"),
  notionDatabaseId: text("notion_database_id"),
  googleClientEmail: text("google_client_email"),
  googlePrivateKey: text("google_private_key"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  notionId: text("notion_id"),
  title: text("title").notNull(),
  description: text("description").default(""),
  duration: integer("duration").notNull(), // in minutes
  goldValue: integer("gold_value").notNull(),
  dueDate: timestamp("due_date"),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  importance: text("importance"),
  kanbanStage: text("kanban_stage"),
  recurType: text("recur_type"),
  lifeDomain: text("life_domain"),
  apple: boolean("apple").default(false),
  smartPrep: boolean("smart_prep").default(false),
  delegationTask: boolean("delegation_task").default(false),
  velin: boolean("velin").default(false),
  recycled: boolean("recycled").default(false),
  recycledAt: timestamp("recycled_at"),
  recycledReason: text("recycled_reason"), // "completed" or "deleted"
});

export const shopItems = pgTable("shop_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  cost: integer("cost").notNull(),
  icon: text("icon").notNull(),
  category: text("category").notNull(),
});

export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  goldTotal: integer("gold_total").default(0),
  tasksCompleted: integer("tasks_completed").default(0),
  goldSpent: integer("gold_spent").default(0),
  lastSyncedAt: timestamp("last_synced_at"),
});

export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  shopItemId: integer("shop_item_id").references(() => shopItems.id),
  cost: integer("cost").notNull(),
  purchasedAt: timestamp("purchased_at").defaultNow(),
  used: boolean("used").default(false),
  usedAt: timestamp("used_at"),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  recycled: true,
  recycledAt: true,
  recycledReason: true,
});

export const insertShopItemSchema = createInsertSchema(shopItems).omit({
  id: true,
});

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
});

export const insertPurchaseSchema = createInsertSchema(purchases).omit({
  id: true,
  purchasedAt: true,
  usedAt: true,
});

// User types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type ShopItem = typeof shopItems.$inferSelect;
export type InsertShopItem = z.infer<typeof insertShopItemSchema>;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
