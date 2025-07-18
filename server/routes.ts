import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { notion, findDatabaseByTitle, getTasks, createDatabaseIfNotExists, getNotionDatabases, updateTaskCompletion } from "./notion";
import { googleCalendar } from "./google-calendar";
import { insertTaskSchema, insertPurchaseSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User settings routes
  app.get('/api/user/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        notionApiKey: user.notionApiKey ? '***' : null, // Hide actual key
        notionDatabaseId: user.notionDatabaseId,
      });
    } catch (error) {
      console.error("Error fetching user settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put('/api/user/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { notionApiKey, notionDatabaseId } = req.body;
      
      const user = await storage.updateUserSettings(userId, {
        notionApiKey,
        notionDatabaseId,
      });
      
      res.json({
        notionApiKey: user.notionApiKey ? '***' : null,
        notionDatabaseId: user.notionDatabaseId,
      });
    } catch (error) {
      console.error("Error updating user settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Task routes
  app.get("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getTasks(userId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Handle date conversion before validation
      const bodyData = { ...req.body, userId };
      if (bodyData.dueDate && typeof bodyData.dueDate === 'string') {
        bodyData.dueDate = new Date(bodyData.dueDate);
      }
      
      const taskData = insertTaskSchema.parse(bodyData);
      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error: any) {
      console.error("Task creation error:", error);
      if (error.errors) {
        console.error("Validation errors:", error.errors);
      }
      res.status(400).json({ error: "Invalid task data", details: error.errors });
    }
  });

  app.patch("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      
      // Handle date conversion before validation
      const bodyData = { ...req.body };
      if (bodyData.dueDate && typeof bodyData.dueDate === 'string') {
        bodyData.dueDate = new Date(bodyData.dueDate);
      }
      
      const updateData = insertTaskSchema.partial().parse(bodyData);
      const task = await storage.updateTask(id, updateData, userId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error: any) {
      console.error("Task update error:", error);
      res.status(400).json({ error: "Invalid task update data" });
    }
  });

  app.patch("/api/tasks/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const task = await storage.completeTask(id, userId);
      if (!task) {
        return res.status(404).json({ error: "Task not found or already completed" });
      }
      
      // Update the task in Notion if it has a notionId
      if (task.notionId) {
        try {
          const user = await storage.getUser(userId);
          if (user?.notionApiKey) {
            await updateTaskCompletion(task.notionId, true, user.notionApiKey);
          }
        } catch (notionError) {
          console.error("Failed to update task in Notion:", notionError);
        }
      }
      
      res.json(task);
    } catch (error) {
      console.error("Task completion error:", error);
      res.status(500).json({ error: "Failed to complete task" });
    }
  });

  app.delete("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const success = await storage.deleteTask(id, userId);
      if (!success) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Task deletion error:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Recycling routes
  app.get("/api/recycling", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getRecycledTasks(userId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recycled tasks" });
    }
  });

  app.patch("/api/recycling/:id/restore", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const task = await storage.restoreTask(id, userId);
      if (!task) {
        return res.status(404).json({ error: "Task not found in recycling" });
      }
      res.json(task);
    } catch (error) {
      console.error("Task restoration error:", error);
      res.status(500).json({ error: "Failed to restore task" });
    }
  });

  app.delete("/api/recycling/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const success = await storage.permanentlyDeleteTask(id, userId);
      if (!success) {
        return res.status(404).json({ error: "Task not found in recycling" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Permanent task deletion error:", error);
      res.status(500).json({ error: "Failed to permanently delete task" });
    }
  });

  // Notion integration routes
  app.get("/api/notion/count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.notionApiKey || !user?.notionDatabaseId) {
        return res.status(400).json({ error: "Notion API key or database ID not configured" });
      }
      
      // Use user-specific Notion credentials
      const databases = await getNotionDatabases();
      const count = databases.length > 0 ? 100 : 0; // Placeholder count
      res.json({ count });
    } catch (error) {
      console.error("Notion count error:", error);
      res.status(500).json({ error: "Failed to get Notion count" });
    }
  });

  app.post("/api/notion/import", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.notionApiKey || !user?.notionDatabaseId) {
        return res.status(400).json({ error: "Notion API key or database ID not configured" });
      }
      
      const notionTasks = await getTasks(user.notionDatabaseId, user.notionApiKey);
      let importedCount = 0;

      for (const notionTask of notionTasks) {
        try {
          const taskData = {
            userId,
            notionId: notionTask.notionId,
            title: notionTask.title,
            description: notionTask.description,
            duration: notionTask.duration,
            goldValue: notionTask.goldValue,
            dueDate: notionTask.dueDate,
            completed: notionTask.isCompleted,
            importance: notionTask.importance,
            kanbanStage: notionTask.kanbanStage,
            recurType: notionTask.recurType,
            lifeDomain: notionTask.lifeDomain,
            apple: notionTask.apple,
            smartPrep: notionTask.smartPrep,
            delegationTask: notionTask.delegationTask,
            velin: notionTask.velin,
          };

          await storage.createTask(taskData);
          importedCount++;
        } catch (error) {
          console.error("Error importing task:", error);
        }
      }

      res.json({ success: true, count: importedCount });
    } catch (error: any) {
      console.error("Notion import error:", error);
      
      // Return more specific error messages
      if (error.message.includes('Database not found')) {
        res.status(400).json({ error: error.message });
      } else if (error.message.includes('Unauthorized')) {
        res.status(401).json({ error: error.message });
      } else if (error.message.includes('Invalid database ID')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message || "Failed to import from Notion" });
      }
    }
  });

  // Calendar integration routes
  app.post("/api/calendar/sync", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getTasks(userId);
      
      const { selectedTasks } = req.body;
      let syncedCount = 0;

      for (const taskId of selectedTasks) {
        const task = tasks.find(t => t.id === taskId);
        if (task && task.dueDate) {
          try {
            await googleCalendar.createEvent(task);
            syncedCount++;
          } catch (error) {
            console.error("Error syncing task to calendar:", error);
          }
        }
      }

      res.json({ success: true, count: syncedCount });
    } catch (error) {
      console.error("Calendar sync error:", error);
      res.status(500).json({ error: "Failed to sync to calendar" });
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

  app.post("/api/shop/purchase", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { itemId } = req.body;
      
      const item = await storage.getShopItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      // Check if user has enough gold
      const progress = await storage.getUserProgress(userId);
      if ((progress.goldTotal || 0) < item.cost) {
        return res.status(400).json({ error: "Insufficient gold" });
      }

      // Create purchase and deduct gold
      const purchase = await storage.createPurchase({
        userId,
        shopItemId: itemId,
        cost: item.cost,
        used: false,
      });

      await storage.spendGold(userId, item.cost);
      
      res.json(purchase);
    } catch (error) {
      console.error("Purchase error:", error);
      res.status(500).json({ error: "Failed to make purchase" });
    }
  });

  app.get("/api/purchases", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const purchases = await storage.getPurchases(userId);
      res.json(purchases);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchases" });
    }
  });

  app.patch("/api/purchases/:id/use", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const purchase = await storage.usePurchase(id, userId);
      if (!purchase) {
        return res.status(404).json({ error: "Purchase not found or already used" });
      }
      res.json(purchase);
    } catch (error) {
      console.error("Purchase use error:", error);
      res.status(500).json({ error: "Failed to use purchase" });
    }
  });

  // Progress routes
  app.get("/api/progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progress = await storage.getUserProgress(userId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });

  // Stats routes
  app.get("/api/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getTasks(userId);
      const recycledTasks = await storage.getRecycledTasks(userId);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const completedToday = recycledTasks.filter(task => 
        task.recycledReason === "completed" && 
        task.recycledAt && 
        new Date(task.recycledAt) >= today
      ).length;
      
      const totalToday = tasks.length + recycledTasks.length;
      
      const goldEarnedToday = recycledTasks
        .filter(task => 
          task.recycledReason === "completed" && 
          task.recycledAt && 
          new Date(task.recycledAt) >= today
        )
        .reduce((sum, task) => sum + task.goldValue, 0);

      res.json({
        completedToday,
        totalToday,
        goldEarnedToday,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}