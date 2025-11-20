import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth } from "./auth";
import { notion, findDatabaseByTitle, getTasks, createDatabaseIfNotExists, getNotionDatabases, updateTaskCompletion } from "./notion";
import { googleCalendar } from "./google-calendar";
import { insertTaskSchema, insertPurchaseSchema, insertUserSchema, loginUserSchema, updateNotionConfigSchema, skillCategorizationTraining } from "@shared/schema";
import { z } from "zod";
import { categorizeTaskWithAI, categorizeMultipleTasks } from "./openai-service";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { OAuth2Client } from 'google-auth-library';

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      console.log('📝 Registration attempt for:', req.body.username);
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      console.log('👤 Checking if username exists...');
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        console.log('❌ Username already taken');
        return res.status(400).json({ message: "Username already taken" });
      }
      
      // Check if email already exists  
      console.log('📧 Checking if email exists...');
      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        console.log('❌ Email already registered');
        return res.status(400).json({ message: "Email already registered" });
      }
      
      // Create user
      console.log('✨ Creating new user...');
      const user = await storage.createUser(validatedData);
      console.log('✅ User created successfully:', user.id);
      
      // Create session
      if (req.session) {
        req.session.userId = user.id;
        
        // Save session
        await new Promise((resolve, reject) => {
          req.session!.save((err) => {
            if (err) {
              console.error('❌ Session save error:', err);
              reject(err);
            } else {
              console.log('✅ Session created for new user');
              resolve(undefined);
            }
          });
        });
      }
      
      console.log('✅ Registration complete for:', user.username);
      res.json({ 
        id: user.id,
        username: user.username,
        email: user.email 
      });
    } catch (error: any) {
      console.error("❌ Registration error:", error);
      console.error("Error stack:", error?.stack);
      console.error("Error message:", error?.message);
      if (error.errors) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Registration failed", error: error?.message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      console.log('🔐 Login attempt for:', username);
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
      }
      
      // Find user by username OR email
      console.log('👤 Looking up user by username...');
      let user = await storage.getUserByUsername(username);
      
      // If not found by username, try email
      if (!user) {
        console.log('👤 User not found by username, trying email...');
        user = await storage.getUserByEmail(username);
      }
      
      if (!user) {
        console.log('❌ User not found');
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      if (!user.passwordHash) {
        console.log('❌ User found but no password hash');
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      console.log('✅ User found, verifying password...');
      // Verify password
      const isValid = await storage.verifyPassword(password, user.passwordHash);
      if (!isValid) {
        console.log('❌ Password verification failed');
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      console.log('✅ Password verified, creating session...');
      // Create session
      if (req.session) {
        req.session.userId = user.id;
        
        // Save session
        await new Promise<void>((resolve, reject) => {
          req.session!.save((err) => {
            if (err) {
              console.error("❌ Session save error:", err);
              reject(err);
            } else {
              console.log('✅ Session saved successfully');
              resolve();
            }
          });
        });
      }
      
      console.log('✅ Login successful for user:', user.username);
      res.json({ 
        id: user.id,
        username: user.username,
        email: user.email 
      });
    } catch (error: any) {
      console.error("❌ Login error:", error);
      console.error("Error stack:", error?.stack);
      console.error("Error message:", error?.message);
      res.status(500).json({ message: "Login failed", error: error?.message });
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

  // Legacy logout endpoint for compatibility
  app.get('/api/logout', (req, res) => {
    req.session?.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      // Redirect to landing page after logout
      res.redirect('/');
    });
  });

  // Get current user
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      console.log('👤 Fetching user data for ID:', userId);
      
      const user = await storage.getUserById(userId);
      if (!user) {
        console.log('❌ User not found for ID:', userId);
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log('✅ User data fetched for:', user.username);
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (error: any) {
      console.error("❌ Error fetching user:", error);
      console.error("Error stack:", error?.stack);
      console.error("Error message:", error?.message);
      res.status(500).json({ message: "Failed to fetch user", error: error?.message });
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
        googleCalendarClientId: user.googleCalendarClientId ? '***' : null,
        googleCalendarClientSecret: user.googleCalendarClientSecret ? '***' : null,
        googleCalendarAccessToken: user.googleCalendarAccessToken ? '***' : null,
        googleCalendarRefreshToken: user.googleCalendarRefreshToken ? '***' : null,
        googleCalendarTokenExpiry: user.googleCalendarTokenExpiry,
        googleCalendarSyncEnabled: user.googleCalendarSyncEnabled || false,
        googleCalendarSyncDirection: user.googleCalendarSyncDirection || 'both',
        googleCalendarLastSync: user.googleCalendarLastSync,
        timezone: user.timezone || 'America/New_York',
      });
    } catch (error) {
      console.error("Error fetching user settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put('/api/user/settings', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { 
        notionApiKey, 
        notionDatabaseId,
        googleCalendarClientId,
        googleCalendarClientSecret,
        googleCalendarSyncEnabled,
        googleCalendarSyncDirection
      } = req.body;
      
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
      
      // Build update object with only provided fields
      const updates: any = {};
      if (notionApiKey !== undefined) updates.notionApiKey = notionApiKey;
      if (parsedNotionDatabaseId !== undefined) updates.notionDatabaseId = parsedNotionDatabaseId;
      if (googleCalendarClientId !== undefined) updates.googleCalendarClientId = googleCalendarClientId;
      if (googleCalendarClientSecret !== undefined) updates.googleCalendarClientSecret = googleCalendarClientSecret;
      if (googleCalendarSyncEnabled !== undefined) updates.googleCalendarSyncEnabled = googleCalendarSyncEnabled;
      if (googleCalendarSyncDirection !== undefined) updates.googleCalendarSyncDirection = googleCalendarSyncDirection;
      
      const user = await storage.updateUserSettings(userId, updates);
      
      res.json({
        message: "Settings updated successfully",
        notionApiKey: user.notionApiKey ? '***' : null,
        notionDatabaseId: user.notionDatabaseId,
        hasGoogleAuth: !!(user.googleAccessToken && user.googleRefreshToken),
        googleConnected: !!(user.googleAccessToken && user.googleRefreshToken),
        googleCalendarSyncEnabled: user.googleCalendarSyncEnabled,
        googleCalendarClientId: user.googleCalendarClientId ? '***' : null,
        googleCalendarClientSecret: user.googleCalendarClientSecret ? '***' : null,
      });
    } catch (error) {
      console.error("Error updating user settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Timezone settings endpoint
  app.get('/api/settings', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        timezone: user.timezone || 'America/New_York',
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post('/api/settings/timezone', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { timezone } = req.body;
      
      if (!timezone || typeof timezone !== 'string') {
        return res.status(400).json({ error: "Invalid timezone" });
      }
      
      const user = await storage.updateUserSettings(userId, { timezone });
      
      res.json({
        message: "Timezone updated successfully",
        timezone: user.timezone,
      });
    } catch (error) {
      console.error("Error updating timezone:", error);
      res.status(500).json({ error: "Failed to update timezone" });
    }
  });

  // Task routes
  app.get("/api/tasks", requireAuth, async (req: any, res) => {
    try {
      console.log('📋 [GET /api/tasks] Fetching tasks for user:', req.session.userId);
      const userId = req.session.userId;
      const tasks = await storage.getTasks(userId);
      console.log('📋 [GET /api/tasks] Successfully fetched', tasks.length, 'tasks');
      res.json(tasks);
    } catch (error: any) {
      console.error('❌ [GET /api/tasks] Error:', error.message);
      console.error('❌ [GET /api/tasks] Stack:', error.stack);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Export tasks as CSV
  app.get("/api/tasks/export/csv", requireAuth, async (req: any, res) => {
    try {
      console.log('📊 [CSV EXPORT] Starting export for user:', req.session.userId);
      const userId = req.session.userId;
      const tasks = await storage.getTasks(userId);
      
      // CSV header
      const headers = [
        'ID',
        'Title',
        'Description',
        'Details',
        'Duration (min)',
        'Gold Value',
        'Importance',
        'Kanban Stage',
        'Recurrence',
        'Campaign',
        'Business/Work Filter',
        'Due Date',
        'Completed',
        'Completed At',
        'Created At',
        'Skill Tags',
        'Apple',
        'Smart Prep',
        'Delegation',
        'Velin'
      ];
      
      // Escape CSV field (handle quotes and commas)
      const escapeCSV = (field: any): string => {
        if (field === null || field === undefined) return '';
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      
      // Format date
      const formatDate = (date: Date | null | undefined): string => {
        if (!date) return '';
        return new Date(date).toISOString();
      };
      
      // Build CSV rows
      const rows = tasks.map(task => [
        task.id,
        escapeCSV(task.title),
        escapeCSV(task.description),
        escapeCSV(task.details),
        task.duration,
        task.goldValue,
        escapeCSV(task.importance),
        escapeCSV(task.kanbanStage),
        escapeCSV(task.recurType),
        escapeCSV(task.campaign),
        escapeCSV(task.businessWorkFilter),
        formatDate(task.dueDate),
        task.completed ? 'Yes' : 'No',
        formatDate(task.completedAt),
        formatDate(task.createdAt),
        escapeCSV(task.skillTags?.join('; ')),
        task.apple ? 'Yes' : 'No',
        task.smartPrep ? 'Yes' : 'No',
        task.delegationTask ? 'Yes' : 'No',
        task.velin ? 'Yes' : 'No'
      ].join(','));
      
      // Combine header and rows
      const csv = [headers.join(','), ...rows].join('\n');
      
      // Set headers for file download
      const timestamp = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="productivity-quest-tasks-${timestamp}.csv"`);
      
      console.log(`📊 [CSV EXPORT] Successfully exported ${tasks.length} tasks`);
      res.send(csv);
    } catch (error: any) {
      console.error('❌ [CSV EXPORT] Error:', error.message);
      console.error('❌ [CSV EXPORT] Stack:', error.stack);
      res.status(500).json({ error: "Failed to export tasks to CSV" });
    }
  });

  app.post("/api/tasks", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { calculateGoldValue } = await import("./goldCalculation");
      
      // Handle date conversion before validation
      const bodyData = { ...req.body, userId };
      if (bodyData.dueDate && typeof bodyData.dueDate === 'string') {
        bodyData.dueDate = new Date(bodyData.dueDate);
      }
      
      // Auto-calculate gold value based on duration and importance
      if (bodyData.duration) {
        bodyData.goldValue = calculateGoldValue(bodyData.importance, bodyData.duration);
      }
      
      const taskData = insertTaskSchema.parse(bodyData);
      const task = await storage.createTask(taskData);
      
      // Auto-categorize with AI in background
      // Don't await - return task immediately and categorize async
      (async () => {
        try {
          console.log(`🤖 [AUTO-CAT] Starting for task ${task.id}: "${task.title}"`);
          
          // Fetch user's skills (including custom ones)
          const userSkills = await storage.getUserSkills(userId);
          console.log(`🤖 [AUTO-CAT] Found ${userSkills.length} user skills:`, userSkills.map(s => s.skillName).join(', '));
          
          // Fetch training examples for this user (approved categorizations)
          const trainingData = await db.select().from(skillCategorizationTraining)
            .where(and(
              eq(skillCategorizationTraining.userId, userId),
              eq(skillCategorizationTraining.isApproved, true)
            ))
            .limit(50);
          
          console.log(`🤖 [AUTO-CAT] Found ${trainingData.length} training examples`);
          
          const trainingExamples = trainingData.map(t => ({
            taskTitle: t.taskTitle,
            taskDetails: t.taskDetails || undefined,
            correctSkills: t.correctSkills
          }));
          
          // Categorize the newly created task
          console.log(`🤖 [AUTO-CAT] Calling OpenAI for task ${task.id}...`);
          const categorization = await categorizeTaskWithAI(
            task.title,
            task.details || undefined,
            trainingExamples,
            userSkills
          );
          
          console.log(`🤖 [AUTO-CAT] Result:`, JSON.stringify(categorization));
          
          // Update task with skill tags
          if (categorization && categorization.skills.length > 0) {
            await storage.updateTask(
              task.id,
              { skillTags: categorization.skills as any },
              userId
            );
            console.log(`✅ [AUTO-CAT] Updated task ${task.id} with skills: ${categorization.skills.join(', ')}`);
          } else {
            console.log(`⚠️ [AUTO-CAT] No skills returned for task ${task.id}`);
          }
        } catch (error: any) {
          console.error(`❌ [AUTO-CAT] Failed for task ${task.id}:`, error.message);
          console.error(`❌ [AUTO-CAT] Stack:`, error.stack);
          // Don't throw - categorization is optional, task is already created
        }
      })();
      
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
      if (bodyData.scheduledTime && typeof bodyData.scheduledTime === 'string') {
        bodyData.scheduledTime = new Date(bodyData.scheduledTime);
      }
      
      const updateData = insertTaskSchema.partial().parse(bodyData);
      const task = await storage.updateTask(id, updateData, userId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      // If task has Google Calendar event and time/duration changed, update it
      if (task.googleEventId && task.googleCalendarId && 
          (updateData.dueDate !== undefined || updateData.duration !== undefined)) {
        try {
          const user = await storage.getUser(userId);
          if (user && user.googleCalendarAccessToken) {
            await googleCalendar.updateEvent(task, user);
          }
        } catch (error) {
          console.error('Failed to update Google Calendar event:', error);
          // Don't fail the request if Google Calendar sync fails
        }
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
      
      // Get task before completion to calculate XP
      const taskBefore = await storage.getTask(id, userId);
      if (!taskBefore || taskBefore.completed) {
        return res.status(404).json({ error: "Task not found or already completed" });
      }
      
      // Calculate XP gains before completion
      const skillXPGains: Array<{ skillName: string; xpGained: number; newXP: number; newLevel: number }> = [];
      if (taskBefore.skillTags && taskBefore.skillTags.length > 0) {
        const { calculateXPPerSkill } = await import("./xpCalculation");
        const xpPerSkill = calculateXPPerSkill(taskBefore.importance, taskBefore.duration, taskBefore.skillTags.length);
        
        for (const skillName of taskBefore.skillTags) {
          const skillBefore = await storage.getUserSkill(userId, skillName);
          if (skillBefore) {
            const newXP = skillBefore.xp + xpPerSkill;
            const newLevel = skillBefore.level; // Level will be updated by addSkillXp
            skillXPGains.push({
              skillName,
              xpGained: xpPerSkill,
              newXP,
              newLevel
            });
          }
        }
      }
      
      const task = await storage.completeTask(id, userId);
      if (!task) {
        return res.status(404).json({ error: "Task not found or already completed" });
      }
      
      // Get updated skill info after XP award
      for (const gain of skillXPGains) {
        const updatedSkill = await storage.getUserSkill(userId, gain.skillName);
        if (updatedSkill) {
          gain.newLevel = updatedSkill.level;
          gain.newXP = updatedSkill.xp;
        }
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
      
      res.json({ task, skillXPGains });
    } catch (error) {
      console.error("Task completion error:", error);
      res.status(500).json({ error: "Failed to complete task" });
    }
  });

  // Update task calendar color
  app.patch("/api/tasks/:id/color", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const id = parseInt(req.params.id);
      const { color } = req.body;

      if (!color || typeof color !== 'string') {
        return res.status(400).json({ error: "Invalid color value" });
      }

      const task = await storage.updateTask(id, { calendarColor: color }, userId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.json({ task });
    } catch (error) {
      console.error("Task color update error:", error);
      res.status(500).json({ error: "Failed to update task color" });
    }
  });

  // Add selected tasks to calendar (set scheduledTime based on dueDate)
  app.post("/api/tasks/add-to-calendar", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { taskIds, force } = req.body;

      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ error: "Invalid task IDs" });
      }

      const tasks = await storage.getTasks(userId);
      let addedCount = 0;
      let skippedCount = 0;
      let duplicateCount = 0;
      const duplicateTasks: any[] = [];

      // First pass: check for duplicates
      for (const taskId of taskIds) {
        const task = tasks.find(t => t.id === taskId);
        
        // Skip if task doesn't exist, is completed, or has no due date
        if (!task || task.completed || !task.dueDate) {
          skippedCount++;
          continue;
        }

        // Check if task already has scheduledTime (duplicate)
        if (task.scheduledTime && !force) {
          duplicateCount++;
          duplicateTasks.push({
            id: task.id,
            title: task.title,
            scheduledTime: task.scheduledTime
          });
        }
      }

      // If duplicates found and not forced, return them for confirmation
      if (duplicateCount > 0 && !force) {
        return res.json({
          success: false,
          duplicatesFound: true,
          duplicateCount,
          duplicateTasks,
          total: taskIds.length
        });
      }

      // Second pass: add tasks to calendar
      for (const taskId of taskIds) {
        const task = tasks.find(t => t.id === taskId);
        
        // Skip if task doesn't exist, is completed, or has no due date
        if (!task || task.completed || !task.dueDate) {
          continue;
        }

        // Set scheduledTime to the dueDate at 12 PM (noon) if not already set
        const scheduledTime = task.scheduledTime || new Date(
          new Date(task.dueDate).setHours(12, 0, 0, 0)
        );

        await storage.updateTask(taskId, { scheduledTime }, userId);
        addedCount++;
      }

      res.json({ 
        success: true, 
        added: addedCount,
        skipped: skippedCount,
        total: taskIds.length
      });
    } catch (error) {
      console.error("Add to calendar error:", error);
      res.status(500).json({ error: "Failed to add tasks to calendar" });
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
      const allSkillXPGains: Array<{ 
        skillName: string; 
        xpGained: number; 
        newXP: number; 
        newLevel: number; 
        maxXP: number;
        skillIcon?: string;
        previousLevel?: number;
        leveledUp?: boolean;
      }> = [];

      // Import XP calculation
      const { calculateXPPerSkill } = await import("./xpCalculation");

      // Complete all tasks in one transaction
      for (const taskId of taskIds) {
        // Get task before completion to calculate XP
        const taskBefore = await storage.getTask(taskId, userId);
        
        console.log(`🎯 Completing task ${taskId}:`, {
          title: taskBefore?.title,
          skillTags: taskBefore?.skillTags,
          hasSkillTags: taskBefore?.skillTags && taskBefore.skillTags.length > 0
        });
        
        // Calculate XP gains before completion
        if (taskBefore && !taskBefore.completed && taskBefore.skillTags && taskBefore.skillTags.length > 0) {
          const xpPerSkill = calculateXPPerSkill(taskBefore.importance, taskBefore.duration, taskBefore.skillTags.length);
          
          console.log(`💪 Awarding ${xpPerSkill} XP per skill for ${taskBefore.skillTags.length} skills`);
          
          for (const skillName of taskBefore.skillTags) {
            const skillBefore = await storage.getUserSkill(userId, skillName);
            if (skillBefore) {
              // Check if we already have XP for this skill (from previous tasks in batch)
              const existingGain = allSkillXPGains.find(g => g.skillName === skillName);
              if (existingGain) {
                existingGain.xpGained += xpPerSkill;
              } else {
                allSkillXPGains.push({
                  skillName,
                  xpGained: xpPerSkill,
                  newXP: skillBefore.xp + xpPerSkill,
                  newLevel: skillBefore.level,
                  maxXP: skillBefore.maxXp,
                  skillIcon: skillBefore.skillIcon || undefined,
                  previousLevel: skillBefore.level
                });
              }
            }
          }
        }
        
        const task = await storage.completeTask(taskId, userId);
        if (task) {
          totalGold += task.goldValue;
          completedCount++;
          completedTasks.push(task);
        }
      }

      // Get updated skill info after XP awards to check for level ups
      const leveledUpSkills: Array<{
        skillName: string;
        skillIcon: string;
        newLevel: number;
        currentXP: number;
        maxXP: number;
      }> = [];

      for (const gain of allSkillXPGains) {
        const updatedSkill = await storage.getUserSkill(userId, gain.skillName);
        if (updatedSkill) {
          const previousLevel = gain.previousLevel || gain.newLevel;
          gain.newLevel = updatedSkill.level;
          gain.newXP = updatedSkill.xp;
          gain.maxXP = updatedSkill.maxXp;
          gain.skillIcon = updatedSkill.skillIcon || undefined;
          
          // Check if skill leveled up
          if (updatedSkill.level > previousLevel) {
            gain.leveledUp = true;
            leveledUpSkills.push({
              skillName: updatedSkill.skillName,
              skillIcon: updatedSkill.skillIcon || 'Star',
              newLevel: updatedSkill.level,
              currentXP: updatedSkill.xp,
              maxXP: updatedSkill.maxXp
            });
          }
        }
      }

      console.log(`✅ Batch completion: ${completedCount} tasks, ${totalGold} gold, ${allSkillXPGains.length} skill XP gains:`, allSkillXPGains);
      console.log(`🎉 Level ups detected:`, leveledUpSkills);

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
        tasks: completedTasks,
        skillXPGains: allSkillXPGains,
        leveledUpSkills: leveledUpSkills
      });
    } catch (error) {
      console.error("Batch completion error:", error);
      res.status(500).json({ error: "Failed to complete tasks" });
    }
  });

  // Delete tasks (move to recycling bin without gold/XP)
  app.post("/api/tasks/delete-batch", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { taskIds } = req.body;
      
      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ error: "Invalid task IDs" });
      }

      let deletedCount = 0;
      const deletedTasks = [];

      // Move all tasks to recycling bin
      for (const taskId of taskIds) {
        const task = await storage.getTask(taskId, userId);
        
        if (task && !task.completed) {
          // Move to recycling bin without marking as complete (no gold/XP)
          const updatedTask = await storage.updateTask(taskId, {
            recycled: true,
            recycledAt: new Date(),
            recycledReason: 'deleted'
          }, userId);
          
          if (updatedTask) {
            deletedCount++;
            deletedTasks.push(updatedTask);
          }
        }
      }

      console.log(`🗑️ Deleted ${deletedCount} tasks (moved to recycling bin)`);

      res.json({
        deletedCount,
        tasks: deletedTasks
      });
    } catch (error) {
      console.error("Batch deletion error:", error);
      res.status(500).json({ error: "Failed to delete tasks" });
    }
  });

  // Undo task completion
  app.post("/api/tasks/undo-complete", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { taskIds } = req.body;
      
      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ error: "Invalid task IDs" });
      }

      let totalGoldRefunded = 0;
      const restoredTasks = [];

      // Uncomplete all tasks and restore from recycling
      for (const taskId of taskIds) {
        const task = await storage.getTask(taskId, userId);
        if (task && task.completed) {
          // Mark as incomplete and restore from recycling
          const updatedTask = await storage.updateTask(taskId, {
            completed: false,
            completedAt: null,
            recycled: false,
            recycledAt: null,
            recycledReason: null
          }, userId);
          
          if (updatedTask) {
            totalGoldRefunded += task.goldValue;
            restoredTasks.push(updatedTask);
          }
        }
      }

      // Deduct gold from user
      if (totalGoldRefunded > 0) {
        const currentProgress = await storage.getUserProgress(userId);
        if (currentProgress) {
          await storage.updateUserProgress(userId, {
            goldTotal: Math.max(0, (currentProgress.goldTotal || 0) - totalGoldRefunded)
          });
        }
      }

      // Update Notion in background if needed
      const user = await storage.getUserById(userId);
      if (user?.notionApiKey) {
        Promise.all(
          restoredTasks
            .filter(t => t.notionId)
            .map(t => updateTaskCompletion(t.notionId!, false, user.notionApiKey!)
              .catch(err => console.error('Notion update failed:', err))
            )
        ).catch(() => {});
      }

      res.json({
        restoredCount: restoredTasks.length,
        goldRefunded: totalGoldRefunded,
        tasks: restoredTasks
      });
    } catch (error) {
      console.error("Undo completion error:", error);
      res.status(500).json({ error: "Failed to undo task completion" });
    }
  });

  // Categorize tasks with AI
  app.post("/api/tasks/categorize", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { taskIds } = req.body;

      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ error: "Invalid task IDs" });
      }

      // Fetch user's skills (including custom ones)
      const userSkills = await storage.getUserSkills(userId);

      // Fetch training examples for this user (approved categorizations)
      const trainingData = await db.select().from(skillCategorizationTraining)
        .where(and(
          eq(skillCategorizationTraining.userId, userId),
          eq(skillCategorizationTraining.isApproved, true)
        ))
        .limit(50); // Use most recent 50 approved examples

      const trainingExamples = trainingData.map(t => ({
        taskTitle: t.taskTitle,
        taskDetails: t.taskDetails || undefined,
        correctSkills: t.correctSkills
      }));

      // Fetch tasks to categorize
      const allTasks = await storage.getTasks(userId);
      const tasksToCategor = allTasks.filter(t => taskIds.includes(t.id));

      if (tasksToCategor.length === 0) {
        return res.status(404).json({ error: "No tasks found" });
      }

      // Categorize with AI using training examples and user's skills
      const categorizations = await categorizeMultipleTasks(
        tasksToCategor.map(t => ({
          id: t.id,
          title: t.title,
          details: t.details || undefined
        })),
        trainingExamples,
        userSkills
      );

      // Update tasks with skill tags
      const updatedTasks = [];
      for (const task of tasksToCategor) {
        const categorization = categorizations.get(task.id);
        if (categorization) {
          const updated = await storage.updateTask(
            task.id,
            { skillTags: categorization.skills as any },
            userId
          );
          if (updated) {
            updatedTasks.push({
              ...updated,
              aiSuggestion: {
                skills: categorization.skills,
                reasoning: categorization.reasoning
              }
            });
          }
        }
      }

      res.json({
        success: true,
        categorizedCount: updatedTasks.length,
        tasks: updatedTasks
      });
    } catch (error) {
      console.error("Task categorization error:", error);
      res.status(500).json({ error: "Failed to categorize tasks" });
    }
  });

  // Submit feedback on AI categorization
  app.post("/api/tasks/categorize-feedback", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { taskId, approvedSkills, aiSuggestedSkills, isApproved } = req.body;

      if (!taskId || !Array.isArray(approvedSkills)) {
        return res.status(400).json({ error: "Task ID and approved skills required" });
      }

      // Get the task
      const task = await storage.getTask(taskId, userId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Store the training example
      await db.insert(skillCategorizationTraining).values({
        userId,
        taskTitle: task.title,
        taskDetails: task.details,
        correctSkills: approvedSkills,
        aiSuggestedSkills: aiSuggestedSkills || null,
        isApproved: isApproved !== false // Default to true
      });

      // Update the task with approved skills
      await storage.updateTask(taskId, { skillTags: approvedSkills as any }, userId);

      res.json({ success: true, message: "Feedback recorded" });
    } catch (error) {
      console.error("Categorization feedback error:", error);
      res.status(500).json({ error: "Failed to record feedback" });
    }
  });

  // Categorize all uncategorized tasks
  app.post("/api/tasks/categorize-all", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;

      // Get all tasks without skillTags
      const allTasks = await storage.getTasks(userId);
      const uncategorizedTasks = allTasks.filter(
        (task: any) => !task.skillTags || task.skillTags.length === 0
      );

      if (uncategorizedTasks.length === 0) {
        return res.json({ categorizedCount: 0, message: "All tasks already categorized" });
      }

      // Fetch user's skills and training examples
      const userSkills = await storage.getUserSkills(userId);
      const trainingData = await db.select().from(skillCategorizationTraining)
        .where(and(
          eq(skillCategorizationTraining.userId, userId),
          eq(skillCategorizationTraining.isApproved, true)
        ))
        .limit(50);

      const trainingExamples = trainingData.map(t => ({
        taskTitle: t.taskTitle,
        taskDetails: t.taskDetails || undefined,
        correctSkills: t.correctSkills
      }));

      let categorizedCount = 0;

      // Categorize each task
      for (const task of uncategorizedTasks) {
        try {
          const categorization = await categorizeTaskWithAI(
            task.title,
            task.details || undefined,
            trainingExamples,
            userSkills
          );

          if (categorization && categorization.skills.length > 0) {
            await storage.updateTask(
              task.id,
              { skillTags: categorization.skills as any },
              userId
            );
            categorizedCount++;
          }
        } catch (error) {
          console.error(`Failed to categorize task ${task.id}:`, error);
          // Continue with next task
        }
      }

      res.json({ 
        categorizedCount, 
        totalTasks: uncategorizedTasks.length,
        message: `Categorized ${categorizedCount} of ${uncategorizedTasks.length} tasks`
      });
    } catch (error) {
      console.error("Categorize all error:", error);
      res.status(500).json({ error: "Failed to categorize tasks" });
    }
  });

  // Get training examples for review
  app.get("/api/tasks/training-examples", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;

      const examples = await db.select().from(skillCategorizationTraining)
        .where(eq(skillCategorizationTraining.userId, userId))
        .orderBy(skillCategorizationTraining.createdAt)
        .limit(100);

      res.json({ examples });
    } catch (error) {
      console.error("Fetch training examples error:", error);
      res.status(500).json({ error: "Failed to fetch training examples" });
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

  // Recycling bin routes
  app.get("/api/recycled-tasks", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const recycledTasks = await storage.getRecycledTasks(userId);
      res.json(recycledTasks);
    } catch (error) {
      console.error("Get recycled tasks error:", error);
      res.status(500).json({ error: "Failed to get recycled tasks" });
    }
  });

  app.post("/api/tasks/:id/restore", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const id = parseInt(req.params.id);
      const restoredTask = await storage.restoreTask(id, userId);
      if (!restoredTask) {
        return res.status(404).json({ error: "Task not found in recycling bin" });
      }
      res.json(restoredTask);
    } catch (error) {
      console.error("Task restoration error:", error);
      res.status(500).json({ error: "Failed to restore task" });
    }
  });

  app.delete("/api/tasks/:id/permanent", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const id = parseInt(req.params.id);
      const success = await storage.permanentlyDeleteTask(id, userId);
      if (!success) {
        return res.status(404).json({ error: "Task not found in recycling bin" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Permanent deletion error:", error);
      res.status(500).json({ error: "Failed to permanently delete task" });
    }
  });

  // Batch restore tasks from recycling bin
  app.post("/api/tasks/restore", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { taskIds } = req.body;
      
      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ error: "Invalid task IDs" });
      }

      let restoredCount = 0;
      const restoredTasks = [];

      for (const taskId of taskIds) {
        const restoredTask = await storage.restoreTask(taskId, userId);
        if (restoredTask) {
          restoredCount++;
          restoredTasks.push(restoredTask);
        }
      }

      console.log(`♻️ Restored ${restoredCount} tasks from recycling bin`);

      res.json({
        restoredCount,
        tasks: restoredTasks
      });
    } catch (error) {
      console.error("Batch restore error:", error);
      res.status(500).json({ error: "Failed to restore tasks" });
    }
  });

  // Batch permanently delete tasks
  app.post("/api/tasks/permanent-delete", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { taskIds } = req.body;
      
      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ error: "Invalid task IDs" });
      }

      console.log(`🗑️ Starting permanent deletion of ${taskIds.length} tasks...`);

      // Use optimized batch delete instead of loop
      const deletedCount = await storage.permanentlyDeleteTasks(taskIds, userId);

      console.log(`🗑️ Permanently deleted ${deletedCount} tasks`);

      res.json({
        deletedCount
      });
    } catch (error) {
      console.error("Batch permanent delete error:", error);
      res.status(500).json({ error: "Failed to permanently delete tasks" });
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
    console.log('🔍 [CHECK-DUPLICATES] Endpoint called');
    try {
      const userId = req.session.userId;
      console.log('🔍 [CHECK-DUPLICATES] User ID:', userId);
      const user = await storage.getUserById(userId);
      console.log('🔍 [CHECK-DUPLICATES] User found:', !!user);
      
      if (!user?.notionApiKey || !user?.notionDatabaseId) {
        console.log('🔍 [CHECK-DUPLICATES] Missing credentials - API Key:', !!user?.notionApiKey, 'DB ID:', !!user?.notionDatabaseId);
        return res.status(400).json({ error: "Notion API key or database ID not configured" });
      }
      
      console.log('Checking Notion duplicates for user:', userId);
      console.log('Database ID:', user.notionDatabaseId);
      
      // Get tasks from Notion
      console.log('🔍 [CHECK-DUPLICATES] Fetching tasks from Notion...');
      const notionTasks = await getTasks(user.notionDatabaseId, user.notionApiKey);
      console.log('Fetched Notion tasks:', notionTasks.length);
      
      // Get existing tasks from database
      const existingTasks = await storage.getTasks(userId);
      console.log('Existing tasks in database:', existingTasks.length);
      
      // Create a set of existing notionIds for quick lookup
      const existingNotionIds = new Set(
        existingTasks
          .filter((task: any) => task.notionId)
          .map((task: any) => task.notionId)
      );
      
      // Count duplicates
      const duplicates = notionTasks.filter(task => existingNotionIds.has(task.notionId));
      
      console.log('Duplicate count:', duplicates.length);
      
      res.json({ 
        totalCount: notionTasks.length,
        duplicateCount: duplicates.length,
        newCount: notionTasks.length - duplicates.length
      });
    } catch (error: any) {
      console.error("Notion duplicate check error:", error);
      console.error("Error details:", error.message);
      res.status(500).json({ 
        error: "Failed to check for duplicates",
        message: error.message 
      });
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
      const importedTaskIds: number[] = []; // Track imported task IDs for undo

      for (const notionTask of notionTasks) {
        try {
          // Skip if duplicate and user chose to skip duplicates
          if (!includeDuplicates && existingNotionIds.has(notionTask.notionId)) {
            continue;
          }
          
          // Skip completed tasks from Notion - they belong in recycling
          if (notionTask.isCompleted) {
            continue;
          }
          
          const taskData = {
            userId,
            notionId: notionTask.notionId,
            title: notionTask.title,
            description: notionTask.description,
            details: notionTask.details,
            duration: notionTask.duration,
            goldValue: notionTask.goldValue,
            dueDate: notionTask.dueDate,
            completed: false, // Only import non-completed tasks
            importance: notionTask.importance,
            kanbanStage: notionTask.kanbanStage,
            recurType: notionTask.recurType,
            campaign: notionTask.campaign || "unassigned",
            apple: notionTask.apple,
            smartPrep: notionTask.smartPrep,
            delegationTask: notionTask.delegationTask,
            velin: notionTask.velin,
          };

          const createdTask = await storage.createTask(taskData);
          if (createdTask && createdTask.id) {
            importedTaskIds.push(createdTask.id);
          }
          importedCount++;
        } catch (error) {
          console.error("Error importing task:", error);
        }
      }

      res.json({ success: true, count: importedCount, importedTaskIds });
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

  // Undo append to Notion (remove from Notion but keep in app)
  app.post("/api/notion/undo-append", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUserById(userId);
      const { taskIds } = req.body;
      
      if (!user?.notionApiKey) {
        return res.status(400).json({ error: "Notion API key not configured" });
      }

      if (!taskIds || !Array.isArray(taskIds)) {
        return res.status(400).json({ error: "Task IDs array is required" });
      }

      const { deleteTaskFromNotion } = await import("./notion");
      let removedCount = 0;

      for (const taskId of taskIds) {
        try {
          const task = await storage.getTask(taskId, userId);
          if (task && task.userId === userId && task.notionId) {
            // Delete from Notion
            await deleteTaskFromNotion(task.notionId, user.notionApiKey);
            
            // Remove notion ID from task (keep task in app)
            await storage.updateTask(taskId, { notionId: null }, userId);
            removedCount++;
          }
        } catch (error) {
          console.error(`Error removing task ${taskId} from Notion:`, error);
        }
      }

      res.json({ message: `Successfully removed ${removedCount} tasks from Notion`, count: removedCount });
    } catch (error) {
      console.error("Notion undo append error:", error);
      res.status(500).json({ error: "Failed to undo append to Notion" });
    }
  });

  // Undo delete from Notion (restore to Notion)
  app.post("/api/notion/undo-delete", requireAuth, async (req: any, res) => {
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
      let restoredCount = 0;

      for (const taskId of taskIds) {
        try {
          const task = await storage.getTask(taskId, userId);
          if (task && task.userId === userId && task.recycled) {
            // Re-add to Notion
            const notionId = await addTaskToNotion(task, user.notionDatabaseId, user.notionApiKey);
            
            // Un-recycle and update with new Notion ID
            await storage.updateTask(taskId, { 
              notionId,
              recycled: false,
              recycledAt: null,
              recycledReason: null
            }, userId);
            restoredCount++;
          }
        } catch (error) {
          console.error(`Error restoring task ${taskId} to Notion:`, error);
        }
      }

      res.json({ message: `Successfully restored ${restoredCount} tasks to Notion`, count: restoredCount });
    } catch (error) {
      console.error("Notion undo delete error:", error);
      res.status(500).json({ error: "Failed to undo delete from Notion" });
    }
  });

  // Undo import from Notion (delete imported tasks from app)
  app.post("/api/notion/undo-import", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { taskIds } = req.body;
      
      if (!taskIds || !Array.isArray(taskIds)) {
        return res.status(400).json({ error: "Task IDs array is required" });
      }

      let deletedCount = 0;

      for (const taskId of taskIds) {
        try {
          const task = await storage.getTask(taskId, userId);
          if (task && task.userId === userId) {
            // Permanently delete the imported task from the app
            await storage.deleteTask(taskId, userId);
            deletedCount++;
          }
        } catch (error) {
          console.error(`Error deleting imported task ${taskId}:`, error);
        }
      }

      res.json({ message: `Successfully deleted ${deletedCount} imported tasks`, count: deletedCount });
    } catch (error) {
      console.error("Notion undo import error:", error);
      res.status(500).json({ error: "Failed to undo import from Notion" });
    }
  });

  // Undo export to Notion (remove from Notion or unlink)
  app.post("/api/notion/undo-export", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUserById(userId);
      const { exportedTaskIds, linkedTaskIds } = req.body;
      
      if (!user?.notionApiKey) {
        return res.status(400).json({ error: "Notion API key not configured" });
      }

      const { deleteTaskFromNotion } = await import("./notion");
      let removedCount = 0;
      let unlinkedCount = 0;

      // For exported tasks: delete from Notion and remove notionId
      if (exportedTaskIds && Array.isArray(exportedTaskIds)) {
        for (const taskId of exportedTaskIds) {
          try {
            const task = await storage.getTask(taskId, userId);
            if (task && task.userId === userId && task.notionId) {
              // Delete from Notion
              await deleteTaskFromNotion(task.notionId, user.notionApiKey);
              
              // Remove notion ID from task
              await storage.updateTask(taskId, { notionId: null }, userId);
              removedCount++;
            }
          } catch (error) {
            console.error(`Error removing exported task ${taskId} from Notion:`, error);
          }
        }
      }

      // For linked tasks: just remove the notionId (don't delete from Notion as it existed before)
      if (linkedTaskIds && Array.isArray(linkedTaskIds)) {
        for (const taskId of linkedTaskIds) {
          try {
            const task = await storage.getTask(taskId, userId);
            if (task && task.userId === userId) {
              // Just remove the notionId link
              await storage.updateTask(taskId, { notionId: null }, userId);
              unlinkedCount++;
            }
          } catch (error) {
            console.error(`Error unlinking task ${taskId}:`, error);
          }
        }
      }

      res.json({ 
        message: `Undo export complete: ${removedCount} removed from Notion, ${unlinkedCount} unlinked`,
        removed: removedCount,
        unlinked: unlinkedCount
      });
    } catch (error) {
      console.error("Notion undo export error:", error);
      res.status(500).json({ error: "Failed to undo export to Notion" });
    }
  });

  // Export ALL tasks to Notion (replace all Notion tasks with app tasks)
  app.post("/api/notion/export", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUserById(userId);
      
      if (!user?.notionApiKey || !user?.notionDatabaseId) {
        return res.status(400).json({ error: "Notion API key or database ID not configured" });
      }

      const { getTasks, deleteTaskFromNotion, addTaskToNotion } = await import("./notion");
      
      // Get all tasks from app (including ones created via AddTaskModal without notionId)
      const appTasks = await storage.getTasks(userId);
      const activeTasks = appTasks.filter((task: any) => !task.completed);
      
      // Get all existing tasks from Notion
      const notionTasks = await getTasks(user.notionDatabaseId, user.notionApiKey);
      
      // Create a map of existing Notion tasks by title for duplicate detection
      const notionTasksByTitle = new Map();
      notionTasks.forEach((task: any) => {
        notionTasksByTitle.set(task.title.toLowerCase().trim(), task.notionId);
      });
      
      let exportedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      const exportedTaskIds: number[] = []; // Track tasks that were newly exported
      const linkedTaskIds: number[] = []; // Track tasks that were linked to existing Notion tasks
      
      for (const task of activeTasks) {
        try {
          const taskTitleKey = task.title.toLowerCase().trim();
          
          // Check if task already exists in Notion by title
          const existingNotionId = notionTasksByTitle.get(taskTitleKey);
          
          if (task.notionId) {
            // Task already has a Notion ID - check if it still exists
            if (existingNotionId && existingNotionId === task.notionId) {
              // Task exists and IDs match - skip to avoid duplicates
              skippedCount++;
              continue;
            }
          }
          
          if (existingNotionId && !task.notionId) {
            // Task with same title exists in Notion but app task doesn't have notionId
            // Link them instead of creating duplicate
            await storage.updateTask(task.id, { notionId: existingNotionId }, userId);
            linkedTaskIds.push(task.id);
            updatedCount++;
            continue;
          }
          
          // Create new task in Notion
          const notionId = await addTaskToNotion(task, user.notionDatabaseId, user.notionApiKey);
          
          // Update task with Notion ID so it's synced
          await storage.updateTask(task.id, { notionId }, userId);
          exportedTaskIds.push(task.id);
          exportedCount++;
        } catch (error) {
          console.error(`Error exporting task ${task.id} to Notion:`, error);
        }
      }

      res.json({ 
        message: `Export complete: ${exportedCount} new, ${updatedCount} linked, ${skippedCount} skipped`, 
        exported: exportedCount,
        linked: updatedCount,
        skipped: skippedCount,
        total: exportedCount + updatedCount + skippedCount,
        exportedTaskIds,
        linkedTaskIds
      });
    } catch (error) {
      console.error("Notion export error:", error);
      res.status(500).json({ error: "Failed to export to Notion" });
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
      
      // Check if Google Calendar is configured (not checking tokens here, let the service handle it)
      if (!user) {
        return res.status(400).json({ 
          error: "User not found",
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

      if (tasksToSync.length === 0) {
        return res.json({ 
          success: true, 
          count: 0,
          failed: 0,
          total: 0,
          message: "No tasks with due dates to sync"
        });
      }

      const results = await googleCalendar.syncTasks(tasksToSync, user);
      
      res.json({ 
        success: true, 
        count: results.success,
        failed: results.failed,
        total: tasksToSync.length
      });
    } catch (error: any) {
      console.error("Calendar sync error:", error);
      
      // Check if it's an auth error
      if (error.message?.includes('Google OAuth credentials not configured')) {
        return res.status(400).json({ 
          error: "Google Calendar not connected",
          needsAuth: true 
        });
      }
      
      res.status(500).json({ 
        error: "Failed to sync to calendar",
        details: error.message
      });
    }
  });

  // Google Calendar Settings Routes
  app.put("/api/google-calendar/settings", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { 
        googleCalendarClientId, 
        googleCalendarClientSecret, 
        googleCalendarSyncEnabled,
        googleCalendarSyncDirection 
      } = req.body;

      // Update user's Google Calendar settings
      const user = await storage.updateGoogleCalendarSettings(userId, {
        googleCalendarClientId,
        googleCalendarClientSecret,
        googleCalendarSyncEnabled,
        googleCalendarSyncDirection,
      });

      res.json({ 
        success: true,
        message: "Google Calendar settings updated successfully" 
      });
    } catch (error) {
      console.error("Error updating Google Calendar settings:", error);
      res.status(500).json({ error: "Failed to update Google Calendar settings" });
    }
  });

  // Diagnostic endpoint to check user's Google Calendar credentials
  app.get("/api/google-calendar/debug", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.json({ error: "No user ID in session" });
      }
      
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.json({ error: "User not found" });
      }
      
      res.json({
        userId: user.id,
        hasClientId: !!user.googleCalendarClientId,
        clientIdLength: user.googleCalendarClientId?.length || 0,
        clientIdPrefix: user.googleCalendarClientId?.substring(0, 10) || null,
        hasClientSecret: !!user.googleCalendarClientSecret,
        clientSecretLength: user.googleCalendarClientSecret?.length || 0,
        hasAccessToken: !!user.googleCalendarAccessToken,
        hasRefreshToken: !!user.googleCalendarRefreshToken,
        syncEnabled: user.googleCalendarSyncEnabled,
        syncDirection: user.googleCalendarSyncDirection,
      });
    } catch (error: any) {
      res.json({ error: error.message, stack: error.stack });
    }
  });

  // OAuth authorization URL generation
  app.get("/api/google-calendar/authorize-url", requireAuth, async (req: any, res) => {
    try {
      console.log('📝 [AUTH URL] Starting authorization URL generation...');
      const userId = req.session?.userId;
      console.log('📝 [AUTH URL] User ID:', userId);
      console.log('📝 [AUTH URL] Session:', JSON.stringify(req.session));
      
      if (!userId) {
        console.log('❌ [AUTH URL] No user ID in session');
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUserById(userId);
      console.log('📝 [AUTH URL] User found:', !!user);
      console.log('📝 [AUTH URL] User data:', user ? {
        id: user.id,
        hasClientId: !!user.googleCalendarClientId,
        hasClientSecret: !!user.googleCalendarClientSecret,
        clientIdLength: user.googleCalendarClientId?.length,
        clientSecretLength: user.googleCalendarClientSecret?.length
      } : null);

      if (!user?.googleCalendarClientId || !user?.googleCalendarClientSecret) {
        console.log('❌ [AUTH URL] Missing credentials');
        return res.status(400).json({ 
          error: "Please save your Client ID and Client Secret first" 
        });
      }

      // Generate OAuth URL with user's credentials
      console.log('📝 [AUTH URL] Generating OAuth URL...');
      
      // Determine the correct redirect URI
      // In production (Render), use the environment variable
      // In development, construct from request
      const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || 
        `${req.protocol}://${req.get('host')}/api/google-calendar/callback`;
      
      console.log('📝 [AUTH URL] Redirect URI:', redirectUri);
      console.log('📝 [AUTH URL] Protocol:', req.protocol);
      console.log('📝 [AUTH URL] Host:', req.get('host'));
      console.log('📝 [AUTH URL] ENV redirect:', process.env.GOOGLE_CALENDAR_REDIRECT_URI);
      
      console.log('📝 [AUTH URL] Creating OAuth2Client with clientId length:', user.googleCalendarClientId.length);
      console.log('📝 [AUTH URL] Creating OAuth2Client with clientSecret length:', user.googleCalendarClientSecret.length);
      
      const oauth2Client = new OAuth2Client(
        user.googleCalendarClientId,
        user.googleCalendarClientSecret,
        redirectUri
      );

      console.log('📝 [AUTH URL] OAuth2Client created, generating auth URL...');
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar.readonly'],
        prompt: 'consent',
        state: userId, // Pass userId in state to identify user in callback
      });

      console.log('✅ [AUTH URL] Generated successfully:', authUrl.substring(0, 100) + '...');
      res.json({ authUrl });
    } catch (error: any) {
      console.error("❌ [AUTH URL] Error generating auth URL:", error);
      console.error("❌ [AUTH URL] Error message:", error?.message);
      console.error("❌ [AUTH URL] Error stack:", error?.stack);
      console.error("❌ [AUTH URL] Error name:", error?.name);
      console.error("❌ [AUTH URL] Full error object:", JSON.stringify(error, null, 2));
      res.status(500).json({ 
        error: "Failed to generate authorization URL",
        details: error?.message 
      });
    }
  });

  // OAuth callback endpoint
  app.get("/api/google-calendar/callback", async (req: any, res) => {
    try {
      console.log('📝 [CALLBACK] OAuth callback received');
      const { code, state: userId } = req.query;
      console.log('📝 [CALLBACK] Code present:', !!code, 'User ID:', userId);

      if (!code || !userId) {
        return res.status(400).send('Missing authorization code or user ID');
      }

      const user = await storage.getUserById(userId);
      console.log('📝 [CALLBACK] User found:', !!user);
      
      if (!user?.googleCalendarClientId || !user?.googleCalendarClientSecret) {
        return res.status(400).send('User credentials not found');
      }

      // Exchange code for tokens
      const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || 
        `${req.protocol}://${req.get('host')}/api/google-calendar/callback`;
      
      console.log('📝 [CALLBACK] Redirect URI:', redirectUri);
      
      const oauth2Client = new OAuth2Client(
        user.googleCalendarClientId,
        user.googleCalendarClientSecret,
        redirectUri
      );

      console.log('📝 [CALLBACK] Exchanging code for tokens...');
      const { tokens } = await oauth2Client.getToken(code);
      console.log('📝 [CALLBACK] Tokens received:', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiryDate: tokens.expiry_date
      });

      // Save tokens to database
      await storage.updateUserSettings(userId, {
        googleCalendarAccessToken: tokens.access_token,
        googleCalendarRefreshToken: tokens.refresh_token,
        googleCalendarTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        googleCalendarSyncEnabled: true,
      });

      console.log('✅ [CALLBACK] Tokens saved successfully');
      // Redirect back to integration page with success
      res.redirect('/google-calendar-integration?auth=success');
    } catch (error: any) {
      console.error('❌ [CALLBACK] Error during OAuth callback:', error);
      console.error('❌ [CALLBACK] Error message:', error?.message);
      res.redirect('/google-calendar-integration?auth=error');
    }
  });

  // Google Calendar sync endpoint
  app.post("/api/google-calendar/sync", requireAuth, async (req: any, res) => {
    try {
      console.log('📅 [SYNC] Starting Google Calendar sync...');
      const userId = req.session.userId;
      const user = await storage.getUserById(userId);
      console.log('📅 [SYNC] User:', userId, 'Sync enabled:', user?.googleCalendarSyncEnabled);

      if (!user?.googleCalendarSyncEnabled) {
        return res.status(400).json({ 
          error: "Google Calendar sync is not enabled" 
        });
      }

      if (!user.googleCalendarClientId || !user.googleCalendarClientSecret) {
        return res.status(400).json({ 
          error: "Google Calendar credentials not configured" 
        });
      }

      if (!user.googleCalendarAccessToken) {
        return res.status(400).json({ 
          error: "Google Calendar not authorized. Please click 'Authorize Google Account' first." 
        });
      }

      // Note: We no longer auto-import Google Calendar events as tasks
      // Google Calendar events are displayed in the calendar view only
      // ProductivityQuest tasks are the source of truth for the tasks list
      
      console.log('✅ [SYNC] Google Calendar is connected and ready');
      console.log('📅 [SYNC] Calendar events will be displayed in calendar view only');
      console.log('📝 [SYNC] Tasks list remains independent from Google Calendar events');

      res.json({ 
        success: true,
        imported: 0,
        total: 0,
        message: 'Google Calendar connected. Events visible in calendar view only.'
      });
    } catch (error: any) {
      console.error("❌ [SYNC] Error during Google Calendar sync:", error);
      console.error("❌ [SYNC] Error stack:", error.stack);
      res.status(500).json({ 
        error: error.message || "Failed to sync with Google Calendar" 
      });
    }
  });

  app.post("/api/google-calendar/sync-manual", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUserById(userId);

      if (!user?.googleCalendarSyncEnabled) {
        return res.status(400).json({ 
          error: "Google Calendar sync is not enabled" 
        });
      }

      if (!user.googleCalendarClientId || !user.googleCalendarClientSecret) {
        return res.status(400).json({ 
          error: "Google Calendar credentials not configured" 
        });
      }

      // Update last sync timestamp
      await storage.updateGoogleCalendarSettings(userId, {
        googleCalendarLastSync: new Date()
      });

      res.json({ 
        success: true,
        message: "Manual sync initiated successfully",
        lastSync: new Date()
      });
    } catch (error) {
      console.error("Error during manual Google Calendar sync:", error);
      res.status(500).json({ error: "Failed to sync with Google Calendar" });
    }
  });

  // Get list of available calendars
  app.get("/api/google-calendar/calendars", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUserById(userId);

      if (!user?.googleCalendarAccessToken) {
        return res.status(400).json({ 
          error: "Google Calendar not authorized",
          calendars: []
        });
      }

      const calendars = await googleCalendar.getCalendarList(user);
      res.json({ calendars });
    } catch (error: any) {
      console.error("Error fetching calendar list:", error);
      res.status(500).json({ 
        error: "Failed to fetch calendar list",
        details: error.message 
      });
    }
  });

  app.get("/api/google-calendar/events", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUserById(userId);

      if (!user?.googleCalendarSyncEnabled || !user.googleCalendarClientId || !user.googleCalendarClientSecret) {
        return res.status(400).json({ 
          error: "Google Calendar not configured",
          events: []
        });
      }

      // Get month from query params (default to current month)
      const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
      const month = req.query.month ? parseInt(req.query.month) : new Date().getMonth();

      // Calculate start and end of month
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);

      // Try to fetch actual Google Calendar events
      let googleEvents: any[] = [];
      let calendarError = null;
      
      try {
        googleEvents = await googleCalendar.getEvents(user, startDate, endDate);
        console.log(`✅ Fetched ${googleEvents.length} events from Google Calendar for ${year}-${month + 1}`);
      } catch (error: any) {
        console.error('❌ Error fetching Google Calendar events:', error.message);
        calendarError = error.message;
        
        // If auth expired, clear the credentials
        if (error.message === 'CALENDAR_AUTH_EXPIRED') {
          await storage.updateUserSettings(userId, {
            googleCalendarSyncEnabled: false
          });
        }
      }

      // Also fetch ProductivityQuest tasks for this month
      const tasks = await storage.getTasks(userId);
      const tasksInMonth = tasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate >= startDate && dueDate <= endDate;
      });

      // Combine Google Calendar events and ProductivityQuest tasks
      const events: any[] = [];

      // Add Google Calendar events
      for (const gEvent of googleEvents) {
        events.push({
          id: `google-${gEvent.id}`,
          title: gEvent.summary || 'Untitled Event',
          start: gEvent.start?.dateTime || gEvent.start?.date,
          end: gEvent.end?.dateTime || gEvent.end?.date,
          description: gEvent.description || '',
          completed: false,
          importance: 'Medium',
          goldValue: 0,
          campaign: 'Google Calendar',
          skillTags: [],
          source: 'google',
          calendarId: gEvent.calendarId,
          calendarName: gEvent.calendarName,
          calendarColor: gEvent.calendarBackgroundColor,
          googleEventId: gEvent.id
        });
      }

      // Add ProductivityQuest tasks
      for (const task of tasksInMonth) {
        // Use scheduledTime if available, otherwise default to 12 PM (noon) on the due date
        let startTime: Date;
        
        if (task.scheduledTime) {
          // scheduledTime is a timestamp - use it directly
          startTime = new Date(task.scheduledTime);
        } else if (task.dueDate) {
          // No scheduledTime - default to 12 PM (noon) on the due date
          startTime = new Date(task.dueDate);
          startTime.setHours(12, 0, 0, 0);
        } else {
          startTime = new Date();
        }
        
        // Calculate end time based on task duration
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + (task.duration || 60));
        
        events.push({
          id: task.id.toString(),
          title: task.title,
          start: startTime.toISOString(),
          end: endTime.toISOString(),
          description: task.description || task.details || '',
          completed: task.completed,
          importance: task.importance,
          goldValue: task.goldValue,
          campaign: task.campaign,
          skillTags: task.skillTags || [],
          duration: task.duration,
          source: 'productivityquest',
          calendarColor: task.calendarColor
        });
      }

      res.json({
        success: true,
        events,
        month,
        year,
        stats: {
          googleEvents: googleEvents.length,
          productivityQuestTasks: tasksInMonth.length,
          total: events.length,
          calendarError
        }
      });
    } catch (error) {
      console.error("Error fetching Google Calendar events:", error);
      res.status(500).json({ error: "Failed to fetch calendar events", events: [] });
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

  app.patch("/api/shop/items/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const itemId = parseInt(req.params.id);
      const { cost } = req.body;
      
      if (cost === undefined || cost === null) {
        return res.status(400).json({ error: "Cost is required" });
      }

      const updatedItem = await storage.updateShopItemPrice(itemId, parseInt(cost), userId);
      
      if (!updatedItem) {
        return res.status(404).json({ error: "Shop item not found or access denied" });
      }
      
      res.json(updatedItem);
    } catch (error) {
      console.error("Update shop item price error:", error);
      res.status(500).json({ error: "Failed to update shop item price" });
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

  // Create custom skill
  app.post("/api/skills/custom", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { skillName, skillIcon, skillDescription, skillMilestones, level } = req.body;

      if (!skillName || !skillName.trim()) {
        return res.status(400).json({ error: "Skill name is required" });
      }

      const newSkill = await storage.createCustomSkill(userId, {
        skillName: skillName.trim(),
        skillIcon,
        skillDescription,
        skillMilestones,
        level,
      });

      res.json({ skill: newSkill });
    } catch (error) {
      console.error("Error creating custom skill:", error);
      if (error instanceof Error && error.message.includes("already exists")) {
        res.status(409).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to create custom skill" });
      }
    }
  });

  // Delete custom skill
  app.delete("/api/skills/:skillId", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const skillId = parseInt(req.params.skillId);

      if (isNaN(skillId)) {
        return res.status(400).json({ error: "Invalid skill ID" });
      }

      await storage.deleteCustomSkill(userId, skillId);
      res.json({ message: "Skill deleted successfully" });
    } catch (error) {
      console.error("Error deleting custom skill:", error);
      if (error instanceof Error && error.message.includes("Cannot delete default")) {
        res.status(403).json({ error: error.message });
      } else if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to delete skill" });
      }
    }
  });

  // Update skill icon, level, and XP
  app.patch("/api/skills/:skillId/icon", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const skillId = parseInt(req.params.skillId);
      const { icon, level, xp } = req.body;

      if (isNaN(skillId)) {
        return res.status(400).json({ error: "Invalid skill ID" });
      }

      if (!icon || typeof icon !== 'string') {
        return res.status(400).json({ error: "Icon name is required" });
      }

      // Validate level and xp if provided
      if (level !== undefined && (typeof level !== 'number' || level < 1)) {
        return res.status(400).json({ error: "Level must be a positive number" });
      }

      if (xp !== undefined && (typeof xp !== 'number' || xp < 0)) {
        return res.status(400).json({ error: "XP must be a non-negative number" });
      }

      await storage.updateSkill(userId, skillId, { 
        icon, 
        ...(level !== undefined && { level }),
        ...(xp !== undefined && { xp })
      });
      
      res.json({ message: "Skill updated successfully" });
    } catch (error) {
      console.error("Error updating skill:", error);
      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to update skill" });
      }
    }
  });

  // Update skill constellation milestones
  app.patch("/api/skills/:skillId/milestones", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const skillId = parseInt(req.params.skillId);
      const { milestones } = req.body;

      if (isNaN(skillId)) {
        return res.status(400).json({ error: "Invalid skill ID" });
      }

      if (!Array.isArray(milestones)) {
        return res.status(400).json({ error: "Milestones must be an array" });
      }

      // Validate milestone structure
      for (const milestone of milestones) {
        if (!milestone.id || !milestone.title || typeof milestone.level !== 'number' ||
            typeof milestone.x !== 'number' || typeof milestone.y !== 'number') {
          return res.status(400).json({ 
            error: "Each milestone must have id, title, level, x, and y properties" 
          });
        }
      }

      await storage.updateSkillMilestones(userId, skillId, milestones);
      
      res.json({ message: "Milestones updated successfully" });
    } catch (error) {
      console.error("Error updating skill milestones:", error);
      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to update milestones" });
      }
    }
  });

  // Toggle milestone completion
  app.patch("/api/skills/:skillId/milestones/:milestoneId/toggle", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const skillId = parseInt(req.params.skillId);
      const milestoneId = req.params.milestoneId;

      if (isNaN(skillId)) {
        return res.status(400).json({ error: "Invalid skill ID" });
      }

      if (!milestoneId || typeof milestoneId !== 'string') {
        return res.status(400).json({ error: "Invalid milestone ID" });
      }

      const skill = await storage.toggleMilestoneCompletion(userId, skillId, milestoneId);
      
      res.json(skill);
    } catch (error) {
      console.error("Error toggling milestone completion:", error);
      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to toggle milestone completion" });
      }
    }
  });

  // Campaigns routes
  app.get("/api/campaigns", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const campaigns = await storage.getCampaigns(userId);
      res.json(campaigns);
    } catch (error: any) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  app.post("/api/campaigns", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { title, description, icon } = req.body;

      if (!title || !description || !icon) {
        return res.status(400).json({ error: "Title, description, and icon are required" });
      }

      const campaign = await storage.createCampaign({
        userId,
        title,
        description,
        icon,
      });

      res.json(campaign);
    } catch (error: any) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ error: "Failed to create campaign" });
    }
  });

  app.delete("/api/campaigns/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const campaignId = parseInt(req.params.id);

      await storage.deleteCampaign(userId, campaignId);
      res.json({ message: "Campaign deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ error: "Failed to delete campaign" });
    }
  });

  // Stats routes
  app.get("/api/stats", requireAuth, async (req: any, res) => {
    try {
      console.log('📊 [GET /api/stats] Fetching stats for user:', req.session.userId);
      const userId = req.session.userId;
      const tasks = await storage.getTasks(userId);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const completedToday = tasks.filter(task => 
        task.completed && 
        task.completedAt && 
        new Date(task.completedAt) >= today
      ).length;
      
      const totalToday = tasks.length;
      
      const goldEarnedToday = tasks
        .filter(task => 
          task.completed && 
          task.completedAt && 
          new Date(task.completedAt) >= today
        )
        .reduce((sum, task) => sum + task.goldValue, 0);

      console.log('📊 [GET /api/stats] Success - Completed:', completedToday, 'Total:', totalToday, 'Gold:', goldEarnedToday);
      res.json({
        completedToday,
        totalToday,
        goldEarnedToday,
      });
    } catch (error: any) {
      console.error('❌ [GET /api/stats] Error:', error.message);
      console.error('❌ [GET /api/stats] Stack:', error.stack);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}