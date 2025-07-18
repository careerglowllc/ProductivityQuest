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
        hasGoogleAuth: !!(user.googleAccessToken && user.googleTokenExpiry && user.googleTokenExpiry > new Date()),
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
  app.get("/api/notion/databases", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const { pageId } = req.query;
      
      if (!user?.notionApiKey) {
        return res.status(400).json({ 
          error: "Notion API key not configured",
          instructions: "Please configure your Notion API key in Settings"
        });
      }
      
      if (!pageId) {
        return res.status(400).json({ 
          error: "Page ID required",
          instructions: "Provide the page ID as a query parameter"
        });
      }
      
      // Get databases within the page
      const { Client } = await import("@notionhq/client");
      const userNotion = new Client({ auth: user.notionApiKey });
      
      // Format the page ID properly
      const cleanId = pageId.replace(/-/g, '');
      const formattedPageId = `${cleanId.slice(0, 8)}-${cleanId.slice(8, 12)}-${cleanId.slice(12, 16)}-${cleanId.slice(16, 20)}-${cleanId.slice(20)}`;
      
      const response = await userNotion.blocks.children.list({
        block_id: formattedPageId,
      });
      
      const databases = [];
      for (const block of response.results) {
        if (block.type === "child_database") {
          try {
            const dbInfo = await userNotion.databases.retrieve({
              database_id: block.id,
            });
            databases.push({
              id: block.id,
              title: dbInfo.title?.[0]?.plain_text || "Untitled Database",
            });
          } catch (error) {
            console.error(`Error retrieving database ${block.id}:`, error);
          }
        }
      }
      
      res.json({ databases });
    } catch (error: any) {
      console.error("Error listing databases:", error);
      res.status(400).json({ 
        error: error.message || "Failed to list databases",
        code: error.code
      });
    }
  });

  app.get("/api/notion/test", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.notionApiKey || !user?.notionDatabaseId) {
        return res.status(400).json({ 
          error: "Notion not configured", 
          hasApiKey: !!user?.notionApiKey, 
          hasDatabaseId: !!user?.notionDatabaseId,
          instructions: "Please configure your Notion API key and database ID in Settings"
        });
      }
      
      // Test the database connection
      const { Client } = await import("@notionhq/client");
      const userNotion = new Client({ auth: user.notionApiKey });
      
      // Format the database ID properly
      const cleanId = user.notionDatabaseId.replace(/-/g, '');
      const formattedId = `${cleanId.slice(0, 8)}-${cleanId.slice(8, 12)}-${cleanId.slice(12, 16)}-${cleanId.slice(16, 20)}-${cleanId.slice(20)}`;
      
      const dbInfo = await userNotion.databases.retrieve({
        database_id: formattedId,
      });
      
      res.json({ 
        success: true, 
        databaseTitle: dbInfo.title?.[0]?.plain_text || "Unknown",
        databaseId: formattedId,
        hasAccess: true
      });
    } catch (error: any) {
      console.error("Notion test error:", error);
      
      let errorMessage = "Failed to connect to Notion";
      let instructions = "";
      
      if (error.code === 'object_not_found') {
        errorMessage = "Database not found or not shared with integration";
        instructions = "Make sure: 1) Database ID is correct, 2) Database is shared with your integration, 3) You have the right permissions";
      } else if (error.code === 'unauthorized') {
        errorMessage = "Invalid API key or insufficient permissions";
        instructions = "Check your Notion API key and make sure the integration has access to the database";
      } else if (error.code === 'validation_error' && error.message.includes('is a page, not a database')) {
        errorMessage = "Wrong ID type - you provided a page ID instead of a database ID";
        instructions = "You need to use the database ID, not the page ID. Open your database in Notion, and get the ID from the URL of the database view itself, not the page containing it.";
      }
      
      res.status(400).json({ 
        error: errorMessage,
        code: error.code,
        instructions: instructions,
        hasAccess: false
      });
    }
  });

  app.get("/api/notion/count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.notionApiKey || !user?.notionDatabaseId) {
        return res.status(400).json({ error: "Notion API key or database ID not configured" });
      }
      
      // Get actual count from user's database
      const notionTasks = await getTasks(user.notionDatabaseId, user.notionApiKey);
      const count = notionTasks.length;
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

  // Bulk append tasks to Notion
  app.post("/api/notion/append", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const { taskIds } = req.body;
      
      if (!user?.notionApiKey || !user?.notionDatabaseId) {
        return res.status(400).json({ error: "Notion API key or database ID not configured" });
      }

      if (!taskIds || !Array.isArray(taskIds)) {
        return res.status(400).json({ error: "Task IDs array is required" });
      }

      const { addTaskToNotion } = await import("./notion");
      let appendedCount = 0;

      for (const taskId of taskIds) {
        try {
          const task = await storage.getTask(taskId);
          if (task && task.userId === userId) {
            // Add to Notion
            const notionId = await addTaskToNotion(task, user.notionDatabaseId, user.notionApiKey);
            
            // Update task with Notion ID
            await storage.updateTask(taskId, { notionId });
            appendedCount++;
          }
        } catch (error) {
          console.error(`Error appending task ${taskId} to Notion:`, error);
          // Continue with other tasks
        }
      }

      res.json({ message: `Successfully appended ${appendedCount} tasks to Notion`, count: appendedCount });
    } catch (error) {
      console.error("Notion append error:", error);
      res.status(500).json({ error: "Failed to append tasks to Notion" });
    }
  });

  // Bulk delete tasks from Notion
  app.post("/api/notion/delete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const { taskIds } = req.body;
      
      if (!user?.notionApiKey || !user?.notionDatabaseId) {
        return res.status(400).json({ error: "Notion API key or database ID not configured" });
      }

      if (!taskIds || !Array.isArray(taskIds)) {
        return res.status(400).json({ error: "Task IDs array is required" });
      }

      const { deleteTaskFromNotion } = await import("./notion");
      let deletedCount = 0;

      for (const taskId of taskIds) {
        try {
          const task = await storage.getTask(taskId);
          if (task && task.userId === userId && task.notionId) {
            // Delete from Notion
            await deleteTaskFromNotion(task.notionId, user.notionApiKey);
            
            // Recycle the task locally
            await storage.updateTask(taskId, { 
              recycled: true, 
              recycledAt: new Date(),
              recycledReason: "Deleted from Notion"
            });
            deletedCount++;
          }
        } catch (error) {
          console.error(`Error deleting task ${taskId} from Notion:`, error);
          // Continue with other tasks
        }
      }

      res.json({ message: `Successfully deleted ${deletedCount} tasks from Notion`, count: deletedCount });
    } catch (error) {
      console.error("Notion delete error:", error);
      res.status(500).json({ error: "Failed to delete tasks from Notion" });
    }
  });

  // Google Calendar OAuth routes
  app.get("/api/auth/google", isAuthenticated, async (req: any, res) => {
    try {
      const authUrl = googleCalendar.getAuthUrl();
      res.json({ authUrl });
    } catch (error) {
      console.error("Google auth URL error:", error);
      res.status(500).json({ error: "Failed to get Google auth URL" });
    }
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code) {
        return res.status(400).json({ error: "Missing authorization code" });
      }

      // Get tokens from Google
      const tokens = await googleCalendar.getTokensFromCode(code as string);
      
      // For now, we'll redirect to a success page with tokens in query params
      // In a production app, you'd want to use the state parameter to identify the user
      const successUrl = `${process.env.NODE_ENV === 'production' ? process.env.REPLIT_DEV_DOMAIN : 'http://localhost:5000'}/settings?google_success=true&access_token=${encodeURIComponent(tokens.accessToken)}&refresh_token=${encodeURIComponent(tokens.refreshToken)}&expiry=${tokens.expiry.getTime()}`;
      
      res.redirect(successUrl);
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      const errorUrl = `${process.env.NODE_ENV === 'production' ? process.env.REPLIT_DEV_DOMAIN : 'http://localhost:5000'}/settings?google_error=true`;
      res.redirect(errorUrl);
    }
  });

  app.post("/api/auth/google/save-tokens", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { accessToken, refreshToken, expiry } = req.body;
      
      if (!accessToken || !refreshToken || !expiry) {
        return res.status(400).json({ error: "Missing required token data" });
      }

      const user = await storage.updateGoogleTokens(userId, {
        googleAccessToken: accessToken,
        googleRefreshToken: refreshToken,
        googleTokenExpiry: new Date(parseInt(expiry))
      });

      res.json({ success: true, hasGoogleAuth: true });
    } catch (error) {
      console.error("Save Google tokens error:", error);
      res.status(500).json({ error: "Failed to save Google tokens" });
    }
  });

  app.delete("/api/auth/google", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const user = await storage.updateGoogleTokens(userId, {
        googleAccessToken: '',
        googleRefreshToken: undefined,
        googleTokenExpiry: new Date(0)
      });

      res.json({ success: true, hasGoogleAuth: false });
    } catch (error) {
      console.error("Disconnect Google error:", error);
      res.status(500).json({ error: "Failed to disconnect Google account" });
    }
  });

  // Calendar integration routes
  app.post("/api/calendar/sync", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.googleAccessToken) {
        return res.status(400).json({ 
          error: "Google Calendar not connected",
          needsAuth: true 
        });
      }

      const tasks = await storage.getTasks(userId);
      const { selectedTasks } = req.body;
      
      const tasksToSync = tasks.filter(task => 
        selectedTasks.includes(task.id) && 
        task.dueDate && 
        !task.completed
      );

      const results = await googleCalendar.syncTasks(tasksToSync, user);
      
      res.json({ 
        success: true, 
        count: results.success,
        failed: results.failed,
        total: tasksToSync.length
      });
    } catch (error: any) {
      console.error("Calendar sync error:", error);
      
      // Handle token refresh needed
      if (error.message.startsWith('TOKEN_REFRESH_NEEDED:')) {
        const tokenData = JSON.parse(error.message.replace('TOKEN_REFRESH_NEEDED:', ''));
        
        try {
          const userId = req.user.claims.sub;
          await storage.updateGoogleTokens(userId, {
            googleAccessToken: tokenData.accessToken,
            googleRefreshToken: undefined, // Keep existing refresh token
            googleTokenExpiry: tokenData.expiry
          });
          
          return res.status(401).json({ 
            error: "Token refreshed, please try again",
            tokenRefreshed: true
          });
        } catch (refreshError) {
          console.error("Token refresh error:", refreshError);
          return res.status(401).json({ 
            error: "Google Calendar access expired",
            needsAuth: true 
          });
        }
      }
      
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