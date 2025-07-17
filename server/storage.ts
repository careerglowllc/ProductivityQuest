import { tasks, shopItems, userProgress, purchases, type Task, type InsertTask, type ShopItem, type InsertShopItem, type UserProgress, type InsertUserProgress, type Purchase, type InsertPurchase } from "@shared/schema";

export interface IStorage {
  // Task operations
  getTasks(): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  completeTask(id: number): Promise<Task | undefined>;
  
  // Recycling operations
  getRecycledTasks(): Promise<Task[]>;
  recycleTask(id: number, reason: "completed" | "deleted"): Promise<Task | undefined>;
  restoreTask(id: number): Promise<Task | undefined>;
  permanentlyDeleteTask(id: number): Promise<boolean>;
  
  // Shop operations
  getShopItems(): Promise<ShopItem[]>;
  getShopItem(id: number): Promise<ShopItem | undefined>;
  createShopItem(item: InsertShopItem): Promise<ShopItem>;
  
  // User progress operations
  getUserProgress(): Promise<UserProgress>;
  updateUserProgress(progress: Partial<UserProgress>): Promise<UserProgress>;
  addGold(amount: number): Promise<UserProgress>;
  spendGold(amount: number): Promise<UserProgress>;
  
  // Purchase operations
  getPurchases(): Promise<Purchase[]>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  usePurchase(id: number): Promise<Purchase | undefined>;
}

export class MemStorage implements IStorage {
  private tasks: Map<number, Task> = new Map();
  private shopItems: Map<number, ShopItem> = new Map();
  private userProgress: UserProgress;
  private purchases: Map<number, Purchase> = new Map();
  private currentTaskId = 1;
  private currentShopItemId = 1;
  private currentPurchaseId = 1;

  constructor() {
    this.userProgress = {
      id: 1,
      goldTotal: 0,
      tasksCompleted: 0,
      goldSpent: 0,
      lastSyncedAt: null,
    };
    
    // Initialize default shop items
    this.initializeShopItems();
  }

  private initializeShopItems() {
    const defaultItems: InsertShopItem[] = [
      { name: "30 Minutes TV Time", description: "Watch your favorite show guilt-free", cost: 50, icon: "tv", category: "entertainment" },
      { name: "1 Hour Gaming", description: "Play your favorite video game", cost: 100, icon: "gamepad", category: "entertainment" },
      { name: "Reading Time", description: "45 minutes of leisurely reading", cost: 75, icon: "book", category: "relaxation" },
      { name: "Coffee Break", description: "Enjoy a premium coffee treat", cost: 30, icon: "coffee", category: "food" },
      { name: "Relaxation Session", description: "30 minutes of meditation or yoga", cost: 60, icon: "heart", category: "wellness" },
      { name: "Music Session", description: "Listen to your favorite playlist", cost: 40, icon: "music", category: "entertainment" },
    ];

    defaultItems.forEach(item => {
      const shopItem: ShopItem = { ...item, id: this.currentShopItemId++ };
      this.shopItems.set(shopItem.id, shopItem);
    });
  }

  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(task => !task.recycled)
      .sort((a, b) => 
        new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
      );
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(task: InsertTask): Promise<Task> {
    const newTask: Task = {
      ...task,
      id: this.currentTaskId++,
      createdAt: new Date(),
      completedAt: null,
      description: task.description || null,
      notionId: task.notionId || null,
      dueDate: task.dueDate || null,
      completed: task.completed || false,
      importance: task.importance || null,
      kanbanStage: task.kanbanStage || null,
      recurType: task.recurType || null,
      lifeDomain: task.lifeDomain || null,
      apple: task.apple || false,
      smartPrep: task.smartPrep || false,
      delegationTask: task.delegationTask || false,
      velin: task.velin || false,
      recycled: false,
      recycledAt: null,
      recycledReason: null,
    };
    this.tasks.set(newTask.id, newTask);
    return newTask;
  }

  async updateTask(id: number, task: Partial<Task>): Promise<Task | undefined> {
    const existingTask = this.tasks.get(id);
    if (!existingTask) return undefined;

    const updatedTask = { ...existingTask, ...task };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number): Promise<boolean> {
    // Move task to recycling instead of permanent deletion
    const recycled = await this.recycleTask(id, "deleted");
    return recycled !== undefined;
  }

  async completeTask(id: number): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task || task.completed) return undefined;

    const completedTask = {
      ...task,
      completed: true,
      completedAt: new Date(),
    };

    this.tasks.set(id, completedTask);
    
    // Award gold and update progress
    this.userProgress.goldTotal = (this.userProgress.goldTotal || 0) + task.goldValue;
    this.userProgress.tasksCompleted = (this.userProgress.tasksCompleted || 0) + 1;

    // Move completed task to recycling
    const recycledTask = await this.recycleTask(id, "completed");

    return recycledTask || completedTask;
  }

  // Recycling operations
  async getRecycledTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(task => task.recycled)
      .sort((a, b) => 
        new Date(b.recycledAt!).getTime() - new Date(a.recycledAt!).getTime()
      );
  }

  async recycleTask(id: number, reason: "completed" | "deleted"): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    const recycledTask = {
      ...task,
      recycled: true,
      recycledAt: new Date(),
      recycledReason: reason,
    };

    this.tasks.set(id, recycledTask);
    return recycledTask;
  }

  async restoreTask(id: number): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task || !task.recycled) return undefined;

    const restoredTask = {
      ...task,
      recycled: false,
      recycledAt: null,
      recycledReason: null,
      // If task was completed, restore it to incomplete state
      completed: task.recycledReason === "completed" ? false : task.completed,
      completedAt: task.recycledReason === "completed" ? null : task.completedAt,
    };

    this.tasks.set(id, restoredTask);
    
    // If restoring a completed task, subtract the gold and task count
    if (task.recycledReason === "completed") {
      this.userProgress.goldTotal = Math.max(0, (this.userProgress.goldTotal || 0) - task.goldValue);
      this.userProgress.tasksCompleted = Math.max(0, (this.userProgress.tasksCompleted || 0) - 1);
    }

    return restoredTask;
  }

  async permanentlyDeleteTask(id: number): Promise<boolean> {
    const task = this.tasks.get(id);
    if (!task || !task.recycled) return false;

    return this.tasks.delete(id);
  }

  async getShopItems(): Promise<ShopItem[]> {
    return Array.from(this.shopItems.values());
  }

  async getShopItem(id: number): Promise<ShopItem | undefined> {
    return this.shopItems.get(id);
  }

  async createShopItem(item: InsertShopItem): Promise<ShopItem> {
    const newItem: ShopItem = {
      ...item,
      id: this.currentShopItemId++,
    };
    this.shopItems.set(newItem.id, newItem);
    return newItem;
  }

  async getUserProgress(): Promise<UserProgress> {
    return this.userProgress;
  }

  async updateUserProgress(progress: Partial<UserProgress>): Promise<UserProgress> {
    this.userProgress = { ...this.userProgress, ...progress };
    return this.userProgress;
  }

  async addGold(amount: number): Promise<UserProgress> {
    this.userProgress.goldTotal = (this.userProgress.goldTotal || 0) + amount;
    return this.userProgress;
  }

  async spendGold(amount: number): Promise<UserProgress> {
    const currentGold = this.userProgress.goldTotal || 0;
    if (currentGold < amount) {
      throw new Error("Insufficient gold");
    }
    this.userProgress.goldTotal = currentGold - amount;
    this.userProgress.goldSpent = (this.userProgress.goldSpent || 0) + amount;
    return this.userProgress;
  }

  async getPurchases(): Promise<Purchase[]> {
    return Array.from(this.purchases.values()).sort((a, b) => 
      new Date(b.purchasedAt!).getTime() - new Date(a.purchasedAt!).getTime()
    );
  }

  async createPurchase(purchase: InsertPurchase): Promise<Purchase> {
    const newPurchase: Purchase = {
      ...purchase,
      id: this.currentPurchaseId++,
      purchasedAt: new Date(),
      usedAt: null,
      shopItemId: purchase.shopItemId || null,
      used: purchase.used || false,
    };
    this.purchases.set(newPurchase.id, newPurchase);
    return newPurchase;
  }

  async usePurchase(id: number): Promise<Purchase | undefined> {
    const purchase = this.purchases.get(id);
    if (!purchase || purchase.used) return undefined;

    const usedPurchase = {
      ...purchase,
      used: true,
      usedAt: new Date(),
    };

    this.purchases.set(id, usedPurchase);
    return usedPurchase;
  }
}

export const storage = new MemStorage();
