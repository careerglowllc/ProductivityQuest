import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth } from "./auth";
import { notion, findDatabaseByTitle, getTasks, createDatabaseIfNotExists, getNotionDatabases, updateTaskCompletion } from "./notion";
import { googleCalendar } from "./google-calendar";
import { insertTaskSchema, insertPurchaseSchema, insertUserSchema, loginUserSchema, updateNotionConfigSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }
      
      // Check if email already exists  
      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }
      
      // Create user
      const user = await storage.createUser(validatedData);
      
      // Create session
      if (req.session) {
        req.session.userId = user.id;
        
        // Save session
        await new Promise((resolve, reject) => {
          req.session!.save((err) => {
            if (err) reject(err);
            else resolve(undefined);
          });
        });
      }
      
      res.json({ 
        id: user.id,
        username: user.username,
        email: user.email 
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.errors) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
      }
      
      // Find user by username OR email
      let user = await storage.getUserByUsername(username);
      
      // If not found by username, try email
      if (!user) {
        user = await storage.getUserByEmail(username);
      }
      
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Verify password
      const isValid = await storage.verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Create session
      if (req.session) {
        req.session.userId = user.id;
        
        // Save session
        await new Promise<void>((resolve, reject) => {
          req.session!.save((err) => {
            if (err) {
              console.error("Session save error:", err);
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }
      
      res.json({ 
        id: user.id,
        username: user.username,
        email: user.email 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session?.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User settings routes
  app.get('/api/user/settings', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        notionApiKey: user.notionApiKey ? '***' : null, // Hide actual key
        notionDatabaseId: user.notionDatabaseId,
        hasGoogleAuth: !!(user.googleAccessToken && user.googleRefreshToken),
        googleConnected: !!(user.googleAccessToken && user.googleRefreshToken),
      });
    } catch (error) {
      console.error("Error fetching user settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put('/api/user/settings', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { notionApiKey, notionDatabaseId } = req.body;
      
      // Validate and parse Notion configuration if provided
      let parsedNotionDatabaseId = notionDatabaseId;
      if (notionApiKey || notionDatabaseId) {
        try {
          const validated = updateNotionConfigSchema.parse({ notionApiKey, notionDatabaseId });
          // The schema transformation extracts the clean 32-char ID from URL or validates direct ID
          parsedNotionDatabaseId = validated.notionDatabaseId;
        } catch (validationError: any) {
          return res.status(400).json({ 
            error: "Invalid Notion configuration",
            details: validationError.errors 
          });
        }
      }
      
      const user = await storage.updateUserSettings(userId, {
        notionApiKey,
        notionDatabaseId: parsedNotionDatabaseId,
      });
      
      res.json({
        message: "Settings updated successfully",
        notionApiKey: user.notionApiKey ? '***' : null,
        notionDatabaseId: user.notionDatabaseId,
        hasGoogleAuth: !!(user.googleAccessToken && user.googleRefreshToken),
        googleConnected: !!(user.googleAccessToken && user.googleRefreshToken),
      });
    } catch (error) {
      console.error("Error updating user settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Task routes
  app.get("/api/tasks", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const tasks = await storage.getTasks(userId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      
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

  app.patch("/api/tasks/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
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

  app.patch("/api/tasks/:id/complete", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const id = parseInt(req.params.id);
      const task = await storage.completeTask(id, userId);
      if (!task) {
        return res.status(404).json({ error: "Task not found or already completed" });
      }
      
      // Update the task in Notion if it has a notionId
      if (task.notionId) {
        try {
          const user = await storage.getUserById(userId);
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

  // Batch complete multiple tasks - much faster!
  app.post("/api/tasks/complete-batch", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { taskIds } = req.body;
      
      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ error: "Invalid task IDs" });
      }

      let totalGold = 0;
      let completedCount = 0;
      const completedTasks = [];

      // Complete all tasks in one transaction
      for (const taskId of taskIds) {
        const task = await storage.completeTask(taskId, userId);
        if (task) {
          totalGold += task.goldValue;
          completedCount++;
          completedTasks.push(task);
        }
      }

      // Notion updates happen async in background (don't wait)
      const user = await storage.getUserById(userId);
      if (user?.notionApiKey) {
        // Fire and forget - don't block the response
        Promise.all(
          completedTasks
            .filter(t => t.notionId)
            .map(t => updateTaskCompletion(t.notionId!, true, user.notionApiKey!)
              .catch(err => console.error('Notion update failed:', err))
            )
        ).catch(() => {});
      }

      res.json({
        completedCount,
        totalGold,
        tasks: completedTasks
      });
    } catch (error) {
      console.error("Batch completion error:", error);
      res.status(500).json({ error: "Failed to complete tasks" });
    }
  });

  app.delete("/api/tasks/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
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
  app.get("/api/recycling", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const tasks = await storage.getRecycledTasks(userId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recycled tasks" });
    }
  });

  app.patch("/api/recycling/:id/restore", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
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

  app.delete("/api/recycling/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
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
  app.get("/api/notion/databases", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUserById(userId);
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

  app.get("/api/notion/test", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUserById(userId);
      
      console.log("=== Notion Test Connection Debug ===");
      console.log("User ID:", userId);
      console.log("Has API Key:", !!user?.notionApiKey);
      console.log("Has Database ID:", !!user?.notionDatabaseId);
      console.log("Database ID stored:", user?.notionDatabaseId);
      
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
      
      console.log("Formatted Database ID:", formattedId);
      console.log("Attempting to retrieve database...");
      
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

  app.get("/api/notion/count", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUserById(userId);
      
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

  app.get("/api/notion/check-duplicates", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUserById(userId);
      
      if (!user?.notionApiKey || !user?.notionDatabaseId) {
        return res.status(400).json({ error: "Notion API key or database ID not configured" });
      }
      
      // Get tasks from Notion
      const notionTasks = await getTasks(user.notionDatabaseId, user.notionApiKey);
      
      // Get existing tasks from database
      const existingTasks = await storage.getTasks(userId);
      
      // Create a set of existing notionIds for quick lookup
      const existingNotionIds = new Set(
        existingTasks
          .filter((task: any) => task.notionId)
          .map((task: any) => task.notionId)
      );
      
      // Count duplicates
      const duplicates = notionTasks.filter(task => existingNotionIds.has(task.notionId));
      
      res.json({ 
        totalCount: notionTasks.length,
        duplicateCount: duplicates.length,
        newCount: notionTasks.length - duplicates.length
      });
    } catch (error) {
      console.error("Notion duplicate check error:", error);
      res.status(500).json({ error: "Failed to check for duplicates" });
    }
  });

  app.post("/api/notion/import", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { includeDuplicates = true } = req.body;
      const user = await storage.getUserById(userId);
      
      if (!user?.notionApiKey || !user?.notionDatabaseId) {
        return res.status(400).json({ error: "Notion API key or database ID not configured" });
      }
      
      const notionTasks = await getTasks(user.notionDatabaseId, user.notionApiKey);
      
      // Get existing tasks if we need to skip duplicates
      let existingNotionIds = new Set<string>();
      if (!includeDuplicates) {
        const existingTasks = await storage.getTasks(userId);
        existingNotionIds = new Set(
          existingTasks
            .filter((task: any) => task.notionId)
            .map((task: any) => task.notionId)
        );
      }
      
      let importedCount = 0;

      for (const notionTask of notionTasks) {
        try {
          // Skip if duplicate and user chose to skip duplicates
          if (!includeDuplicates && existingNotionIds.has(notionTask.notionId)) {
            continue;
          }
          
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
  app.post("/api/notion/append", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUserById(userId);
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
          const task = await storage.getTask(taskId, userId);
          if (task && task.userId === userId) {
            // Add to Notion
            const notionId = await addTaskToNotion(task, user.notionDatabaseId, user.notionApiKey);
            
            // Update task with Notion ID
            await storage.updateTask(taskId, { notionId }, userId);
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
  app.post("/api/notion/delete", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUserById(userId);
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
          const task = await storage.getTask(taskId, userId);
          if (task && task.userId === userId && task.notionId) {
            // Delete from Notion
            await deleteTaskFromNotion(task.notionId, user.notionApiKey);
            
            // Recycle the task locally
            await storage.updateTask(taskId, { 
              recycled: true, 
              recycledAt: new Date(),
              recycledReason: "Deleted from Notion"
            }, userId);
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

  // Google OAuth routes
  app.get("/api/google/auth", requireAuth, async (req: any, res) => {
    try {
      const authUrl = googleCalendar.generateAuthUrl();
      console.log('🔗 Generated OAuth URL:', authUrl);
      res.json({ authUrl });
    } catch (error) {
      console.error("Google OAuth auth URL generation error:", error);
      res.status(500).json({ error: "Failed to generate authorization URL" });
    }
  });

  app.get("/api/google/callback", async (req: any, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code) {
        return res.redirect('/settings?google_auth=error&message=no_code');
      }

      // Check if user is authenticated
      if (!req.requireAuth() || !req.user) {
        console.error("User not authenticated during Google callback");
        return res.redirect('/api/login?redirect=/settings');
      }

      // Get tokens from code
      const tokens = await googleCalendar.getTokenFromCode(code);
      
      // Store tokens in user's account
      const userId = req.session.userId;
      await storage.updateUserSettings(userId, {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      });

      console.log("✅ Google Calendar connected successfully for user:", userId);
      
      // Redirect to settings page with success message
      res.redirect('/settings?google_auth=success');
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      res.redirect('/settings?google_auth=error&message=token_exchange_failed');
    }
  });

  app.get("/api/google/test", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUserById(userId);
      
      if (!user?.googleAccessToken || !user?.googleRefreshToken) {
        return res.status(400).json({ 
          error: "Google Calendar not connected",
          needsAuth: true 
        });
      }
      
      const result = await googleCalendar.testConnection(user);
      
      res.json({ 
        success: true, 
        message: "Successfully connected to Google Calendar",
        calendarId: result.calendarId
      });
    } catch (error: any) {
      console.error("Google Calendar test error:", error);
      
      let instructions = "Could not connect to Google Calendar. Please re-authenticate.";
      
      if (error.message.includes('TOKEN_EXPIRED_REFRESH_NEEDED')) {
        instructions = "Access token expired. Please disconnect and reconnect your Google Calendar.";
      } else if (error.message.includes('invalid_grant')) {
        instructions = "Authentication expired. Please disconnect and reconnect your Google Calendar.";
      } else if (error.message.includes('unauthorized')) {
        instructions = "Access denied. Please ensure you granted calendar permissions during authentication.";
      }
      
      res.status(400).json({ 
        error: "Google Calendar connection failed",
        instructions: instructions
      });
    }
  });

  app.post("/api/google/disconnect", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      
      await storage.updateUserSettings(userId, {
        googleAccessToken: '',
        googleRefreshToken: '',
        googleTokenExpiry: undefined,
      });
      
      res.json({ success: true, message: "Google Calendar disconnected successfully" });
    } catch (error) {
      console.error("Google Calendar disconnect error:", error);
      res.status(500).json({ error: "Failed to disconnect Google Calendar" });
    }
  });

  // Calendar integration routes
  app.post("/api/calendar/sync", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUserById(userId);
      
      if (!user?.googleAccessToken || !user?.googleRefreshToken) {
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
      
      res.status(500).json({ 
        error: "Failed to sync to calendar",
        details: error.message
      });
    }
  });

  // Shop routes
  app.get("/api/shop/items", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const items = await storage.getShopItemsForUser(userId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch shop items" });
    }
  });

  app.post("/api/shop/items", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { name, description, cost, icon } = req.body;
      
      if (!name || !description || !cost || !icon) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const item = await storage.createShopItem({
        userId, // User-specific item
        name,
        description,
        cost: parseInt(cost),
        icon,
        category: "custom",
        isGlobal: false, // User-created items are not global
      });
      
      res.json(item);
    } catch (error) {
      console.error("Create shop item error:", error);
      res.status(500).json({ error: "Failed to create shop item" });
    }
  });

  app.delete("/api/shop/items/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const itemId = parseInt(req.params.id);
      await storage.deleteShopItem(itemId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete shop item error:", error);
      res.status(500).json({ error: "Failed to delete shop item" });
    }
  });

  // Seed default shop items (run once)
  app.post("/api/shop/seed-defaults", requireAuth, async (req: any, res) => {
    try {
      const defaultItems = [
        {
          userId: null,
          name: "Health Potion",
          description: "A refreshing potion to restore your vitality",
          cost: 50,
          icon: "🧪",
          category: "consumables",
          isGlobal: true,
        },
        {
          userId: null,
          name: "Enchanted Scroll",
          description: "Ancient knowledge waiting to be discovered",
          cost: 100,
          icon: "📜",
          category: "items",
          isGlobal: true,
        },
        {
          userId: null,
          name: "Dragon's Gem",
          description: "A rare and valuable treasure",
          cost: 250,
          icon: "💎",
          category: "treasures",
          isGlobal: true,
        },
        {
          userId: null,
          name: "Master's Trophy",
          description: "Symbol of great achievement",
          cost: 500,
          icon: "🏆",
          category: "rewards",
          isGlobal: true,
        },
        {
          userId: null,
          name: "Royal Crown",
          description: "Fit for a champion of productivity",
          cost: 1000,
          icon: "👑",
          category: "treasures",
          isGlobal: true,
        },
        {
          userId: null,
          name: "Magic Sword",
          description: "A legendary weapon for legendary tasks",
          cost: 750,
          icon: "⚔️",
          category: "equipment",
          isGlobal: true,
        },
        {
          userId: null,
          name: "Crystal Ball",
          description: "See your future success",
          cost: 300,
          icon: "🔮",
          category: "items",
          isGlobal: true,
        },
        {
          userId: null,
          name: "Golden Key",
          description: "Unlock new possibilities",
          cost: 150,
          icon: "🔑",
          category: "items",
          isGlobal: true,
        },
      ];

      let created = 0;
      for (const item of defaultItems) {
        try {
          await storage.createShopItem(item as any);
          created++;
        } catch (error) {
          // Item might already exist, continue
          console.log("Item may already exist:", item.name);
        }
      }

      res.json({ success: true, created, total: defaultItems.length });
    } catch (error) {
      console.error("Seed shop items error:", error);
      res.status(500).json({ error: "Failed to seed shop items" });
    }
  });

  app.post("/api/shop/purchase", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
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

  app.get("/api/purchases", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const purchases = await storage.getPurchases(userId);
      res.json(purchases);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchases" });
    }
  });

  app.patch("/api/purchases/:id/use", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
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

  // Get user's inventory with quantities
  app.get("/api/inventory", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const purchases = await storage.getPurchases(userId);
      
      // Group by item and count unused vs used
      const inventory = new Map();
      
      for (const purchase of purchases) {
        if (!purchase.shopItemId) continue;
        
        const key = purchase.shopItemId;
        if (!inventory.has(key)) {
          const item = await storage.getShopItem(purchase.shopItemId);
          inventory.set(key, {
            itemId: purchase.shopItemId,
            item: item,
            unused: 0,
            used: 0,
            purchaseIds: [],
          });
        }
        
        const entry = inventory.get(key);
        if (purchase.used) {
          entry.used++;
        } else {
          entry.unused++;
          entry.purchaseIds.push(purchase.id);
        }
      }
      
      res.json(Array.from(inventory.values()));
    } catch (error) {
      console.error("Inventory error:", error);
      res.status(500).json({ error: "Failed to fetch inventory" });
    }
  });

  // Progress routes
  app.get("/api/progress", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const progress = await storage.getUserProgress(userId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });

  // Skills routes
  app.get("/api/skills", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      // Ensure user has all default skills
      await storage.ensureDefaultSkills(userId);
      const skills = await storage.getUserSkills(userId);
      res.json(skills);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch skills" });
    }
  });

  app.patch("/api/skills/:skillName", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { skillName } = req.params;
      const updates = req.body;
      
      const updatedSkill = await storage.updateUserSkill(userId, skillName, updates);
      if (!updatedSkill) {
        return res.status(404).json({ error: "Skill not found" });
      }
      
      res.json(updatedSkill);
    } catch (error) {
      res.status(500).json({ error: "Failed to update skill" });
    }
  });

  app.post("/api/skills/:skillName/xp", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { skillName } = req.params;
      const { amount } = req.body;
      
      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: "Invalid XP amount" });
      }
      
      const updatedSkill = await storage.addSkillXp(userId, skillName, amount);
      if (!updatedSkill) {
        return res.status(404).json({ error: "Skill not found" });
      }
      
      res.json(updatedSkill);
    } catch (error) {
      res.status(500).json({ error: "Failed to add skill XP" });
    }
  });

  // Update skill by ID (for manual editing)
  app.patch("/api/skills/id/:skillId", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const skillId = parseInt(req.params.skillId);
      const updates = req.body;
      
      if (isNaN(skillId)) {
        return res.status(400).json({ error: "Invalid skill ID" });
      }
      
      const updatedSkill = await storage.updateUserSkillById(userId, skillId, updates);
      if (!updatedSkill) {
        return res.status(404).json({ error: "Skill not found" });
      }
      
      res.json(updatedSkill);
    } catch (error) {
      res.status(500).json({ error: "Failed to update skill" });
    }
  });

  // Restore default skills endpoint
  app.post("/api/skills/restore-defaults", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      console.log("Restoring default skills for user:", userId);
      await storage.restoreDefaultSkills(userId);
      const skills = await storage.getUserSkills(userId);
      console.log("Skills after restore:", skills.length);
      res.json({ message: "Default skills restored", skills });
    } catch (error) {
      console.error("Error restoring default skills:", error);
      res.status(500).json({ error: "Failed to restore default skills", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Stats routes
  app.get("/api/stats", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
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