import { tasks, shopItems, userProgress, userSkills, purchases, users, type Task, type InsertTask, type ShopItem, type InsertShopItem, type UserProgress, type InsertUserProgress, type UserSkill, type InsertUserSkill, type Purchase, type InsertPurchase, type User, type UpsertUser } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, isNull } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserSettings(userId: string, settings: { notionApiKey?: string; notionDatabaseId?: string; googleAccessToken?: string; googleRefreshToken?: string; googleTokenExpiry?: Date }): Promise<User>;
  
  // Task operations
  getTasks(userId: string): Promise<Task[]>;
  getTask(id: number, userId: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<Task>, userId: string): Promise<Task | undefined>;
  deleteTask(id: number, userId: string): Promise<boolean>;
  completeTask(id: number, userId: string): Promise<Task | undefined>;
  
  // Recycling operations
  getRecycledTasks(userId: string): Promise<Task[]>;
  recycleTask(id: number, reason: "completed" | "deleted", userId: string): Promise<Task | undefined>;
  restoreTask(id: number, userId: string): Promise<Task | undefined>;
  permanentlyDeleteTask(id: number, userId: string): Promise<boolean>;
  
  // Shop operations
  getShopItems(): Promise<ShopItem[]>;
  getShopItemsForUser(userId: string): Promise<ShopItem[]>;
  getShopItem(id: number): Promise<ShopItem | undefined>;
  createShopItem(item: InsertShopItem): Promise<ShopItem>;
  deleteShopItem(id: number, userId: string): Promise<boolean>;
  
  // User progress operations
  getUserProgress(userId: string): Promise<UserProgress>;
  updateUserProgress(userId: string, progress: Partial<UserProgress>): Promise<UserProgress>;
  addGold(userId: string, amount: number): Promise<UserProgress>;
  spendGold(userId: string, amount: number): Promise<UserProgress>;
  
  // Skill operations
  getUserSkills(userId: string): Promise<UserSkill[]>;
  updateUserSkill(userId: string, skillName: string, updates: Partial<UserSkill>): Promise<UserSkill | undefined>;
  updateUserSkillById(userId: string, skillId: number, updates: Partial<UserSkill>): Promise<UserSkill | undefined>;
  addSkillXp(userId: string, skillName: string, xp: number): Promise<UserSkill | undefined>;
  ensureDefaultSkills(userId: string): Promise<void>;
  
  // Purchase operations
  getPurchases(userId: string): Promise<Purchase[]>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  usePurchase(id: number, userId: string): Promise<Purchase | undefined>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize default shop items
    this.initializeShopItems();
  }

  private async initializeShopItems() {
    const defaultItems: InsertShopItem[] = [
      { name: "30 Minutes TV Time", description: "Watch your favorite show guilt-free", cost: 50, icon: "tv", category: "entertainment" },
      { name: "1 Hour Gaming", description: "Play your favorite video game", cost: 100, icon: "gamepad", category: "entertainment" },
      { name: "Reading Time", description: "45 minutes of leisurely reading", cost: 75, icon: "book", category: "relaxation" },
      { name: "Coffee Break", description: "Enjoy a premium coffee treat", cost: 30, icon: "coffee", category: "food" },
      { name: "Relaxation Session", description: "30 minutes of meditation or yoga", cost: 60, icon: "heart", category: "wellness" },
      { name: "Music Session", description: "Listen to your favorite playlist", cost: 40, icon: "music", category: "entertainment" },
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

  async updateUserSettings(userId: string, settings: { notionApiKey?: string; notionDatabaseId?: string; googleAccessToken?: string; googleRefreshToken?: string; googleTokenExpiry?: Date }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        notionApiKey: settings.notionApiKey,
        notionDatabaseId: settings.notionDatabaseId,
        googleAccessToken: settings.googleAccessToken,
        googleRefreshToken: settings.googleRefreshToken,
        googleTokenExpiry: settings.googleTokenExpiry,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Task operations
  async getTasks(userId: string): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.recycled, false)))
      .orderBy(tasks.createdAt);
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
    const [updatedTask] = await db
      .update(tasks)
      .set(task)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
    return updatedTask;
  }

  async deleteTask(id: number, userId: string): Promise<boolean> {
    const recycled = await this.recycleTask(id, "deleted", userId);
    return recycled !== undefined;
  }

  async completeTask(id: number, userId: string): Promise<Task | undefined> {
    const task = await this.getTask(id, userId);
    if (!task || task.completed) return undefined;

    const [completedTask] = await db
      .update(tasks)
      .set({
        completed: true,
        completedAt: new Date(),
      })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();

    // Award gold and update progress
    await this.addGold(userId, task.goldValue);
    
    // Move completed task to recycling
    const recycledTask = await this.recycleTask(id, "completed", userId);

    return recycledTask || completedTask;
  }

  // Recycling operations
  async getRecycledTasks(userId: string): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.recycled, true)))
      .orderBy(tasks.recycledAt);
  }

  async recycleTask(id: number, reason: "completed" | "deleted", userId: string): Promise<Task | undefined> {
    const [recycledTask] = await db
      .update(tasks)
      .set({
        recycled: true,
        recycledAt: new Date(),
        recycledReason: reason,
      })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
    return recycledTask;
  }

  async restoreTask(id: number, userId: string): Promise<Task | undefined> {
    const task = await this.getTask(id, userId);
    if (!task || !task.recycled) return undefined;

    const [restoredTask] = await db
      .update(tasks)
      .set({
        recycled: false,
        recycledAt: null,
        recycledReason: null,
        completed: task.recycledReason === "completed" ? false : task.completed,
        completedAt: task.recycledReason === "completed" ? null : task.completedAt,
      })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();

    // If task was completed, reduce gold and task count
    if (task.recycledReason === "completed") {
      const progress = await this.getUserProgress(userId);
      await this.updateUserProgress(userId, {
        goldTotal: (progress.goldTotal || 0) - task.goldValue,
        tasksCompleted: (progress.tasksCompleted || 0) - 1,
      });
    }

    return restoredTask;
  }

  async permanentlyDeleteTask(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
    return (result.rowCount ?? 0) > 0;
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

    // Level up logic
    while (newXp >= newMaxXp) {
      newXp -= newMaxXp;
      newLevel++;
      newMaxXp = Math.floor(newMaxXp * 1.5); // Increase XP requirement by 50% each level
    }

    return await this.updateUserSkill(userId, skillName, {
      level: newLevel,
      xp: newXp,
      maxXp: newMaxXp,
    });
  }

  private async initializeUserSkills(userId: string): Promise<void> {
    const skillNames = [
      "Craftsman",
      "Artist", 
      "Will",
      "Merchant",
      "Warrior",
      "Scholar",
      "Connector",
      "Charisma",
      "Health"
    ];

    const defaultSkills: InsertUserSkill[] = skillNames.map(name => ({
      userId,
      skillName: name,
      level: 1,
      xp: 0,
      maxXp: 100,
    }));

    await db.insert(userSkills).values(defaultSkills);
  }

  async ensureDefaultSkills(userId: string): Promise<void> {
    const skillNames = [
      "Craftsman",
      "Artist", 
      "Will",
      "Merchant",
      "Warrior",
      "Scholar",
      "Connector",
      "Charisma",
      "Health"
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
        level: 1,
        xp: 0,
        maxXp: 100,
      }));

      console.log("Adding skills:", skillsToAdd);
      await db.insert(userSkills).values(skillsToAdd);
      console.log("Skills added successfully");
    } else {
      console.log("No missing skills to add");
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
}

export const storage = new DatabaseStorage();