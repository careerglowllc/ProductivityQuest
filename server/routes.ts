import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { notion, findDatabaseByTitle, getTasks as getNotionTasks, createDatabaseIfNotExists, getNotionDatabases, updateTaskCompletion } from "./notion";
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
      
      // Update the task in Notion if it has a notionId
      if (task.notionId) {
        try {
          await updateTaskCompletion(task.notionId, true);
        } catch (notionError) {
          console.error("Failed to update task in Notion:", notionError);
          // Don't fail the request if Notion update fails
        }
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

  // Recycling routes
  app.get("/api/recycled-tasks", async (req, res) => {
    try {
      const tasks = await storage.getRecycledTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recycled tasks" });
    }
  });

  app.post("/api/tasks/:id/restore", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.restoreTask(id);
      if (!task) {
        return res.status(404).json({ error: "Task not found or not recycled" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to restore task" });
    }
  });

  app.delete("/api/tasks/:id/permanent", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.permanentlyDeleteTask(id);
      if (!success) {
        return res.status(404).json({ error: "Task not found or not recycled" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to permanently delete task" });
    }
  });

  // Notion integration routes
  app.post("/api/notion/sync", async (req, res) => {
    try {
      // Use existing user database - find it by looking for databases with the expected schema
      const databases = await getNotionDatabases();
      
      let userTasksDb = null;
      for (const db of databases) {
        // Check if this database has the expected properties
        const properties = db.properties;
        if (properties && 
            properties.Task && 
            properties.Details && 
            properties.Due && 
            properties["Min to Complete"] && 
            properties.Importance && 
            properties["Kanban - Stage"] && 
            properties["Life Domain"]) {
          userTasksDb = db;
          break;
        }
      }

      if (!userTasksDb) {
        return res.status(400).json({ 
          error: "Could not find a Notion database with the expected structure. Please ensure your database has the following properties: Task (title), Details (text), Due (date), Min to Complete (number), Importance (select), Kanban - Stage (status), Life Domain (select)" 
        });
      }

      // Clear existing tasks to avoid duplicates
      const existingTasks = await storage.getTasks();
      for (const task of existingTasks) {
        if (task.notionId) {
          await storage.deleteTask(task.id);
        }
      }

      // Fetch tasks from Notion
      const notionTasks = await getNotionTasks(userTasksDb.id);
      
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
          importance: notionTask.importance,
          kanbanStage: notionTask.kanbanStage,
          recurType: notionTask.recurType,
          lifeDomain: notionTask.lifeDomain,
          apple: notionTask.apple,
          smartPrep: notionTask.smartPrep,
          delegationTask: notionTask.delegationTask,
          velin: notionTask.velin,
        });
      }

      res.json({ success: true, count: notionTasks.length, databaseTitle: (userTasksDb as any).title?.[0]?.plain_text || "Unknown" });
    } catch (error) {
      console.error("Notion sync error:", error);
      res.status(500).json({ error: "Failed to sync with Notion. Please check your integration settings and ensure your database is shared with the integration." });
    }
  });

  // Get task count from Notion
  app.get("/api/notion/count", async (req, res) => {
    try {
      const databases = await getNotionDatabases();
      
      let userTasksDb = null;
      for (const db of databases) {
        const properties = db.properties;
        if (properties && 
            properties.Task && 
            properties.Details && 
            properties.Due && 
            properties["Min to Complete"] && 
            properties.Importance && 
            properties["Kanban - Stage"] && 
            properties["Life Domain"]) {
          userTasksDb = db;
          break;
        }
      }

      if (!userTasksDb) {
        return res.status(400).json({ 
          error: "Could not find a Notion database with the expected structure." 
        });
      }

      const notionTasks = await getNotionTasks(userTasksDb.id);
      res.json({ count: notionTasks.length });
    } catch (error) {
      console.error("Notion count error:", error);
      res.status(500).json({ error: "Failed to get Notion task count." });
    }
  });

  // Import tasks from Notion
  app.post("/api/notion/import", async (req, res) => {
    try {
      const databases = await getNotionDatabases();
      
      let userTasksDb = null;
      for (const db of databases) {
        const properties = db.properties;
        if (properties && 
            properties.Task && 
            properties.Details && 
            properties.Due && 
            properties["Min to Complete"] && 
            properties.Importance && 
            properties["Kanban - Stage"] && 
            properties["Life Domain"]) {
          userTasksDb = db;
          break;
        }
      }

      if (!userTasksDb) {
        return res.status(400).json({ 
          error: "Could not find a Notion database with the expected structure." 
        });
      }

      // Clear ALL existing tasks
      const existingTasks = await storage.getTasks();
      for (const task of existingTasks) {
        await storage.deleteTask(task.id);
      }

      // Import tasks from Notion
      const notionTasks = await getNotionTasks(userTasksDb.id);
      
      for (const notionTask of notionTasks) {
        await storage.createTask({
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
        });
      }

      res.json({ success: true, count: notionTasks.length });
    } catch (error) {
      console.error("Notion import error:", error);
      res.status(500).json({ error: "Failed to import from Notion." });
    }
  });

  // Export tasks to Notion
  app.post("/api/notion/export", async (req, res) => {
    try {
      const databases = await getNotionDatabases();
      
      let userTasksDb = null;
      for (const db of databases) {
        const properties = db.properties;
        if (properties && 
            properties.Task && 
            properties.Details && 
            properties.Due && 
            properties["Min to Complete"] && 
            properties.Importance && 
            properties["Kanban - Stage"] && 
            properties["Life Domain"]) {
          userTasksDb = db;
          break;
        }
      }

      if (!userTasksDb) {
        return res.status(400).json({ 
          error: "Could not find a Notion database with the expected structure." 
        });
      }

      // Get local tasks
      const localTasks = await storage.getTasks();
      
      // Archive all existing tasks in Notion
      const existingNotionTasks = await getNotionTasks(userTasksDb.id);
      for (const notionTask of existingNotionTasks) {
        await notion.pages.update({
          page_id: notionTask.notionId,
          archived: true,
        });
      }

      // Create new tasks in Notion from local tasks
      let exportedCount = 0;
      for (const localTask of localTasks) {
        const properties: any = {
          Task: {
            title: [{ text: { content: localTask.title } }]
          },
          Details: {
            rich_text: [{ text: { content: localTask.description || "" } }]
          },
          "Min to Complete": {
            number: localTask.duration
          },
          "Kanban - Stage": {
            status: { name: localTask.completed ? "Done" : "To Do" }
          },
          Apple: { checkbox: localTask.apple || false },
          SmartPrep: { checkbox: localTask.smartPrep || false },
          "Delegation Task": { checkbox: localTask.delegationTask || false },
          Velin: { checkbox: localTask.velin || false }
        };

        if (localTask.dueDate) {
          properties.Due = {
            date: { start: localTask.dueDate.toISOString().split('T')[0] }
          };
        }

        if (localTask.importance) {
          properties.Importance = { select: { name: localTask.importance } };
        }

        if (localTask.lifeDomain) {
          properties["Life Domain"] = { select: { name: localTask.lifeDomain } };
        }

        if (localTask.recurType) {
          properties["Recur Type"] = { select: { name: localTask.recurType } };
        }

        await notion.pages.create({
          parent: { database_id: userTasksDb.id },
          properties
        });
        exportedCount++;
      }

      res.json({ success: true, count: exportedCount });
    } catch (error) {
      console.error("Notion export error:", error);
      res.status(500).json({ error: "Failed to export to Notion." });
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
