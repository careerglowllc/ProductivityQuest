import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb, index } from "drizzle-orm/pg-core";

// Helper for timestamp with timezone
const timestamptz = (name: string) => timestamp(name, { withTimezone: true });
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

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

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
  googleCalendarClientId: text("google_calendar_client_id"),
  googleCalendarClientSecret: text("google_calendar_client_secret"),
  googleCalendarRefreshToken: text("google_calendar_refresh_token"),
  googleCalendarAccessToken: text("google_calendar_access_token"),
  googleCalendarTokenExpiry: timestamp("google_calendar_token_expiry"),
  googleCalendarSyncEnabled: boolean("google_calendar_sync_enabled").default(false),
  googleCalendarSyncDirection: text("google_calendar_sync_direction").default("both"),
  googleCalendarInstantSync: boolean("google_calendar_instant_sync").default(false),
  googleCalendarLastSync: timestamp("google_calendar_last_sync"),
  timezone: text("timezone").default("America/New_York"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  notionId: text("notion_id"),
  googleEventId: text("google_event_id"),
  googleCalendarId: text("google_calendar_id"), // Which Google Calendar this event is from
  title: text("title").notNull(),
  description: text("description").default(""),
  details: text("details"),
  duration: integer("duration").notNull(), // in minutes
  goldValue: integer("gold_value").notNull(),
  dueDate: timestamptz("due_date"),
  scheduledTime: timestamptz("scheduledTime"), // Timestamp when task is scheduled in calendar (if null, defaults to 9 AM on due date)
  completed: boolean("completed").default(false),
  completedAt: timestamptz("completed_at"),
  createdAt: timestamptz("created_at").defaultNow(),
  importance: text("importance"),
  kanbanStage: text("kanban_stage"),
  recurType: text("recur_type"),
  businessWorkFilter: text("business_work_filter"), // "Apple", "General", "MW"
  campaign: text("campaign").default("unassigned"), // "unassigned", "Main", "Side"
  apple: boolean("apple").default(false),
  smartPrep: boolean("smart_prep").default(false),
  delegationTask: boolean("delegation_task").default(false),
  velin: boolean("velin").default(false),
  recycled: boolean("recycled").default(false),
  recycledAt: timestamptz("recycled_at"),
  recycledReason: text("recycled_reason"), // "completed" or "deleted"
  skillTags: jsonb("skill_tags").$type<string[]>().default([]), // AI-generated skill tags
  calendarColor: text("calendar_color"), // Hex color from Google Calendar or custom
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
  skillDescription: text("skill_description"), // Custom description explaining what the skill represents
  skillMilestones: jsonb("skill_milestones").$type<string[]>(), // Custom milestones (e.g., ["Level 10: First mastery", "Level 25: Expert"])
  constellationMilestones: jsonb("constellation_milestones").$type<Array<{ id: string; title: string; level: number; x: number; y: number }>>(), // Constellation nodes with positions
  completedMilestones: jsonb("completed_milestones").$type<string[]>(), // Array of completed milestone IDs
  isCustom: boolean("is_custom").default(false).notNull(), // true = user-created custom skill, false = default skill
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

// Training examples table for AI skill categorization feedback
export const skillCategorizationTraining = pgTable("skill_categorization_training", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  taskTitle: text("task_title").notNull(),
  taskDetails: text("task_details"),
  correctSkills: jsonb("correct_skills").$type<string[]>().notNull(), // User-approved skills
  aiSuggestedSkills: jsonb("ai_suggested_skills").$type<string[]>(), // What AI originally suggested
  isApproved: boolean("is_approved").default(true), // Whether user approved this categorization
  createdAt: timestamp("created_at").defaultNow(),
});

// Custom campaigns table for user-defined life goals
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(), // Icon name from lucide-react
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Financial items table for income and expense tracking
export const financialItems = pgTable("financial_items", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  item: text("item").notNull(),
  category: text("category").notNull(), // General, Business, Entertainment, Food, Housing, etc.
  monthlyCost: integer("monthly_cost").notNull(), // Store as cents to avoid floating point issues
  recurType: text("recur_type").notNull(), // Monthly, Yearly (Amortized), Biweekly (Summed Monthly), 2x a Year
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ML Task Sorting training feedback table
export const mlSortingFeedback = pgTable("ml_sorting_feedback", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: timestamp("date").notNull(), // The date the sorting was applied to
  originalSchedule: jsonb("original_schedule").$type<Array<{ taskId: number; startTime: string; endTime: string }>>().notNull(), // Tasks before ML sorting
  mlSortedSchedule: jsonb("ml_sorted_schedule").$type<Array<{ taskId: number; startTime: string; endTime: string }>>().notNull(), // What ML suggested
  userCorrectedSchedule: jsonb("user_corrected_schedule").$type<Array<{ taskId: number; startTime: string; endTime: string }>>(), // What user corrected to (null if approved)
  feedbackType: text("feedback_type").notNull(), // 'approved' or 'corrected'
  feedbackReason: text("feedback_reason"), // User's explanation for correction
  taskMetadata: jsonb("task_metadata").$type<Array<{ taskId: number; priority: string; duration: number; title: string }>>(), // Context about tasks for learning
  createdAt: timestamp("created_at").defaultNow(),
});

// ML Sorting user preferences learned over time
export const mlSortingPreferences = pgTable("ml_sorting_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  preferredStartHour: integer("preferred_start_hour").default(9), // When user typically starts their day
  preferredEndHour: integer("preferred_end_hour").default(18), // When user typically ends their day
  priorityWeights: jsonb("priority_weights").$type<{ high: number; medHigh: number; medium: number; medLow: number; low: number }>(), // Learned priority importance
  breakDuration: integer("break_duration").default(15), // Preferred break between tasks in minutes
  highPriorityTimePreference: text("high_priority_time_preference").default("morning"), // 'morning', 'afternoon', 'evening'
  totalApproved: integer("total_approved").default(0),
  totalCorrected: integer("total_corrected").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const insertSkillCategorizationTrainingSchema = createInsertSchema(skillCategorizationTraining).omit({
  id: true,
  createdAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
  googleCalendarClientId: string | null;
  googleCalendarClientSecret: string | null;
  googleCalendarAccessToken: string | null;
  googleCalendarRefreshToken: string | null;
  googleCalendarTokenExpiry: Date | null;
  googleCalendarSyncEnabled: boolean;
  googleCalendarSyncDirection: string;
  googleCalendarInstantSync: boolean;
  googleCalendarLastSync: Date | null;
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
export type FinancialItem = typeof financialItems.$inferSelect;
export type InsertFinancialItem = typeof financialItems.$inferInsert;
export type InsertShopItem = z.infer<typeof insertShopItemSchema>;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type UserSkill = typeof userSkills.$inferSelect;
export type InsertUserSkill = z.infer<typeof insertUserSkillSchema>;
export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type SkillCategorizationTraining = typeof skillCategorizationTraining.$inferSelect;
export type InsertSkillCategorizationTraining = z.infer<typeof insertSkillCategorizationTrainingSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
