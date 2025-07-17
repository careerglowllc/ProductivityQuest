import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { notion, findDatabaseByTitle, getTasks as getNotionTasks, createDatabaseIfNotExists } from "./notion";
import { googleCalendar } from "./google-calendar";
import { insertTaskSchema, insertPurchaseSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Task routes
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      res.status(400).json({ error: "Invalid task data" });
    }
  });

  app.patch("/api/tasks/:id/complete", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.completeTask(id);
      if (!task) {
        return res.status(404).json({ error: "Task not found or already completed" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to complete task" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTask(id);
      if (!success) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Notion integration routes
  app.post("/api/notion/sync", async (req, res) => {
    try {
      // Find or create tasks database with gamification fields
      const tasksDb = await findDatabaseByTitle("QuestList Tasks");
      
      if (!tasksDb) {
        // Create the database with gamification fields
        await createDatabaseIfNotExists("QuestList Tasks", {
          Title: { title: {} },
          Description: { rich_text: {} },
          "Task Details": { rich_text: {} },
          Duration: { number: {} },
          "Time to Complete": { number: {} },
          "Gold Earned": { number: {} },
          GoldEarned: { number: {} },
          DueDate: { date: {} },
          Completed: { checkbox: {} },
          CompletedAt: { date: {} },
        });
      }

      // Get the database again after creation
      const updatedDb = await findDatabaseByTitle("QuestList Tasks");
      if (!updatedDb) {
        throw new Error("Failed to create or find tasks database");
      }

      // Clear existing tasks to avoid duplicates
      const existingTasks = await storage.getTasks();
      for (const task of existingTasks) {
        if (task.notionId) {
          await storage.deleteTask(task.id);
        }
      }

      // Fetch tasks from Notion
      const notionTasks = await getNotionTasks(updatedDb.id);
      
      // Sync tasks to local storage
      for (const notionTask of notionTasks) {
        await storage.createTask({
          notionId: notionTask.notionId,
          title: notionTask.title,
          description: notionTask.description,
          duration: notionTask.duration,
          goldValue: notionTask.goldValue,
          dueDate: notionTask.dueDate,
          completed: notionTask.isCompleted,
        });
      }

      res.json({ success: true, count: notionTasks.length });
    } catch (error) {
      console.error("Notion sync error:", error);
      res.status(500).json({ error: "Failed to sync with Notion. Please check your integration settings." });
    }
  });

  // Google Calendar integration routes
  app.post("/api/calendar/sync", async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      await googleCalendar.syncTasks(tasks);
      
      // Update last synced timestamp
      await storage.updateUserProgress({
        lastSyncedAt: new Date(),
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Calendar sync error:", error);
      res.status(500).json({ error: "Failed to sync with Google Calendar" });
    }
  });

  // Shop routes
  app.get("/api/shop/items", async (req, res) => {
    try {
      const items = await storage.getShopItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch shop items" });
    }
  });

  app.post("/api/shop/purchase", async (req, res) => {
    try {
      const { shopItemId } = req.body;
      const shopItem = await storage.getShopItem(shopItemId);
      
      if (!shopItem) {
        return res.status(404).json({ error: "Shop item not found" });
      }

      const userProgress = await storage.getUserProgress();
      if ((userProgress.goldTotal || 0) < shopItem.cost) {
        return res.status(400).json({ error: "Insufficient gold" });
      }

      // Create purchase and deduct gold
      const purchase = await storage.createPurchase({
        shopItemId,
        cost: shopItem.cost,
        used: false,
      });

      await storage.spendGold(shopItem.cost);

      res.json(purchase);
    } catch (error) {
      res.status(500).json({ error: "Failed to process purchase" });
    }
  });

  app.get("/api/purchases", async (req, res) => {
    try {
      const purchases = await storage.getPurchases();
      res.json(purchases);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchases" });
    }
  });

  app.patch("/api/purchases/:id/use", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const purchase = await storage.usePurchase(id);
      if (!purchase) {
        return res.status(404).json({ error: "Purchase not found or already used" });
      }
      res.json(purchase);
    } catch (error) {
      res.status(500).json({ error: "Failed to use purchase" });
    }
  });

  // User progress routes
  app.get("/api/progress", async (req, res) => {
    try {
      const progress = await storage.getUserProgress();
      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });

  // Statistics routes
  app.get("/api/stats", async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayTasks = tasks.filter(task => {
        const taskDate = new Date(task.createdAt!);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === today.getTime();
      });

      const completedToday = todayTasks.filter(task => task.completed).length;
      const totalToday = todayTasks.length;
      const goldEarnedToday = todayTasks
        .filter(task => task.completed)
        .reduce((sum, task) => sum + task.goldValue, 0);

      res.json({
        completedToday,
        totalToday,
        goldEarnedToday,
        completionRate: totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
