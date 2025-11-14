import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { extractNotionDatabaseId } from "./notionUtils";

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
  username: varchar("username").unique(),
  email: varchar("email").unique(),
  passwordHash: varchar("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  notionApiKey: text("notion_api_key"),
  notionDatabaseId: text("notion_database_id"),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  googleTokenExpiry: timestamp("google_token_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  notionId: text("notion_id"),
  title: text("title").notNull(),
  description: text("description").default(""),
  details: text("details"),
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
  businessWorkFilter: text("business_work_filter"), // "Apple", "Vi", "General", "SP", "Vel", "CG"
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
  userId: varchar("user_id").references(() => users.id), // null = global/default item, otherwise user-specific
  name: text("name").notNull(),
  description: text("description").notNull(),
  cost: integer("cost").notNull(),
  icon: text("icon").notNull(),
  category: text("category").default("general").notNull(),
  isGlobal: boolean("is_global").default(false).notNull(), // true = default item for all users
  createdAt: timestamp("created_at").defaultNow(),
});

export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  goldTotal: integer("gold_total").default(0),
  tasksCompleted: integer("tasks_completed").default(0),
  goldSpent: integer("gold_spent").default(0),
  lastSyncedAt: timestamp("last_synced_at"),
});

export const userSkills = pgTable("user_skills", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  skillName: varchar("skill_name").notNull(), // "Craftsman", "Artist", "Will", etc.
  skillIcon: text("skill_icon"), // Custom icon/emoji for the skill
  level: integer("level").default(1).notNull(),
  xp: integer("xp").default(0).notNull(),
  maxXp: integer("max_xp").default(100).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const insertUserSkillSchema = createInsertSchema(userSkills).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPurchaseSchema = createInsertSchema(purchases).omit({
  id: true,
  purchasedAt: true,
  usedAt: true,
});

// Auth schemas for registration and login
export const insertUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginUserSchema = z.object({
  username: z.string().min(1, "Username or email required"),
  password: z.string().min(1, "Password required"),
});

// Notion configuration schema
// Accepts either full Notion URL or just the database ID
export const updateNotionConfigSchema = z.object({
  notionApiKey: z.string().min(1, "Notion API key is required").startsWith("ntn_", "Invalid Notion API key format"),
  notionDatabaseId: z.string().min(1, "Notion database ID or URL is required").transform((val, ctx) => {
    try {
      // Extract and validate the database ID from URL or direct ID
      return extractNotionDatabaseId(val);
    } catch (error: any) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error.message || "Invalid Notion database ID or URL format",
      });
      return z.NEVER;
    }
  }),
});

// User settings type (what the API returns)
export type UserSettings = {
  notionApiKey: string | null;
  notionDatabaseId: string | null;
  hasGoogleAuth: boolean;
  googleConnected: boolean;
};

// User types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type UpdateNotionConfig = z.infer<typeof updateNotionConfigSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type ShopItem = typeof shopItems.$inferSelect;
export type InsertShopItem = z.infer<typeof insertShopItemSchema>;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type UserSkill = typeof userSkills.$inferSelect;
export type InsertUserSkill = z.infer<typeof insertUserSkillSchema>;
export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
