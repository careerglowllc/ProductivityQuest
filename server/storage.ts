import { tasks, shopItems, userProgress, userSkills, purchases, users, campaigns, financialItems, passwordResetTokens, mlSortingFeedback, mlSortingPreferences, type Task, type InsertTask, type ShopItem, type InsertShopItem, type UserProgress, type InsertUserProgress, type UserSkill, type InsertUserSkill, type Purchase, type InsertPurchase, type User, type UpsertUser, type Campaign, type InsertCampaign, type FinancialItem, type InsertFinancialItem } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, isNull, inArray, gt } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(userData: { username: string; email: string; password: string }): Promise<User>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
  updateUserPassword(userId: string, newPassword: string): Promise<boolean>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Password reset operations
  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  getPasswordResetToken(token: string): Promise<{ userId: string; expiresAt: Date; used: boolean } | undefined>;
  markPasswordResetTokenUsed(token: string): Promise<void>;
  
  updateUserSettings(userId: string, settings: { 
    notionApiKey?: string; 
    notionDatabaseId?: string; 
    googleAccessToken?: string; 
    googleRefreshToken?: string; 
    googleTokenExpiry?: Date;
    googleCalendarClientId?: string;
    googleCalendarClientSecret?: string;
    googleCalendarAccessToken?: string;
    googleCalendarRefreshToken?: string;
    googleCalendarTokenExpiry?: Date | null;
    googleCalendarSyncEnabled?: boolean;
    googleCalendarSyncDirection?: string;
    timezone?: string;
  }): Promise<User>;
  
  // Task operations
  getTasks(userId: string): Promise<Task[]>;
  getTask(id: number, userId: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<Task>, userId: string): Promise<Task | undefined>;
  deleteTask(id: number, userId: string): Promise<boolean>;
  completeTask(id: number, userId: string): Promise<Task | undefined>;
  getRecycledTasks(userId: string): Promise<Task[]>;
  restoreTask(id: number, userId: string): Promise<Task | undefined>;
  permanentlyDeleteTask(id: number, userId: string): Promise<boolean>;
  permanentlyDeleteTasks(taskIds: number[], userId: string): Promise<number>;
  
  // Shop operations
  getShopItems(): Promise<ShopItem[]>;
  getShopItemsForUser(userId: string): Promise<ShopItem[]>;
  getShopItem(id: number): Promise<ShopItem | undefined>;
  createShopItem(item: InsertShopItem): Promise<ShopItem>;
  updateShopItemPrice(id: number, cost: number, userId: string): Promise<ShopItem | undefined>;
  deleteShopItem(id: number, userId: string): Promise<boolean>;
  
  // User progress operations
  getUserProgress(userId: string): Promise<UserProgress>;
  updateUserProgress(userId: string, progress: Partial<UserProgress>): Promise<UserProgress>;
  addGold(userId: string, amount: number): Promise<UserProgress>;
  spendGold(userId: string, amount: number): Promise<UserProgress>;
  
  // Skill operations
  getUserSkills(userId: string): Promise<UserSkill[]>;
  getUserSkill(userId: string, skillName: string): Promise<UserSkill | undefined>;
  updateUserSkill(userId: string, skillName: string, updates: Partial<UserSkill>): Promise<UserSkill | undefined>;
  updateUserSkillById(userId: string, skillId: number, updates: Partial<UserSkill>): Promise<UserSkill | undefined>;
  addSkillXp(userId: string, skillName: string, xp: number): Promise<UserSkill | undefined>;
  ensureDefaultSkills(userId: string): Promise<void>;
  restoreDefaultSkills(userId: string): Promise<void>;
  
  // Purchase operations
  getPurchases(userId: string): Promise<Purchase[]>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  usePurchase(id: number, userId: string): Promise<Purchase | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Skill XP progression constants
  private readonly SKILL_BASE_XP = 100; // Base XP requirement for level 1->2
  private readonly SKILL_GROWTH_RATE = 0.02; // 2% growth rate per level (modular for future adjustment)

  constructor() {
    // Initialize default shop items
    this.initializeShopItems();
  }

  /**
   * Calculate XP required for a specific level using RPG-style exponential growth
   * Formula: XP_required = base * (1 + rate)^(level - 1)
   * @param level - The target level
   * @returns XP required to reach that level from the previous level
   */
  private calculateXpForLevel(level: number): number {
    if (level <= 1) return this.SKILL_BASE_XP;
    return Math.floor(this.SKILL_BASE_XP * Math.pow(1 + this.SKILL_GROWTH_RATE, level - 1));
  }

  private async initializeShopItems() {
    const defaultItems: InsertShopItem[] = [
      { name: "30 Minutes TV Time", description: "Watch your favorite show guilt-free", cost: 50, icon: "tv", category: "entertainment" },
      { name: "1 Hour Gaming", description: "Play your favorite video game", cost: 100, icon: "gamepad", category: "entertainment" },
      { name: "Reading Time", description: "45 minutes of leisurely reading", cost: 75, icon: "book", category: "relaxation" },
      { name: "Coffee Break", description: "Enjoy a premium coffee treat", cost: 30, icon: "coffee", category: "food" },
      { name: "Relaxation Session", description: "30 minutes of meditation or yoga", cost: 60, icon: "heart", category: "wellness" },
      { name: "Music Session", description: "Listen to your favorite playlist", cost: 40, icon: "music", category: "entertainment" },
      { name: "Nature Walk", description: "Take a peaceful walk in nature", cost: 45, icon: "🌲", category: "wellness" },
      { name: "Flower Garden", description: "Spend time tending your garden", cost: 55, icon: "🌸", category: "relaxation" },
      { name: "Stargazing Night", description: "Observe the stars and cosmos", cost: 70, icon: "⭐", category: "relaxation" },
      { name: "Mountain View", description: "Enjoy a scenic mountain escape", cost: 80, icon: "🏔️", category: "wellness" },
      { name: "Ocean Breeze", description: "Relax by the sea", cost: 65, icon: "🌊", category: "relaxation" },
      { name: "Sunset Moment", description: "Watch a beautiful sunset", cost: 50, icon: "🌅", category: "wellness" },
      { name: "Forest Bathing", description: "Immerse yourself in the forest", cost: 75, icon: "🌳", category: "wellness" },
      { name: "Butterfly Garden", description: "Visit a peaceful butterfly sanctuary", cost: 60, icon: "🦋", category: "relaxation" },
      { name: "Moonlight Serenity", description: "Find peace under the moon", cost: 55, icon: "🌙", category: "relaxation" },
      { name: "Rainbow Day", description: "Chase rainbows and find joy", cost: 90, icon: "🌈", category: "entertainment" },
      { name: "Herb Garden", description: "Grow your own healing herbs", cost: 65, icon: "🌿", category: "wellness" },
      { name: "Cherry Blossom", description: "Experience spring's beauty", cost: 85, icon: "🌺", category: "relaxation" },
      { name: "Desert Oasis", description: "Find tranquility in the desert", cost: 70, icon: "🌵", category: "relaxation" },
      { name: "Autumn Leaves", description: "Walk through fall foliage", cost: 50, icon: "🍂", category: "wellness" },
      { name: "Tropical Paradise", description: "Escape to a tropical island", cost: 95, icon: "🏝️", category: "entertainment" },
    ];

    // Defer initialization until first use to avoid blocking app startup
    setTimeout(async () => {
      try {
        // Multiple retry attempts with exponential backoff
        let retries = 3;
        while (retries > 0) {
          try {
            const existingItems = await db.select().from(shopItems);
            if (existingItems.length === 0) {
              await db.insert(shopItems).values(defaultItems);
              console.log("Shop items initialized successfully");
            }
            break;
          } catch (error) {
            retries--;
            if (retries === 0) {
              console.error("Failed to initialize shop items after multiple attempts:", error);
            } else {
              console.log(`Retrying shop initialization... ${retries} attempts left`);
              await new Promise(resolve => setTimeout(resolve, 2000 * (4 - retries))); // Exponential backoff
            }
          }
        }
      } catch (error) {
        console.error("Error during shop initialization:", error);
      }
    }, 5000); // 5 second delay
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserSettings(
    userId: string, 
    settings: { 
      notionApiKey?: string; 
      notionDatabaseId?: string; 
      googleAccessToken?: string; 
      googleRefreshToken?: string; 
      googleTokenExpiry?: Date;
      googleCalendarClientId?: string;
      googleCalendarClientSecret?: string;
      googleCalendarAccessToken?: string;
      googleCalendarRefreshToken?: string;
      googleCalendarTokenExpiry?: Date | null;
      googleCalendarSyncEnabled?: boolean;
      googleCalendarSyncDirection?: string;
    }
  ): Promise<User> {
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    // Only update fields that are provided
    if (settings.notionApiKey !== undefined) updateData.notionApiKey = settings.notionApiKey;
    if (settings.notionDatabaseId !== undefined) updateData.notionDatabaseId = settings.notionDatabaseId;
    if (settings.googleAccessToken !== undefined) updateData.googleAccessToken = settings.googleAccessToken;
    if (settings.googleRefreshToken !== undefined) updateData.googleRefreshToken = settings.googleRefreshToken;
    if (settings.googleTokenExpiry !== undefined) updateData.googleTokenExpiry = settings.googleTokenExpiry;
    if (settings.googleCalendarClientId !== undefined) updateData.googleCalendarClientId = settings.googleCalendarClientId;
    if (settings.googleCalendarClientSecret !== undefined) updateData.googleCalendarClientSecret = settings.googleCalendarClientSecret;
    if (settings.googleCalendarAccessToken !== undefined) updateData.googleCalendarAccessToken = settings.googleCalendarAccessToken;
    if (settings.googleCalendarRefreshToken !== undefined) updateData.googleCalendarRefreshToken = settings.googleCalendarRefreshToken;
    if (settings.googleCalendarTokenExpiry !== undefined) updateData.googleCalendarTokenExpiry = settings.googleCalendarTokenExpiry;
    if (settings.googleCalendarSyncEnabled !== undefined) updateData.googleCalendarSyncEnabled = settings.googleCalendarSyncEnabled;
    if (settings.googleCalendarSyncDirection !== undefined) updateData.googleCalendarSyncDirection = settings.googleCalendarSyncDirection;
    
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Task operations
  async getTasks(userId: string): Promise<Task[]> {
    try {
      console.log('🗄️  [storage.getTasks] Querying tasks for user:', userId);
      const result = await db.select().from(tasks)
        .where(and(
          eq(tasks.userId, userId),
          eq(tasks.recycled, false)
        ))
        .orderBy(tasks.createdAt);
      console.log('🗄️  [storage.getTasks] Found', result.length, 'tasks');
      return result;
    } catch (error: any) {
      console.error('❌ [storage.getTasks] Error:', error.message);
      console.error('❌ [storage.getTasks] Stack:', error.stack);
      throw error;
    }
  }

  async getTask(id: number, userId: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: number, task: Partial<Task>, userId: string): Promise<Task | undefined> {
    console.log(`🗄️ [storage.updateTask] Updating task ${id} with:`, JSON.stringify(task, null, 2));
    const [updatedTask] = await db
      .update(tasks)
      .set(task)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
    console.log(`🗄️ [storage.updateTask] Result - scheduledTime: ${updatedTask?.scheduledTime}, googleEventId: ${updatedTask?.googleEventId}`);
    return updatedTask;
  }

  async deleteTask(id: number, userId: string): Promise<boolean> {
    // Move to recycling bin instead of hard delete
    const [recycledTask] = await db
      .update(tasks)
      .set({
        recycled: true,
        recycledAt: new Date(),
        recycledReason: 'deleted'
      })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
    return !!recycledTask;
  }

  async completeTask(id: number, userId: string): Promise<Task | undefined> {
    const task = await this.getTask(id, userId);
    if (!task || task.completed) return undefined;

    // Check if task is recurring
    const isRecurring = task.recurType && task.recurType !== 'one-time';
    
    if (isRecurring) {
      // For recurring tasks: award rewards but reschedule instead of completing
      const nextDueDate = this.calculateNextDueDate(task.dueDate, task.recurType);
      
      const [rescheduledTask] = await db
        .update(tasks)
        .set({
          dueDate: nextDueDate,
          // Don't mark as completed, just reschedule
        })
        .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
        .returning();

      // Award gold and update progress
      await this.addGold(userId, task.goldValue);

      // Award XP to skills if task has skill tags
      if (task.skillTags && task.skillTags.length > 0) {
        const { calculateXPPerSkill } = await import("./xpCalculation");
        const xpPerSkill = calculateXPPerSkill(task.importance, task.duration, task.skillTags.length);
        
        for (const skillName of task.skillTags) {
          await this.addSkillXp(userId, skillName, xpPerSkill);
        }
      }

      return rescheduledTask;
    } else {
      // For one-time tasks: complete and recycle as before
      const [completedTask] = await db
        .update(tasks)
        .set({
          completed: true,
          completedAt: new Date(),
          recycled: true,
          recycledAt: new Date(),
          recycledReason: 'completed'
        })
        .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
        .returning();

      // Award gold and update progress
      await this.addGold(userId, task.goldValue);

      // Award XP to skills if task has skill tags
      if (task.skillTags && task.skillTags.length > 0) {
        const { calculateXPPerSkill } = await import("./xpCalculation");
        const xpPerSkill = calculateXPPerSkill(task.importance, task.duration, task.skillTags.length);
        
        for (const skillName of task.skillTags) {
          await this.addSkillXp(userId, skillName, xpPerSkill);
        }
      }

      return completedTask;
    }
  }

  /**
   * Calculate the next due date for a recurring task
   */
  private calculateNextDueDate(currentDueDate: Date | null, recurType: string | null): Date {
    const baseDate = currentDueDate ? new Date(currentDueDate) : new Date();
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
      default:
        // Default to next day if unknown recur type
        nextDate.setDate(nextDate.getDate() + 1);
    }

    return nextDate;
  }

  async getRecycledTasks(userId: string): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(and(
        eq(tasks.userId, userId),
        eq(tasks.recycled, true)
      ))
      .orderBy(tasks.recycledAt);
  }

  async restoreTask(id: number, userId: string): Promise<Task | undefined> {
    const [restoredTask] = await db
      .update(tasks)
      .set({
        recycled: false,
        recycledAt: null,
        recycledReason: null
      })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId), eq(tasks.recycled, true)))
      .returning();
    return restoredTask;
  }

  async permanentlyDeleteTask(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId), eq(tasks.recycled, true)));
    return (result.rowCount ?? 0) > 0;
  }

  async permanentlyDeleteTasks(taskIds: number[], userId: string): Promise<number> {
    if (taskIds.length === 0) return 0;
    
    const result = await db.delete(tasks)
      .where(and(
        inArray(tasks.id, taskIds),
        eq(tasks.userId, userId),
        eq(tasks.recycled, true)
      ));
    
    return result.rowCount ?? 0;
  }

  // Shop operations
  async getShopItems(): Promise<ShopItem[]> {
    return await db.select().from(shopItems);
  }

  async getShopItemsForUser(userId: string): Promise<ShopItem[]> {
    // Get global items (isGlobal = true) OR user-specific items (userId matches)
    const items = await db.select().from(shopItems)
      .where(
        or(
          eq(shopItems.isGlobal, true),
          eq(shopItems.userId, userId)
        )
      );
    
    return items;
  }

  async getShopItem(id: number): Promise<ShopItem | undefined> {
    const [item] = await db.select().from(shopItems).where(eq(shopItems.id, id));
    return item;
  }

  async createShopItem(item: InsertShopItem): Promise<ShopItem> {
    const [newItem] = await db.insert(shopItems).values(item).returning();
    return newItem;
  }

  async updateShopItemPrice(id: number, cost: number, userId: string): Promise<ShopItem | undefined> {
    // Only allow updating user-specific items
    const [updatedItem] = await db.update(shopItems)
      .set({ cost })
      .where(
        and(
          eq(shopItems.id, id),
          eq(shopItems.userId, userId)
        )
      )
      .returning();
    return updatedItem;
  }

  async deleteShopItem(id: number, userId: string): Promise<boolean> {
    // Only allow deleting user-specific items or if user created it
    const result = await db.delete(shopItems)
      .where(
        and(
          eq(shopItems.id, id),
          eq(shopItems.userId, userId)
        )
      );
    return true;
  }

  // User progress operations
  async getUserProgress(userId: string): Promise<UserProgress> {
    const [progress] = await db.select().from(userProgress)
      .where(eq(userProgress.userId, userId));
    
    if (!progress) {
      // Create initial progress for new user
      const [newProgress] = await db.insert(userProgress)
        .values({
          userId,
          goldTotal: 0,
          tasksCompleted: 0,
          goldSpent: 0,
        })
        .returning();
      return newProgress;
    }
    
    return progress;
  }

  async updateUserProgress(userId: string, progress: Partial<UserProgress>): Promise<UserProgress> {
    const [updatedProgress] = await db
      .update(userProgress)
      .set(progress)
      .where(eq(userProgress.userId, userId))
      .returning();
    return updatedProgress;
  }

  async addGold(userId: string, amount: number): Promise<UserProgress> {
    const currentProgress = await this.getUserProgress(userId);
    return await this.updateUserProgress(userId, {
      goldTotal: (currentProgress.goldTotal || 0) + amount,
      tasksCompleted: (currentProgress.tasksCompleted || 0) + 1,
    });
  }

  async spendGold(userId: string, amount: number): Promise<UserProgress> {
    const currentProgress = await this.getUserProgress(userId);
    const currentGold = currentProgress.goldTotal || 0;
    
    if (currentGold < amount) {
      throw new Error("Insufficient gold");
    }
    
    return await this.updateUserProgress(userId, {
      goldTotal: currentGold - amount,
      goldSpent: (currentProgress.goldSpent || 0) + amount,
    });
  }

  // Purchase operations
  async getPurchases(userId: string): Promise<Purchase[]> {
    return await db.select().from(purchases)
      .where(eq(purchases.userId, userId))
      .orderBy(purchases.purchasedAt);
  }

  async createPurchase(purchase: InsertPurchase): Promise<Purchase> {
    const [newPurchase] = await db.insert(purchases).values(purchase).returning();
    return newPurchase;
  }

  async usePurchase(id: number, userId: string): Promise<Purchase | undefined> {
    const [usedPurchase] = await db
      .update(purchases)
      .set({
        used: true,
        usedAt: new Date(),
      })
      .where(and(eq(purchases.id, id), eq(purchases.userId, userId)))
      .returning();
    return usedPurchase;
  }

  // Skill operations
  async getUserSkills(userId: string): Promise<UserSkill[]> {
    return await db.select().from(userSkills)
      .where(eq(userSkills.userId, userId));
  }

  async getUserSkill(userId: string, skillName: string): Promise<UserSkill | undefined> {
    const [skill] = await db.select().from(userSkills)
      .where(and(eq(userSkills.userId, userId), eq(userSkills.skillName, skillName)));
    return skill;
  }

  async updateUserSkill(userId: string, skillName: string, updates: Partial<UserSkill>): Promise<UserSkill | undefined> {
    const [updatedSkill] = await db
      .update(userSkills)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(userSkills.userId, userId), eq(userSkills.skillName, skillName)))
      .returning();
    return updatedSkill;
  }

  async updateUserSkillById(userId: string, skillId: number, updates: Partial<UserSkill>): Promise<UserSkill | undefined> {
    const [updatedSkill] = await db
      .update(userSkills)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(userSkills.userId, userId), eq(userSkills.id, skillId)))
      .returning();
    return updatedSkill;
  }

  async addSkillXp(userId: string, skillName: string, xpAmount: number): Promise<UserSkill | undefined> {
    // Get current skill
    const [currentSkill] = await db.select().from(userSkills)
      .where(and(eq(userSkills.userId, userId), eq(userSkills.skillName, skillName)));
    
    if (!currentSkill) {
      return undefined;
    }

    let newXp = currentSkill.xp + xpAmount;
    let newLevel = currentSkill.level;
    let newMaxXp = currentSkill.maxXp;

    // Level up logic (max level 99) using RPG-style exponential growth
    while (newXp >= newMaxXp && newLevel < 99) {
      newXp -= newMaxXp;
      newLevel++;
      // Calculate new XP requirement for next level using formula: base * (1 + rate)^(level - 1)
      newMaxXp = this.calculateXpForLevel(newLevel);
    }

    // If at max level, cap XP at maxXp
    if (newLevel >= 99) {
      newLevel = 99;
      newXp = Math.min(newXp, newMaxXp);
    }

    return await this.updateUserSkill(userId, skillName, {
      level: newLevel,
      xp: newXp,
      maxXp: newMaxXp,
    });
  }

  // Custom skill operations
  async createCustomSkill(userId: string, skillData: {
    skillName: string;
    skillIcon?: string;
    skillDescription?: string;
    skillMilestones?: string[];
    level?: number;
  }): Promise<UserSkill> {
    // Check if skill name already exists for this user
    const [existing] = await db.select().from(userSkills)
      .where(and(eq(userSkills.userId, userId), eq(userSkills.skillName, skillData.skillName)));
    
    if (existing) {
      throw new Error("A skill with this name already exists");
    }

    const level = skillData.level || 1;
    const [newSkill] = await db.insert(userSkills).values({
      userId,
      skillName: skillData.skillName,
      skillIcon: skillData.skillIcon || null,
      skillDescription: skillData.skillDescription || null,
      skillMilestones: (skillData.skillMilestones || null) as string[] | null,
      isCustom: true,
      level,
      xp: 0,
      maxXp: this.calculateXpForLevel(level),
    }).returning();

    return newSkill;
  }

  async deleteCustomSkill(userId: string, skillId: number): Promise<boolean> {
    // Only allow deleting custom skills
    const [skill] = await db.select().from(userSkills)
      .where(and(eq(userSkills.userId, userId), eq(userSkills.id, skillId)));
    
    if (!skill) {
      throw new Error("Skill not found");
    }

    if (!skill.isCustom) {
      throw new Error("Cannot delete default skills");
    }

    // Delete the skill
    await db.delete(userSkills)
      .where(and(eq(userSkills.userId, userId), eq(userSkills.id, skillId)));

    // Also remove this skill from any task skillTags
    const tasksWithSkill = await db.select().from(tasks)
      .where(eq(tasks.userId, userId));

    for (const task of tasksWithSkill) {
      if (task.skillTags && Array.isArray(task.skillTags)) {
        const updatedTags = task.skillTags.filter(tag => tag !== skill.skillName);
        if (updatedTags.length !== task.skillTags.length) {
          await db.update(tasks)
            .set({ skillTags: updatedTags })
            .where(eq(tasks.id, task.id));
        }
      }
    }

    return true;
  }

  async updateSkillIcon(userId: string, skillId: number, icon: string): Promise<void> {
    // Find the skill
    const [skill] = await db.select().from(userSkills)
      .where(and(eq(userSkills.userId, userId), eq(userSkills.id, skillId)));
    
    if (!skill) {
      throw new Error("Skill not found");
    }

    // Update the icon
    await db.update(userSkills)
      .set({ skillIcon: icon })
      .where(and(eq(userSkills.userId, userId), eq(userSkills.id, skillId)));
  }

  async updateSkill(
    userId: string, 
    skillId: number, 
    updates: { icon?: string; level?: number; xp?: number }
  ): Promise<void> {
    // Find the skill
    const [skill] = await db.select().from(userSkills)
      .where(and(eq(userSkills.userId, userId), eq(userSkills.id, skillId)));
    
    if (!skill) {
      throw new Error("Skill not found");
    }

    // Build update object
    const updateData: any = {};
    if (updates.icon) updateData.skillIcon = updates.icon;
    if (updates.level !== undefined) updateData.level = updates.level;
    if (updates.xp !== undefined) updateData.xp = updates.xp;
    updateData.updatedAt = new Date();

    // Update the skill
    await db.update(userSkills)
      .set(updateData)
      .where(and(eq(userSkills.userId, userId), eq(userSkills.id, skillId)));
  }

  async updateSkillMilestones(
    userId: string,
    skillId: number,
    milestones: Array<{ id: string; title: string; level: number; x: number; y: number }>
  ): Promise<void> {
    // Find the skill
    const [skill] = await db.select().from(userSkills)
      .where(and(eq(userSkills.userId, userId), eq(userSkills.id, skillId)));
    
    if (!skill) {
      throw new Error("Skill not found");
    }

    // Update the constellation milestones
    await db.update(userSkills)
      .set({ 
        constellationMilestones: milestones,
        updatedAt: new Date()
      })
      .where(and(eq(userSkills.userId, userId), eq(userSkills.id, skillId)));
  }

  async toggleMilestoneCompletion(
    userId: string,
    skillId: number,
    milestoneId: string
  ): Promise<any> {
    // Find the skill
    const [skill] = await db.select().from(userSkills)
      .where(and(eq(userSkills.userId, userId), eq(userSkills.id, skillId)));
    
    if (!skill) {
      throw new Error("Skill not found");
    }

    // Get current completed milestones array
    const completedMilestones = (skill.completedMilestones as string[]) || [];
    
    // Toggle: if milestone is completed, remove it; if not, add it
    let updatedCompletedMilestones: string[];
    if (completedMilestones.includes(milestoneId)) {
      // Remove from completed
      updatedCompletedMilestones = completedMilestones.filter(id => id !== milestoneId);
    } else {
      // Add to completed
      updatedCompletedMilestones = [...completedMilestones, milestoneId];
    }

    // Update the skill
    const [updatedSkill] = await db.update(userSkills)
      .set({ 
        completedMilestones: updatedCompletedMilestones,
        updatedAt: new Date()
      })
      .where(and(eq(userSkills.userId, userId), eq(userSkills.id, skillId)))
      .returning();

    return updatedSkill;
  }

  private async initializeUserSkills(userId: string): Promise<void> {
    // Map skill names to their default icons
    const skillIconMap: Record<string, string> = {
      "Craftsman": "Wrench",
      "Artist": "Palette",
      "Mindset": "Brain",
      "Merchant": "Briefcase",
      "Physical": "Activity",
      "Scholar": "Book",
      "Connector": "Handshake",
      "Charisma": "Users",
      "Health": "Heart",
      "Explorer": "Compass"
    };

    const skillNames = [
      "Craftsman",
      "Artist", 
      "Mindset",
      "Merchant",
      "Physical",
      "Scholar",
      "Connector",
      "Charisma",
      "Health",
      "Explorer"
    ];

    const defaultSkills: InsertUserSkill[] = skillNames.map(name => ({
      userId,
      skillName: name,
      skillIcon: skillIconMap[name] || null,
      skillDescription: null,
      skillMilestones: null as string[] | null,
      isCustom: false,
      level: 1,
      xp: 0,
      maxXp: this.calculateXpForLevel(1), // Use formula for initial XP requirement
    }));

    await db.insert(userSkills).values(defaultSkills);
  }

  async ensureDefaultSkills(userId: string): Promise<void> {
    // Map skill names to their default icons
    const skillIconMap: Record<string, string> = {
      "Craftsman": "Wrench",
      "Artist": "Palette",
      "Mindset": "Brain",
      "Merchant": "Briefcase",
      "Physical": "Activity",
      "Scholar": "Book",
      "Connector": "Handshake",
      "Charisma": "Users",
      "Health": "Heart",
      "Explorer": "Compass"
    };

    const skillNames = [
      "Craftsman",
      "Artist", 
      "Mindset",
      "Merchant",
      "Physical",
      "Scholar",
      "Connector",
      "Charisma",
      "Health",
      "Explorer"
    ];

    console.log("ensureDefaultSkills called for user:", userId);

    // Get existing skills
    const existingSkills = await this.getUserSkills(userId);
    const existingSkillNames = existingSkills.map(s => s.skillName);
    console.log("Existing skills:", existingSkillNames);

    // Find missing default skills
    const missingSkills = skillNames.filter(name => !existingSkillNames.includes(name));
    console.log("Missing skills:", missingSkills);

    // Add missing skills
    if (missingSkills.length > 0) {
      const skillsToAdd: InsertUserSkill[] = missingSkills.map(name => ({
        userId,
        skillName: name,
        skillIcon: skillIconMap[name] || null,
        skillDescription: null,
        skillMilestones: null as string[] | null,
        isCustom: false,
        level: 1,
        xp: 0,
        maxXp: this.calculateXpForLevel(1), // Use formula for initial XP requirement
      }));

      console.log("Adding skills:", skillsToAdd);
      await db.insert(userSkills).values(skillsToAdd);
      console.log("Skills added successfully");
    } else {
      console.log("No missing skills to add");
    }
  }

  async restoreDefaultSkills(userId: string): Promise<void> {
    // Map skill names to their default icons
    const skillIconMap: Record<string, string> = {
      "Craftsman": "Wrench",
      "Artist": "Palette",
      "Mindset": "Brain",
      "Merchant": "Briefcase",
      "Physical": "Activity",
      "Scholar": "Book",
      "Connector": "Handshake",
      "Charisma": "Users",
      "Health": "Heart",
      "Explorer": "Compass"
    };

    const skillNames = [
      "Craftsman",
      "Artist", 
      "Mindset",
      "Merchant",
      "Physical",
      "Scholar",
      "Connector",
      "Charisma",
      "Health",
      "Explorer"
    ];

    console.log("restoreDefaultSkills called for user:", userId);

    if (!userId) {
      const msg = "restoreDefaultSkills called without userId";
      console.error(msg);
      throw new Error(msg);
    }

    try {
      // Delete ALL existing skills for this user
      await db.delete(userSkills).where(eq(userSkills.userId, userId));
      console.log("Deleted all existing skills for user:", userId);

      // Add all 9 default skills fresh
      const skillsToAdd: InsertUserSkill[] = skillNames.map(name => ({
        userId,
        skillName: name,
        skillIcon: skillIconMap[name] || null,
        skillDescription: null,
        skillMilestones: null as string[] | null,
        isCustom: false,
        level: 1,
        xp: 0,
        maxXp: this.calculateXpForLevel(1), // Use formula for initial XP requirement
      }));

      console.log("Adding fresh default skills count:", skillsToAdd.length, "for user:", userId);
      const result = await db.insert(userSkills).values(skillsToAdd);
      console.log("DB insert result for restoreDefaultSkills:", result);
      console.log("All 9 default skills restored successfully for user:", userId);
    } catch (error) {
      console.error("Error in restoreDefaultSkills for user:", userId, error);
      // Re-throw to let route handler return 500 with details
      throw error;
    }
  }

  // Authentication operations
  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: { username: string; email: string; password: string }): Promise<User> {
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(userData.password, 10);
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const [user] = await db.insert(users).values({
      id,
      username: userData.username,
      email: userData.email,
      passwordHash,
    }).returning();
    
    // Initialize user skills with all skills at level 1
    await this.initializeUserSkills(id);
    
    return user;
  }

  async verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    const bcrypt = await import('bcryptjs');
    return bcrypt.compare(password, passwordHash);
  }

  async updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
    return true;
  }

  // Password reset token operations
  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt,
    });
  }

  async getPasswordResetToken(token: string): Promise<{ userId: string; expiresAt: Date; used: boolean } | undefined> {
    const [result] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    if (!result) return undefined;
    return {
      userId: result.userId,
      expiresAt: result.expiresAt,
      used: result.used || false,
    };
  }

  async markPasswordResetTokenUsed(token: string): Promise<void> {
    await db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.token, token));
  }

  // Campaign operations
  async getCampaigns(userId: string): Promise<Campaign[]> {
    return db.select().from(campaigns).where(eq(campaigns.userId, userId));
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db.insert(campaigns).values(campaign).returning();
    return newCampaign;
  }

  async deleteCampaign(userId: string, campaignId: number): Promise<boolean> {
    const result = await db.delete(campaigns).where(
      and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId))
    );
    return true;
  }

  // Google Calendar operations
  async getTaskByGoogleEventId(userId: string, eventId: string): Promise<Task | undefined> {
    const result = await db.select().from(tasks).where(
      and(eq(tasks.userId, userId), eq(tasks.googleEventId, eventId))
    ).limit(1);
    return result[0];
  }

  async getUncompletedTasks(userId: string): Promise<Task[]> {
    return db.select().from(tasks).where(
      and(eq(tasks.userId, userId), eq(tasks.completed, false))
    );
  }

  async updateGoogleCalendarSettings(
    userId: string,
    settings: {
      googleCalendarClientId?: string;
      googleCalendarClientSecret?: string;
      googleCalendarRefreshToken?: string;
      googleCalendarAccessToken?: string;
      googleCalendarTokenExpiry?: Date;
      googleCalendarSyncEnabled?: boolean;
      googleCalendarSyncDirection?: string;
      googleCalendarLastSync?: Date;
    }
  ): Promise<User> {
    const [user] = await db
      .update(users)
      .set(settings)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Financial items operations
  async getFinancialItems(userId: string): Promise<FinancialItem[]> {
    return db.select().from(financialItems).where(eq(financialItems.userId, userId));
  }

  async createFinancialItem(item: InsertFinancialItem): Promise<FinancialItem> {
    const [newItem] = await db.insert(financialItems).values(item).returning();
    return newItem;
  }

  async deleteFinancialItem(userId: string, itemId: number): Promise<boolean> {
    await db.delete(financialItems).where(
      and(eq(financialItems.id, itemId), eq(financialItems.userId, userId))
    );
    return true;
  }

  // ML Sorting operations
  async getMlSortingPreferences(userId: string): Promise<any | null> {
    const result = await db.select().from(mlSortingPreferences).where(eq(mlSortingPreferences.userId, userId)).limit(1);
    return result[0] || null;
  }

  async upsertMlSortingPreferences(userId: string, preferences: Partial<{
    preferredStartHour: number;
    preferredEndHour: number;
    priorityWeights: any;
    breakDuration: number;
    highPriorityTimePreference: string;
    totalApproved: number;
    totalCorrected: number;
  }>): Promise<void> {
    const existing = await this.getMlSortingPreferences(userId);
    if (existing) {
      await db.update(mlSortingPreferences)
        .set({ ...preferences, updatedAt: new Date() })
        .where(eq(mlSortingPreferences.userId, userId));
    } else {
      await db.insert(mlSortingPreferences).values({
        userId,
        ...preferences,
      });
    }
  }

  async saveMlSortingFeedback(feedback: {
    userId: string;
    date: Date;
    originalSchedule: any[];
    mlSortedSchedule: any[];
    userCorrectedSchedule?: any[];
    feedbackType: string;
    feedbackReason?: string;
    taskMetadata?: any[];
  }): Promise<void> {
    await db.insert(mlSortingFeedback).values(feedback);
  }
}

export const storage = new DatabaseStorage();