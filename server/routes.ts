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
import { Resend } from 'resend';

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

  // Forgot password - request reset link
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
      
      console.log('🔑 Password reset requested for:', email);
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      // Always return success to prevent email enumeration attacks
      if (!user) {
        console.log('⚠️ No user found for email:', email);
        return res.json({ message: 'If an account exists with this email, you will receive a reset link.' });
      }
      
      // Generate a secure random token
      const crypto = await import('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      
      // Store the token
      await storage.createPasswordResetToken(user.id, token, expiresAt);
      
      console.log('✅ Password reset token created for user:', user.username);
      
      const resetLink = `${process.env.APP_URL || 'http://localhost:5000'}/reset-password?token=${token}`;
      console.log('🔗 Reset link:', resetLink);
      
      // Send email using Resend
      if (process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        try {
          await resend.emails.send({
            from: 'ProductivityQuest <noreply@productivity-quest.com>',
            to: email,
            subject: 'Reset Your Password - ProductivityQuest',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #6366f1; margin-bottom: 24px;">Reset Your Password</h1>
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                  Hi${user.username ? ` ${user.username}` : ''},
                </p>
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                  We received a request to reset your password for your ProductivityQuest account.
                </p>
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                  Click the button below to set a new password:
                </p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${resetLink}" 
                     style="background-color: #6366f1; color: white; padding: 14px 28px; 
                            text-decoration: none; border-radius: 8px; font-weight: 600;
                            display: inline-block;">
                    Reset Password
                  </a>
                </div>
                <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                  This link will expire in 1 hour. If you didn't request a password reset, 
                  you can safely ignore this email.
                </p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                <p style="color: #9ca3af; font-size: 12px;">
                  ProductivityQuest - Level up your productivity
                </p>
              </div>
            `,
          });
          console.log('📧 Password reset email sent successfully to:', email);
        } catch (emailError) {
          console.error('❌ Failed to send email:', emailError);
          // Still return success - don't reveal email sending issues
        }
      } else {
        console.log('⚠️ RESEND_API_KEY not configured, email not sent');
        console.log('📧 Reset link (would be emailed):', resetLink);
      }
      
      res.json({ message: 'If an account exists with this email, you will receive a reset link.' });
    } catch (error: any) {
      console.error('❌ Forgot password error:', error);
      res.status(500).json({ message: 'Failed to process request' });
    }
  });

  // Validate reset token - check if token is valid before showing reset form
  app.get('/api/auth/validate-reset-token', async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ valid: false, message: 'Token is required' });
      }
      
      const resetToken = await storage.getPasswordResetToken(token);
      
      if (!resetToken) {
        return res.json({ valid: false, message: 'Invalid or expired reset link' });
      }
      
      if (resetToken.used) {
        return res.json({ valid: false, message: 'This reset link has already been used' });
      }
      
      if (new Date() > resetToken.expiresAt) {
        return res.json({ valid: false, message: 'This reset link has expired' });
      }
      
      res.json({ valid: true });
    } catch (error: any) {
      console.error('❌ Validate token error:', error);
      res.status(500).json({ valid: false, message: 'Failed to validate token' });
    }
  });

  // Reset password - verify token and update password
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: 'Token and password are required' });
      }
      
      if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters' });
      }
      
      console.log('🔑 Password reset attempt with token');
      
      // Find and validate the token
      const resetToken = await storage.getPasswordResetToken(token);
      
      if (!resetToken) {
        console.log('❌ Invalid reset token');
        return res.status(400).json({ message: 'Invalid or expired reset link' });
      }
      
      if (resetToken.used) {
        console.log('❌ Reset token already used');
        return res.status(400).json({ message: 'This reset link has already been used' });
      }
      
      if (new Date() > resetToken.expiresAt) {
        console.log('❌ Reset token expired');
        return res.status(400).json({ message: 'This reset link has expired' });
      }
      
      // Update the password
      await storage.updateUserPassword(resetToken.userId, password);
      
      // Mark the token as used
      await storage.markPasswordResetTokenUsed(token);
      
      console.log('✅ Password reset successful for user:', resetToken.userId);
      
      res.json({ message: 'Password reset successful' });
    } catch (error: any) {
      console.error('❌ Reset password error:', error);
      res.status(500).json({ message: 'Failed to reset password' });
    }
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
        googleCalendarInstantSync: user.googleCalendarInstantSync || false,
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
        googleCalendarSyncDirection,
        googleCalendarInstantSync
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
      if (googleCalendarInstantSync !== undefined) updates.googleCalendarInstantSync = googleCalendarInstantSync;
      
      const user = await storage.updateUserSettings(userId, updates);
      
      res.json({
        message: "Settings updated successfully",
        notionApiKey: user.notionApiKey ? '***' : null,
        notionDatabaseId: user.notionDatabaseId,
        hasGoogleAuth: !!(user.googleAccessToken && user.googleRefreshToken),
        googleConnected: !!(user.googleAccessToken && user.googleRefreshToken),
        googleCalendarSyncEnabled: user.googleCalendarSyncEnabled,
        googleCalendarInstantSync: user.googleCalendarInstantSync,
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
      
      // Instant Calendar Sync - add task to calendar if enabled and has due date
      (async () => {
        try {
          const user = await storage.getUserById(userId);
          if (user?.googleCalendarInstantSync && 
              (user?.googleCalendarAccessToken || user?.googleCalendarRefreshToken) && 
              task.dueDate) {
            console.log(`📅 [INSTANT-SYNC] Adding task ${task.id} to calendar...`);
            
            // Use dueDate directly as scheduledTime - it already has the correct time from Notion
            // The dueDate from Notion is already in UTC representing the user's intended time
            const scheduledTime = task.scheduledTime || task.dueDate;
            
            // Get color based on importance
            const getColorForImportance = (importance: string | null | undefined): string => {
              switch (importance) {
                case 'Pareto':
                case 'High':
                  return '#ef4444'; // Red
                case 'Med-High':
                  return '#f97316'; // Orange
                case 'Medium':
                  return '#eab308'; // Yellow
                case 'Med-Low':
                  return '#3b82f6'; // Blue
                case 'Low':
                  return '#22c55e'; // Green
                default:
                  return '#9333ea'; // Purple (default)
              }
            };
            
            const calendarColor = task.calendarColor || getColorForImportance(task.importance);
            
            // Update task with scheduledTime and calendarColor first
            await storage.updateTask(task.id, { scheduledTime, calendarColor }, userId);
            
            // Now actually sync to Google Calendar
            const updatedTask = await storage.getTask(task.id, userId);
            if (updatedTask) {
              const syncResults = await googleCalendar.syncTasks([updatedTask], user, storage);
              if (syncResults.success > 0) {
                console.log(`✅ [INSTANT-SYNC] Task ${task.id} synced to Google Calendar`);
              } else {
                console.warn(`⚠️ [INSTANT-SYNC] Task ${task.id} failed to sync to Google Calendar`);
              }
            }
          }
        } catch (error: any) {
          console.error(`❌ [INSTANT-SYNC] Failed for task ${task.id}:`, error.message);
          // Don't throw - sync is optional, task is already created
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
      console.log(`📅 [PATCH TASK] Updating task ${id} with:`, JSON.stringify(updateData, (key, value) => {
        // Handle Date objects for logging
        if (value instanceof Date) return value.toISOString();
        return value;
      }));
      
      const task = await storage.updateTask(id, updateData, userId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      console.log(`📅 [PATCH TASK] Task ${id} updated. googleEventId: ${task.googleEventId}, googleCalendarId: ${task.googleCalendarId}`);
      
      // Track Google Calendar sync result
      let calendarSynced: boolean | null = null; // null = not attempted, true = success, false = failed
      let calendarSyncError: string | null = null;
      
      // If task has Google Calendar event and time/duration/scheduledTime changed, update it
      // Default googleCalendarId to 'primary' if missing
      if (task.googleEventId && 
          (updateData.dueDate !== undefined || updateData.duration !== undefined || updateData.scheduledTime !== undefined)) {
        try {
          const user = await storage.getUser(userId);
          // Check for per-user OAuth credentials OR legacy credentials
          const hasGoogleAuth = (user?.googleCalendarAccessToken && user?.googleCalendarRefreshToken) ||
                                (user?.googleAccessToken && user?.googleRefreshToken);
          
          if (user && hasGoogleAuth) {
            console.log(`📅 [PATCH TASK] Syncing task ${task.id} to Google Calendar`);
            console.log(`   - Task title: "${task.title}"`);
            console.log(`   - Google Event ID: ${task.googleEventId}`);
            console.log(`   - Google Calendar ID: ${task.googleCalendarId}`);
            console.log(`   - scheduledTime: ${task.scheduledTime} (type: ${typeof task.scheduledTime})`);
            console.log(`   - dueDate: ${task.dueDate} (type: ${typeof task.dueDate})`);
            console.log(`   - duration: ${task.duration} minutes`);
            const result = await googleCalendar.updateEvent(task, user);
            if (result) {
              console.log(`✅ [PATCH TASK] Successfully updated Google Calendar event`);
              console.log(`   - Google Event start: ${result.start?.dateTime}`);
              console.log(`   - Google Event end: ${result.end?.dateTime}`);
              calendarSynced = true;
            } else {
              console.log(`⚠️ [PATCH TASK] Google Calendar update returned null (no changes or event not found)`);
              calendarSynced = false;
              calendarSyncError = 'Event not found in Google Calendar or no time data';
            }
          } else {
            console.log(`⚠️ [PATCH TASK] No Google Calendar credentials found for user`);
            console.log(`   - googleCalendarAccessToken: ${!!user?.googleCalendarAccessToken}`);
            console.log(`   - googleCalendarRefreshToken: ${!!user?.googleCalendarRefreshToken}`);
            console.log(`   - googleAccessToken: ${!!user?.googleAccessToken}`);
            console.log(`   - googleRefreshToken: ${!!user?.googleRefreshToken}`);
            calendarSynced = false;
            calendarSyncError = 'Google Calendar not connected';
          }
        } catch (error: any) {
          console.error('❌ [PATCH TASK] Failed to update Google Calendar event:', error.message);
          console.error('❌ [PATCH TASK] Full error:', error);
          calendarSynced = false;
          calendarSyncError = error.message || 'Unknown error';
          // Don't fail the request if Google Calendar sync fails
        }
      } else {
        console.log(`📅 [PATCH TASK] No Google Calendar sync needed for task ${id}`);
        console.log(`   - Has googleEventId: ${!!task.googleEventId}`);
        console.log(`   - Has googleCalendarId: ${!!task.googleCalendarId}`);
        console.log(`   - updateData.dueDate: ${updateData.dueDate}`);
        console.log(`   - updateData.duration: ${updateData.duration}`);
        console.log(`   - updateData.scheduledTime: ${updateData.scheduledTime}`);
      }
      
      res.json({ ...task, calendarSynced, calendarSyncError });
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

      // Helper function to get color hex based on importance
      const getColorForImportance = (importance: string | null | undefined): string => {
        switch (importance) {
          case 'Pareto':
          case 'High':
            return '#ef4444'; // Red
          case 'Med-High':
            return '#f97316'; // Orange
          case 'Medium':
            return '#eab308'; // Yellow
          case 'Med-Low':
            return '#3b82f6'; // Blue
          case 'Low':
            return '#22c55e'; // Green
          default:
            return '#9333ea'; // Purple (default)
        }
      };

      // Second pass: add tasks to calendar
      for (const taskId of taskIds) {
        const task = tasks.find(t => t.id === taskId);
        
        // Skip if task doesn't exist, is completed, or has no due date
        if (!task || task.completed || !task.dueDate) {
          continue;
        }

        // Use dueDate directly as scheduledTime - it already has the correct time from Notion
        // The dueDate from Notion is already in UTC representing the user's intended time
        const scheduledTime = task.scheduledTime || task.dueDate;

        // Set calendarColor based on importance if not already set
        const calendarColor = task.calendarColor || getColorForImportance(task.importance);

        await storage.updateTask(taskId, { scheduledTime, calendarColor }, userId);
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

      // Get user for Google Calendar cleanup
      const user = await storage.getUserById(userId);
      const hasGoogleAuth = user && (
        (user.googleCalendarAccessToken && user.googleCalendarRefreshToken) || 
        (user.googleAccessToken && user.googleRefreshToken)
      );

      // Move all tasks to recycling bin
      for (const taskId of taskIds) {
        const task = await storage.getTask(taskId, userId);
        
        if (task && !task.completed) {
          // Delete from Google Calendar if the task has a linked event
          if (task.googleEventId && hasGoogleAuth) {
            try {
              await googleCalendar.deleteEvent(user!, task.googleEventId, task.googleCalendarId || 'primary');
              console.log(`✅ Deleted Google Calendar event ${task.googleEventId} for task "${task.title}"`);
            } catch (error: any) {
              console.error(`⚠️ Failed to delete GCal event for task "${task.title}": ${error.message}`);
              // Continue anyway - still move to recycling bin
            }
          }

          // Move to recycling bin without marking as complete (no gold/XP)
          const updatedTask = await storage.updateTask(taskId, {
            recycled: true,
            recycledAt: new Date(),
            recycledReason: 'deleted',
            googleEventId: null,
            googleCalendarId: null,
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

  // Unschedule a task from calendar (removes from calendar but keeps the quest)
  app.post("/api/tasks/:id/unschedule", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const id = parseInt(req.params.id);
      const { removeFromGoogleCalendar } = req.body;

      console.log(`📅 [UNSCHEDULE] Starting unschedule for task ${id}, removeFromGoogleCalendar: ${removeFromGoogleCalendar}`);

      // Get the task first
      const task = await storage.getTask(id, userId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      console.log(`📅 [UNSCHEDULE] Task found: "${task.title}", scheduledTime: ${task.scheduledTime}, googleEventId: ${task.googleEventId}`);

      // If task has a Google Calendar event and user wants to remove it
      if (removeFromGoogleCalendar && task.googleEventId) {
        const user = await storage.getUserById(userId);
        // Check for either per-user OAuth credentials OR legacy credentials
        const hasGoogleAuth = (user?.googleCalendarAccessToken && user?.googleCalendarRefreshToken) || 
                              (user?.googleAccessToken && user?.googleRefreshToken);
        
        if (hasGoogleAuth) {
          try {
            await googleCalendar.deleteEvent(user!, task.googleEventId, task.googleCalendarId || 'primary');
            console.log(`✅ Deleted Google Calendar event ${task.googleEventId}`);
          } catch (error: any) {
            console.error(`⚠️ Failed to delete Google Calendar event: ${error.message}`);
            // Continue anyway - we still want to unschedule locally
          }
        } else {
          console.log(`⚠️ No Google Calendar credentials found, skipping Google Calendar delete`);
        }
      }

      // Clear the scheduled time and Google event ID (but keep the task!)
      console.log(`📅 [UNSCHEDULE] Updating task ${id} with scheduledTime: null, googleEventId: null`);
      const updatedTask = await storage.updateTask(id, {
        scheduledTime: null,
        googleEventId: null,
        googleCalendarId: null,
      }, userId);

      console.log(`📅 [UNSCHEDULE] Updated task result: scheduledTime: ${updatedTask?.scheduledTime}, googleEventId: ${updatedTask?.googleEventId}`);

      res.json({ 
        success: true, 
        message: "Task removed from calendar but still available in Quests",
        task: updatedTask 
      });
    } catch (error) {
      console.error("Task unschedule error:", error);
      res.status(500).json({ error: "Failed to unschedule task" });
    }
  });

  app.delete("/api/tasks/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const id = parseInt(req.params.id);

      // Delete from Google Calendar if the task has a linked event
      const task = await storage.getTask(id, userId);
      if (task?.googleEventId) {
        const user = await storage.getUserById(userId);
        const hasGoogleAuth = user && (
          (user.googleCalendarAccessToken && user.googleCalendarRefreshToken) || 
          (user.googleAccessToken && user.googleRefreshToken)
        );
        if (hasGoogleAuth) {
          try {
            await googleCalendar.deleteEvent(user!, task.googleEventId, task.googleCalendarId || 'primary');
            console.log(`✅ Deleted Google Calendar event ${task.googleEventId} during task delete`);
          } catch (error: any) {
            console.error(`⚠️ Failed to delete GCal event during task delete: ${error.message}`);
          }
        }
      }

      const success = await storage.deleteTask(id, userId);
      if (!success) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Also clear the googleEventId so it's not orphaned
      if (task?.googleEventId) {
        await storage.updateTask(id, { googleEventId: null, googleCalendarId: null }, userId);
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

      // Get the task first to check for Google Calendar event
      const task = await storage.getTask(id, userId);
      if (task?.googleEventId) {
        const user = await storage.getUserById(userId);
        const hasGoogleAuth = user && (
          (user.googleCalendarAccessToken && user.googleCalendarRefreshToken) || 
          (user.googleAccessToken && user.googleRefreshToken)
        );
        if (hasGoogleAuth) {
          try {
            await googleCalendar.deleteEvent(user!, task.googleEventId, task.googleCalendarId || 'primary');
            console.log(`✅ Deleted Google Calendar event ${task.googleEventId} during permanent delete`);
          } catch (error: any) {
            console.error(`⚠️ Failed to delete GCal event during permanent delete: ${error.message}`);
          }
        }
      }

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

      // Delete Google Calendar events for any tasks that have them
      const user = await storage.getUserById(userId);
      const hasGoogleAuth = user && (
        (user.googleCalendarAccessToken && user.googleCalendarRefreshToken) || 
        (user.googleAccessToken && user.googleRefreshToken)
      );

      if (hasGoogleAuth) {
        for (const taskId of taskIds) {
          try {
            const task = await storage.getTask(taskId, userId);
            if (task?.googleEventId) {
              await googleCalendar.deleteEvent(user!, task.googleEventId, task.googleCalendarId || 'primary');
              console.log(`✅ Deleted Google Calendar event ${task.googleEventId} for task "${task.title}"`);
            }
          } catch (error: any) {
            console.error(`⚠️ Failed to delete GCal event for task ${taskId}: ${error.message}`);
            // Continue - still permanently delete the task
          }
        }
      }

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
      const { includeDuplicates = true, deleteAll = false } = req.body;
      const user = await storage.getUserById(userId);
      
      if (!user?.notionApiKey || !user?.notionDatabaseId) {
        return res.status(400).json({ error: "Notion API key or database ID not configured" });
      }
      
      const notionTasks = await getTasks(user.notionDatabaseId, user.notionApiKey);
      
      // If deleteAll is true, permanently delete all existing tasks before importing
      // This makes "Import ALL" actually replace all tasks as the UI promises
      if (deleteAll) {
        const allExistingTasks = await storage.getTasks(userId);
        if (allExistingTasks.length > 0) {
          // Delete Google Calendar events for tasks that have them
          const hasGoogleAuth = user && (
            (user.googleCalendarAccessToken && user.googleCalendarRefreshToken) || 
            (user.googleAccessToken && user.googleRefreshToken)
          );
          if (hasGoogleAuth) {
            for (const t of allExistingTasks) {
              if ((t as any).googleEventId) {
                try {
                  await googleCalendar.deleteEvent(user!, (t as any).googleEventId, (t as any).googleCalendarId || 'primary');
                  console.log(`✅ [NOTION-IMPORT] Deleted GCal event ${(t as any).googleEventId}`);
                } catch (error: any) {
                  console.error(`⚠️ [NOTION-IMPORT] Failed to delete GCal event: ${error.message}`);
                }
              }
            }
          }

          const taskIds = allExistingTasks.map((t: any) => t.id);
          const deletedCount = await storage.permanentlyDeleteTasks(taskIds, userId);
          console.log(`🗑️ [NOTION-IMPORT] Permanently deleted ${deletedCount} existing tasks before full import`);
        }
      }
      
      // ALWAYS get existing tasks to check for notionId matches for updating
      const existingTasks = await storage.getTasks(userId);
      // Map notionId -> task for quick lookup
      const existingTasksByNotionId = new Map<string, any>(
        existingTasks
          .filter((task: any) => task.notionId)
          .map((task: any) => [task.notionId, task])
      );
      
      let importedCount = 0;
      let updatedCount = 0;
      const importedTaskIds: number[] = []; // Track imported task IDs for undo
      const updatedTaskIds: number[] = []; // Track updated task IDs

      for (const notionTask of notionTasks) {
        try {
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
            businessWorkFilter: notionTask.businessWorkFilter || null,
            campaign: notionTask.campaign || "unassigned",
            googleEventId: notionTask.googleEventId || null, // Import Google Calendar Event ID if present
            apple: notionTask.apple,
            smartPrep: notionTask.smartPrep,
            delegationTask: notionTask.delegationTask,
            velin: notionTask.velin,
          };

          // Check if this task already exists in our database
          const existingTask = existingTasksByNotionId.get(notionTask.notionId);
          
          if (existingTask) {
            // UPDATE existing task with new data from Notion
            // This ensures date changes, title changes, etc. are synced
            // IMPORTANT: Don't overwrite scheduledTime if it was intentionally cleared (null)
            // Only update scheduledTime if:
            // 1. The existing task already has a scheduledTime (user wants it scheduled), OR
            // 2. The due date actually changed (need to sync the new date)
            const dueDateChanged = existingTask.dueDate?.getTime() !== notionTask.dueDate?.getTime();
            const shouldUpdateScheduledTime = existingTask.scheduledTime !== null && dueDateChanged;
            
            const updateData: any = {
              title: notionTask.title,
              description: notionTask.description,
              details: notionTask.details,
              duration: notionTask.duration,
              goldValue: notionTask.goldValue,
              dueDate: notionTask.dueDate,
              importance: notionTask.importance,
              kanbanStage: notionTask.kanbanStage,
              recurType: notionTask.recurType,
              businessWorkFilter: notionTask.businessWorkFilter || null,
              campaign: notionTask.campaign || "unassigned",
              googleEventId: notionTask.googleEventId || existingTask.googleEventId, // Preserve existing if not in Notion
              apple: notionTask.apple,
              smartPrep: notionTask.smartPrep,
              delegationTask: notionTask.delegationTask,
              velin: notionTask.velin,
            };
            
            // Only update scheduledTime if it was already set and the due date changed
            if (shouldUpdateScheduledTime) {
              updateData.scheduledTime = notionTask.dueDate;
              console.log(`📝 [NOTION-IMPORT] Updating scheduledTime for "${notionTask.title}" because due date changed`);
            } else if (existingTask.scheduledTime === null) {
              console.log(`📝 [NOTION-IMPORT] Preserving null scheduledTime for "${notionTask.title}" (was unscheduled)`);
            }
            
            await storage.updateTask(existingTask.id, updateData, userId);
            updatedTaskIds.push(existingTask.id);
            updatedCount++;
            console.log(`📝 [NOTION-IMPORT] Updated existing task: "${notionTask.title}" (ID: ${existingTask.id}) with new due date: ${notionTask.dueDate}`);
          } else {
            // Skip creating new tasks if user chose to skip duplicates and we're doing a sync
            // (Note: this path is for truly NEW tasks from Notion, not duplicates)
            if (!includeDuplicates) {
              // When not including duplicates, we still want to create tasks that don't exist yet
              // The "includeDuplicates" flag is a bit of a misnomer - it really means "create new tasks"
            }
            
            // Create new task
            const createdTask = await storage.createTask(taskData);
            if (createdTask && createdTask.id) {
              importedTaskIds.push(createdTask.id);
            }
            importedCount++;
            console.log(`✨ [NOTION-IMPORT] Created new task: "${notionTask.title}"`);
          }
        } catch (error) {
          console.error("Error importing task:", error);
        }
      }

      res.json({ 
        success: true, 
        count: importedCount, 
        updatedCount,
        importedTaskIds,
        updatedTaskIds
      });
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

  // Disconnect Google Calendar (per-user OAuth credentials)
  app.post("/api/google-calendar/disconnect", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      console.log('🔌 [DISCONNECT] Disconnecting Google Calendar for user:', userId);
      
      // Clear all Google Calendar settings including credentials
      await storage.updateGoogleCalendarSettings(userId, {
        googleCalendarClientId: '',
        googleCalendarClientSecret: '',
        googleCalendarAccessToken: '',
        googleCalendarRefreshToken: '',
        googleCalendarTokenExpiry: undefined,
        googleCalendarSyncEnabled: false,
      });
      
      console.log('✅ [DISCONNECT] Google Calendar disconnected successfully');
      res.json({ success: true, message: "Google Calendar disconnected successfully" });
    } catch (error) {
      console.error("❌ [DISCONNECT] Google Calendar disconnect error:", error);
      res.status(500).json({ error: "Failed to disconnect Google Calendar" });
    }
  });

  // Calendar integration routes
  app.post("/api/calendar/sync", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      console.log('📅 [CALENDAR SYNC API] Starting sync for user:', userId);
      
      const user = await storage.getUserById(userId);
      
      // Check if Google Calendar is configured (not checking tokens here, let the service handle it)
      if (!user) {
        console.log('❌ [CALENDAR SYNC API] User not found');
        return res.status(400).json({ 
          error: "User not found",
          needsAuth: true 
        });
      }

      console.log('📅 [CALENDAR SYNC API] User Google Calendar credentials:');
      console.log('   - googleCalendarSyncEnabled:', user.googleCalendarSyncEnabled);
      console.log('   - googleCalendarClientId:', !!user.googleCalendarClientId);
      console.log('   - googleCalendarAccessToken:', !!user.googleCalendarAccessToken);
      console.log('   - Legacy googleAccessToken:', !!user.googleAccessToken);
      console.log('   - Sync Direction:', user.googleCalendarSyncDirection);

      const tasks = await storage.getTasks(userId);
      const { selectedTasks } = req.body;
      
      console.log('📅 [CALENDAR SYNC API] Selected tasks:', selectedTasks);
      console.log('📅 [CALENDAR SYNC API] Total tasks in DB:', tasks.length);
      
      const tasksToSync = tasks.filter(task => 
        selectedTasks.includes(task.id) && 
        task.dueDate && 
        !task.completed
      );

      console.log('📅 [CALENDAR SYNC API] Tasks to sync after filtering:', tasksToSync.length);
      tasksToSync.forEach(t => {
        console.log(`   - Task ${t.id}: "${t.title}" due: ${t.dueDate} (ISO: ${t.dueDate ? new Date(t.dueDate).toISOString() : 'null'}), scheduled: ${t.scheduledTime} (ISO: ${t.scheduledTime ? new Date(t.scheduledTime).toISOString() : 'null'}), completed: ${t.completed}`);
      });

      // Helper function to get color hex based on importance
      const getColorForImportance = (importance: string | null | undefined): string => {
        switch (importance) {
          case 'Pareto':
          case 'High':
            return '#ef4444'; // Red
          case 'Med-High':
            return '#f97316'; // Orange
          case 'Medium':
            return '#eab308'; // Yellow
          case 'Med-Low':
            return '#3b82f6'; // Blue
          case 'Low':
            return '#22c55e'; // Green
          default:
            return '#9333ea'; // Purple (default)
        }
      };

      // First, set scheduledTime and calendarColor on all tasks being synced
      // This ensures they appear correctly in the app calendar
      for (const task of tasksToSync) {
        // Use existing scheduledTime or fall back to the dueDate
        // Don't use setHours(9,0,0,0) as that creates UTC time issues
        const scheduledTime = task.scheduledTime || new Date(task.dueDate!);
        const calendarColor = task.calendarColor || getColorForImportance(task.importance);
        
        await storage.updateTask(task.id, { scheduledTime, calendarColor }, userId);
        // Update the task object in memory too for the Google sync
        task.scheduledTime = scheduledTime;
        task.calendarColor = calendarColor;
      }

      let exportResults = { success: 0, failed: 0, created: 0, updated: 0, eventIds: new Map<number, string>() };
      let importResults = { updated: 0, errors: 0 };
      
      const syncDirection = user.googleCalendarSyncDirection || 'export';

      // Export tasks to Google Calendar (if direction is 'export' or 'both')
      if (syncDirection === 'export' || syncDirection === 'both') {
        if (tasksToSync.length > 0) {
          exportResults = await googleCalendar.syncTasks(tasksToSync, user, storage);
          console.log('✅ [CALENDAR SYNC API] Export complete:', exportResults);
        }
      }

      // Import from Google Calendar (if direction is 'import' or 'both')
      if (syncDirection === 'import' || syncDirection === 'both') {
        importResults = await googleCalendar.importEventsToTasks(user, storage);
        console.log('✅ [CALENDAR SYNC API] Import complete:', importResults);
      }
      
      res.json({ 
        success: true, 
        exported: exportResults.success,
        exportFailed: exportResults.failed,
        created: exportResults.created,
        updated: exportResults.updated,
        imported: importResults.updated,
        importErrors: importResults.errors,
        total: tasksToSync.length,
        syncDirection
      });
    } catch (error: any) {
      console.error("❌ [CALENDAR SYNC API] Error:", error.message);
      console.error("❌ [CALENDAR SYNC API] Stack:", error.stack);
      
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
        scope: [
          'https://www.googleapis.com/auth/calendar.events',
          'https://www.googleapis.com/auth/calendar.readonly'
        ],
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

      const syncDirection = user.googleCalendarSyncDirection || 'both';
      console.log('📅 [SYNC] Sync direction:', syncDirection);

      let exportResults = { success: 0, failed: 0, created: 0, updated: 0, eventIds: new Map<number, string>() };
      let importResults = { updated: 0, errors: 0 };

      // Export tasks to Google Calendar (if direction is 'export' or 'both')
      if (syncDirection === 'export' || syncDirection === 'both') {
        console.log('📅 [SYNC] Exporting tasks to Google Calendar...');
        
        // Get all tasks that have been explicitly scheduled (have scheduledTime)
        // Only tasks with scheduledTime should sync to Google Calendar
        // Tasks without scheduledTime are not on the calendar yet
        const allTasks = await storage.getTasks(userId);
        const tasksToExport = allTasks.filter((task: any) => 
          task.scheduledTime && task.dueDate && !task.completed
        );
        
        console.log(`📅 [SYNC] Found ${tasksToExport.length} scheduled tasks to export (out of ${allTasks.length} total tasks)`);
        
        if (tasksToExport.length > 0) {
          exportResults = await googleCalendar.syncTasks(tasksToExport, user, storage);
          console.log('✅ [SYNC] Export complete:', exportResults.success, 'succeeded,', exportResults.failed, 'failed');
        }
      }

      // Import from Google Calendar (if direction is 'import' or 'both')
      if (syncDirection === 'import' || syncDirection === 'both') {
        console.log('📅 [SYNC] Importing events from Google Calendar...');
        importResults = await googleCalendar.importEventsToTasks(user, storage);
        console.log('✅ [SYNC] Import complete:', importResults.updated, 'updated,', importResults.errors, 'errors');
      }

      // Update last sync timestamp
      await storage.updateGoogleCalendarSettings(userId, {
        googleCalendarLastSync: new Date()
      });

      res.json({ 
        success: true,
        exported: exportResults.success,
        exportFailed: exportResults.failed,
        created: exportResults.created,
        updated: exportResults.updated,
        imported: importResults.updated,
        importErrors: importResults.errors,
        syncDirection,
        message: `Sync complete! Exported ${exportResults.success} tasks (${exportResults.created} new, ${exportResults.updated} updated), imported ${importResults.updated} events.`
      });
    } catch (error: any) {
      console.error("❌ [SYNC] Error during Google Calendar sync:", error);
      console.error("❌ [SYNC] Error stack:", error.stack);
      
      // Check for token expiration/revocation errors
      const errorMessage = error.message || '';
      const errorResponse = error.response?.data;
      
      if (errorMessage.includes('invalid_grant') || 
          errorResponse?.error === 'invalid_grant' ||
          errorMessage.includes('Token has been expired or revoked')) {
        return res.status(401).json({ 
          error: "Your Google Calendar authorization has expired. Please disconnect and reconnect your Google account.",
          needsReauth: true
        });
      }
      
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

  // Clear all synced events from Google Calendar and reset task googleEventIds
  app.post("/api/google-calendar/clear-all", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUserById(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      console.log('🗑️ [CLEAR ALL] Starting bulk delete of Google Calendar events...');

      // Get all tasks with Google Event IDs
      const allTasks = await storage.getTasks(userId);
      const tasksWithGoogleEvents = allTasks.filter((task: any) => task.googleEventId);

      console.log(`🗑️ [CLEAR ALL] Found ${tasksWithGoogleEvents.length} tasks with Google Event IDs`);

      let deletedCount = 0;
      let failedCount = 0;
      let clearedCount = 0;

      // Check if user has Google Calendar credentials
      const hasGoogleAuth = (user.googleCalendarAccessToken && user.googleCalendarRefreshToken) || 
                            (user.googleAccessToken && user.googleRefreshToken);

      if (hasGoogleAuth) {
        // Delete events from Google Calendar
        for (const task of tasksWithGoogleEvents) {
          try {
            await googleCalendar.deleteEvent(user, task.googleEventId!, task.googleCalendarId || 'primary');
            deletedCount++;
            console.log(`✅ [CLEAR ALL] Deleted event ${task.googleEventId} for task ${task.id}`);
          } catch (error: any) {
            console.error(`⚠️ [CLEAR ALL] Failed to delete event ${task.googleEventId}: ${error.message}`);
            failedCount++;
          }
        }
      } else {
        console.log('⚠️ [CLEAR ALL] No Google Calendar credentials, skipping delete from Google');
        failedCount = tasksWithGoogleEvents.length;
      }

      // Clear googleEventId and googleCalendarId from all tasks (regardless of delete success)
      for (const task of tasksWithGoogleEvents) {
        try {
          await storage.updateTask(task.id, {
            googleEventId: null,
            googleCalendarId: null,
          }, userId);
          clearedCount++;
        } catch (error: any) {
          console.error(`⚠️ [CLEAR ALL] Failed to clear task ${task.id}: ${error.message}`);
        }
      }

      console.log(`🗑️ [CLEAR ALL] Complete: ${deletedCount} deleted from Google, ${failedCount} failed, ${clearedCount} task references cleared`);

      res.json({
        success: true,
        deletedFromGoogle: deletedCount,
        failedToDelete: failedCount,
        clearedFromTasks: clearedCount,
        message: `Cleared ${clearedCount} task references. Deleted ${deletedCount} events from Google Calendar.`
      });
    } catch (error: any) {
      console.error("Error clearing Google Calendar events:", error);
      res.status(500).json({ error: error.message || "Failed to clear Google Calendar events" });
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
        
        // Don't automatically disable sync on errors - let the user decide
        // The OAuth refresh token will handle token expiration automatically
        // Only log the error for debugging purposes
        console.log('⚠️ [CALENDAR] Sync remains enabled - user can re-authorize if needed');
      }

      // Also fetch ProductivityQuest tasks for this month
      // Only show tasks that have been explicitly scheduled (have scheduledTime)
      const tasks = await storage.getTasks(userId);
      console.log(`📅 [CALENDAR-EVENTS] Total tasks fetched: ${tasks.length}`);
      
      const tasksWithScheduledTime = tasks.filter(task => task.scheduledTime);
      console.log(`📅 [CALENDAR-EVENTS] Tasks with scheduledTime: ${tasksWithScheduledTime.length}`);
      
      const tasksInMonth = tasks.filter(task => {
        // Only show tasks that have a scheduledTime (explicitly added to calendar)
        if (!task.scheduledTime) return false;
        const scheduledDate = new Date(task.scheduledTime);
        return scheduledDate >= startDate && scheduledDate <= endDate;
      });
      
      console.log(`📅 [CALENDAR-EVENTS] Tasks in month with scheduledTime: ${tasksInMonth.length}`);
      tasksInMonth.forEach(t => {
        const st = t.scheduledTime ? new Date(t.scheduledTime) : null;
        console.log(`   📅 Task ${t.id}: "${t.title}" scheduledTime: ${st?.toISOString()} (local: ${st?.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}), dueDate: ${t.dueDate ? new Date(t.dueDate).toISOString() : 'null'}`);
      });

      // Create a set of Google Event IDs that belong to ProductivityQuest tasks
      // This prevents showing duplicates - we show the PQ task, not the Google event
      const pqGoogleEventIds = new Set<string>();
      for (const task of tasksInMonth) {
        if (task.googleEventId) {
          pqGoogleEventIds.add(task.googleEventId);
        }
      }
      
      // Also create a set of task IDs that are scheduled (to check description)
      const scheduledTaskIds = new Set<number>();
      for (const task of tasksInMonth) {
        scheduledTaskIds.add(task.id);
      }
      
      // Create a set of ALL task IDs (scheduled or not) to filter out orphaned Google Calendar events
      // These are events that were created by PQ but the task was unscheduled
      const allTaskIds = new Set<number>();
      for (const task of tasks) {
        allTaskIds.add(task.id);
      }

      // Combine Google Calendar events and ProductivityQuest tasks
      const events: any[] = [];

      // Add Google Calendar events (excluding those created by ProductivityQuest)
      for (const gEvent of googleEvents) {
        // Skip if this Google event was created by a ProductivityQuest task (by googleEventId)
        if (pqGoogleEventIds.has(gEvent.id)) {
          console.log(`📅 [CALENDAR] Skipping duplicate Google event ${gEvent.id} - already shown as PQ task`);
          continue;
        }
        
        // Check if the description contains a ProductivityQuest Task ID
        const description = gEvent.description || '';
        const taskIdMatch = description.match(/ProductivityQuest Task ID:\s*(\d+)/);
        if (taskIdMatch) {
          const taskId = parseInt(taskIdMatch[1], 10);
          
          // If this task exists in our database (regardless of scheduled status),
          // this is an orphaned Google Calendar event that should be deleted
          if (allTaskIds.has(taskId)) {
            // Check if the task is unscheduled (scheduledTime is null)
            const task = tasks.find(t => t.id === taskId);
            if (task && !task.scheduledTime) {
              console.log(`📅 [CALENDAR] Found orphaned Google event for unscheduled PQ Task ID ${taskId} - "${gEvent.summary}" - deleting from Google Calendar`);
              
              // Delete the orphaned event from Google Calendar in the background
              try {
                await googleCalendar.deleteEvent(user!, gEvent.id, gEvent.calendarId || 'primary');
                console.log(`✅ [CALENDAR] Deleted orphaned Google Calendar event ${gEvent.id}`);
              } catch (deleteError: any) {
                console.warn(`⚠️ [CALENDAR] Failed to delete orphaned event: ${deleteError.message}`);
              }
              
              continue;
            }
            
            // If task is scheduled, skip to avoid duplicate
            if (scheduledTaskIds.has(taskId)) {
              console.log(`📅 [CALENDAR] Skipping duplicate Google event - contains PQ Task ID ${taskId} which is already scheduled`);
              continue;
            }
          }
        }
        
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

      // Add ProductivityQuest tasks (only those with scheduledTime)
      for (const task of tasksInMonth) {
        // Use scheduledTime directly (we already filtered for it above)
        const startTime = new Date(task.scheduledTime!);
        
        // Debug logging for timezone issues
        if (task.title.includes('Cardio')) {
          console.log('🔍 [DEBUG] Cardio task scheduledTime:', task.scheduledTime);
          console.log('🔍 [DEBUG] Cardio startTime object:', startTime);
          console.log('🔍 [DEBUG] Cardio startTime.toISOString():', startTime.toISOString());
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

  app.patch("/api/campaigns/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const campaignId = parseInt(req.params.id);
      const { quests, rewards, progress, isActive, title, description, icon } = req.body;

      const updates: any = {};
      if (quests !== undefined) updates.quests = quests;
      if (rewards !== undefined) updates.rewards = rewards;
      if (progress !== undefined) updates.progress = progress;
      if (isActive !== undefined) updates.isActive = isActive;
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (icon !== undefined) updates.icon = icon;

      const updated = await storage.updateCampaign(userId, campaignId, updates);
      if (!updated) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating campaign:", error);
      res.status(500).json({ error: "Failed to update campaign" });
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

  // Finances routes
  app.get("/api/finances", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const items = await storage.getFinancialItems(userId);
      res.json(items);
    } catch (error: any) {
      console.error("Error fetching financial items:", error);
      res.status(500).json({ error: "Failed to fetch financial items" });
    }
  });

  app.post("/api/finances", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { item, category, monthlyCost, recurType } = req.body;

      if (!item || !category || monthlyCost === undefined || !recurType) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const newItem = await storage.createFinancialItem({
        userId,
        item,
        category,
        monthlyCost,
        recurType
      });

      res.json(newItem);
    } catch (error: any) {
      console.error("Error creating financial item:", error);
      res.status(500).json({ error: "Failed to create financial item" });
    }
  });

  app.delete("/api/finances/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const itemId = parseInt(req.params.id);

      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      await storage.deleteFinancialItem(userId, itemId);
      res.json({ message: "Financial item deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting financial item:", error);
      res.status(500).json({ error: "Failed to delete financial item" });
    }
  });

  // ============================================
  // ML Task Sorting Endpoints
  // ============================================

  // Import ML sorting service
  const { sortTasksML, learnFromFeedback, mergePreferences, DEFAULT_PREFERENCES } = await import("./ml-sorting");
  type BlockedTimeSlot = import("./ml-sorting").BlockedTimeSlot;

  // Get user's ML sorting preferences
  app.get("/api/ml/preferences", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const preferences = await storage.getMlSortingPreferences(userId);
      res.json(preferences || DEFAULT_PREFERENCES);
    } catch (error: any) {
      console.error("Error fetching ML preferences:", error);
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  // Sort tasks for a specific date using ML
  app.post("/api/ml/sort-tasks", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { date, taskIds, timezoneOffset } = req.body;

      console.log('📊 [ML-SORT-API] Received request:', { date, taskIds, timezoneOffset });
      console.log('📊 [ML-SORT-API] Raw date string received:', date);

      if (!date) {
        return res.status(400).json({ error: "Date is required" });
      }

      // Parse the date string - frontend sends "YYYY-MM-DD" format (local date)
      // Also receives timezoneOffset in minutes (e.g., PST = 480, meaning UTC-8)
      let targetYear: number, targetMonth: number, targetDay: number;
      const tzOffset = timezoneOffset || 0; // default to UTC if not provided
      
      if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // New format: "2025-12-28" - extract directly
        const [yearStr, monthStr, dayStr] = date.split('-');
        targetYear = parseInt(yearStr, 10);
        targetMonth = parseInt(monthStr, 10) - 1; // Convert to 0-indexed
        targetDay = parseInt(dayStr, 10);
        console.log(`📊 [ML-SORT-API] Parsed local date components: Y=${targetYear} M=${targetMonth} D=${targetDay}`);
      } else {
        // Legacy format: ISO string - parse and use UTC (for backward compatibility)
        const parsedDate = new Date(date);
        targetYear = parsedDate.getUTCFullYear();
        targetMonth = parsedDate.getUTCMonth();
        targetDay = parsedDate.getUTCDate();
        console.log(`📊 [ML-SORT-API] Parsed ISO date to UTC: Y=${targetYear} M=${targetMonth} D=${targetDay}`);
      }

      console.log(`📊 [ML-SORT-API] Looking for tasks on LOCAL date: ${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`);
      console.log(`📊 [ML-SORT-API] User timezone offset: ${tzOffset} minutes (UTC${tzOffset >= 0 ? '-' : '+'}${Math.abs(tzOffset / 60)})`);

      // Create a target date object for use in sorting (midnight LOCAL on target day)
      // We'll use this as the anchor for scheduling
      const targetDate = new Date(Date.UTC(targetYear, targetMonth, targetDay, 0, 0, 0));

      // Get all tasks for this user
      const allTasks = await storage.getTasks(userId);
      console.log('📊 [ML-SORT-API] Total tasks for user:', allTasks.length);
      
      // Filter to only tasks for this specific date (or specified task IDs)
      // We need to match tasks that would DISPLAY on the user's local date
      let tasksToSort = allTasks.filter(task => {
        if (taskIds && taskIds.length > 0) {
          return taskIds.includes(task.id);
        }
        
        // Filter tasks for the target date - must have scheduledTime
        if (!task.scheduledTime) return false;
        
        const taskDate = new Date(task.scheduledTime);
        
        // Convert to user's local date by applying their timezone offset
        // The scheduledTime is in UTC, but we want to know what LOCAL date it displays as
        const taskLocalTime = new Date(taskDate.getTime() - tzOffset * 60000);
        const tYear = taskLocalTime.getUTCFullYear();
        const tMonth = taskLocalTime.getUTCMonth();
        const tDay = taskLocalTime.getUTCDate();
        
        const matches = tYear === targetYear && tMonth === targetMonth && tDay === targetDay;
        
        if (matches) {
          console.log(`📊 [ML-SORT-API] Found task for date: "${task.title}" (${task.importance}) at ${task.scheduledTime} (local: ${taskLocalTime.toISOString()})`);
        }
        return matches;
      });

      console.log('📊 [ML-SORT-API] Tasks to sort:', tasksToSort.length);
      console.log(`📊 [ML-SORT-API] Target date (UTC): ${targetDate.toISOString()}`);

      // Convert to sorting format
      const tasksForSorting = tasksToSort.map(task => {
        const startTime = task.scheduledTime ? new Date(task.scheduledTime) : null;
        const endTime = startTime ? new Date(startTime.getTime() + (task.duration || 60) * 60000) : null;
        
        return {
          id: task.id,
          title: task.title,
          duration: task.duration || 60,
          importance: task.importance || 'Medium',
          currentStartTime: startTime?.toISOString(),
          currentEndTime: endTime?.toISOString(),
        };
      });

      console.log('📊 [ML-SORT-API] Tasks for sorting:', JSON.stringify(tasksForSorting, null, 2));

      // Get user preferences (or use defaults)
      const storedPrefs = await storage.getMlSortingPreferences(userId);
      const preferences = mergePreferences(storedPrefs, {});

      // Get the original schedule before sorting
      const originalSchedule = tasksForSorting.map(task => ({
        taskId: task.id,
        startTime: task.currentStartTime || new Date(targetDate).toISOString(),
        endTime: task.currentEndTime || new Date(new Date(targetDate).getTime() + 60 * 60 * 1000).toISOString(),
      }));

      // Fetch Google Calendar events for the target date to use as blocked time slots
      // This prevents the sort from scheduling PQ tasks on top of existing calendar events
      const blockedSlots: BlockedTimeSlot[] = [];
      const taskIdsBeingSorted = new Set(tasksForSorting.map(t => t.id));
      
      try {
        const user = await storage.getUserById(userId);
        if (user?.googleCalendarSyncEnabled && user?.googleCalendarAccessToken) {
          // Create start/end of the target day
          const dayStart = new Date(Date.UTC(targetYear, targetMonth, targetDay, 0, 0, 0));
          const dayEnd = new Date(Date.UTC(targetYear, targetMonth, targetDay, 23, 59, 59));
          
          const googleEvents = await googleCalendar.getEvents(user, dayStart, dayEnd);
          console.log(`📊 [ML-SORT-API] Found ${googleEvents.length} Google Calendar events for the day`);
          
          for (const gEvent of googleEvents) {
            const startStr = gEvent.start?.dateTime || gEvent.start?.date;
            const endStr = gEvent.end?.dateTime || gEvent.end?.date;
            if (!startStr || !endStr) continue;
            
            // Skip events that are actually PQ tasks we're sorting
            // (identified by description containing ProductivityQuest Task ID)
            const description = gEvent.description || '';
            const taskIdMatch = description.match(/ProductivityQuest Task ID:\s*(\d+)/);
            if (taskIdMatch) {
              const linkedTaskId = parseInt(taskIdMatch[1], 10);
              if (taskIdsBeingSorted.has(linkedTaskId)) {
                console.log(`📊 [ML-SORT-API] Skipping blocked slot for PQ task being sorted: "${gEvent.summary}" (Task ${linkedTaskId})`);
                continue;
              }
            }
            
            blockedSlots.push({
              start: new Date(startStr),
              end: new Date(endStr),
              title: gEvent.summary || 'Google Event',
            });
          }
          
          console.log(`📊 [ML-SORT-API] ${blockedSlots.length} blocked time slots from Google Calendar`);
        }
      } catch (error: any) {
        console.warn(`⚠️ [ML-SORT-API] Could not fetch Google Calendar events for blocked slots: ${error.message}`);
        // Continue without blocked slots - sort will still work, just won't avoid Google events
      }

      // Run the ML sorting algorithm with timezone offset and blocked slots
      const sortedSchedule = sortTasksML(tasksForSorting, targetDate, preferences, tzOffset, blockedSlots);

      // Return both the original and sorted schedules for comparison
      res.json({
        success: true,
        originalSchedule,
        sortedSchedule,
        taskMetadata: tasksForSorting.map(t => ({
          taskId: t.id,
          title: t.title,
          priority: t.importance,
          duration: t.duration,
        })),
        preferences: {
          startHour: preferences.preferredStartHour,
          endHour: preferences.preferredEndHour,
          breakDuration: preferences.breakDuration,
          highPriorityTimePreference: preferences.highPriorityTimePreference,
        },
      });
    } catch (error: any) {
      console.error("Error sorting tasks:", error);
      res.status(500).json({ error: "Failed to sort tasks" });
    }
  });

  // Apply the sorted schedule to actual tasks
  app.post("/api/ml/apply-sort", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { sortedSchedule } = req.body;

      console.log('📊 [ML-APPLY] Received sorted schedule:', JSON.stringify(sortedSchedule, null, 2));

      if (!sortedSchedule || !Array.isArray(sortedSchedule)) {
        return res.status(400).json({ error: "Sorted schedule is required" });
      }

      // Get user for Google Calendar sync
      const user = await storage.getUserById(userId);
      const hasGoogleAuth = user && (
        (user.googleCalendarAccessToken && user.googleCalendarRefreshToken) || 
        (user.googleAccessToken && user.googleRefreshToken)
      );

      // Update each task with its new scheduled time
      const updates = [];
      const googleCalendarUpdates: Array<{ task: any; action: 'update' | 'create' }> = [];
      
      for (const item of sortedSchedule) {
        console.log(`📊 [ML-APPLY] Updating task ${item.taskId} to start at ${item.startTime}`);
        const task = await storage.getTask(item.taskId, userId);
        if (task && task.userId === userId) {
          const newScheduledTime = new Date(item.startTime);
          console.log(`📊 [ML-APPLY] Task ${item.taskId} "${task.title}" - old time: ${task.scheduledTime}, new time: ${newScheduledTime}`);
          const updatedTask = await storage.updateTask(item.taskId, { scheduledTime: newScheduledTime }, userId);
          
          // Verify the update
          const verifyTask = await storage.getTask(item.taskId, userId);
          console.log(`📊 [ML-APPLY] Task ${item.taskId} VERIFIED - scheduledTime is now: ${verifyTask?.scheduledTime}`);
          
          updates.push({ taskId: item.taskId, newTime: item.startTime });
          console.log(`📊 [ML-APPLY] Task ${item.taskId} updated successfully`);
          
          // Queue Google Calendar sync if user has GCal auth
          if (hasGoogleAuth) {
            const taskForSync = { 
              ...task, 
              scheduledTime: newScheduledTime,
              dueDate: newScheduledTime,
              googleCalendarId: task.googleCalendarId || 'primary',
            };
            
            if (task.googleEventId) {
              // Task already has a GCal event — update it
              googleCalendarUpdates.push({ task: taskForSync, action: 'update' });
            } else if (user?.googleCalendarSyncEnabled) {
              // Task has no GCal event but sync is enabled — create one
              googleCalendarUpdates.push({ task: taskForSync, action: 'create' });
            }
          }
        } else {
          console.log(`📊 [ML-APPLY] Task ${item.taskId} not found or not owned by user`);
        }
      }

      // Update/create Google Calendar events
      let googleUpdatedCount = 0;
      let googleCreatedCount = 0;
      let googleFailedCount = 0;
      
      if (googleCalendarUpdates.length > 0 && user) {
        console.log(`📊 [ML-APPLY] Syncing ${googleCalendarUpdates.length} tasks to Google Calendar...`);
        
        for (const update of googleCalendarUpdates) {
          try {
            if (update.action === 'update') {
              await googleCalendar.updateEvent(update.task as any, user);
              googleUpdatedCount++;
              console.log(`📊 [ML-APPLY] ✅ Updated Google Calendar event ${update.task.googleEventId}`);
            } else if (update.action === 'create') {
              // Create new event via syncTasks (handles event creation and saves eventId)
              const result = await googleCalendar.syncTasks([update.task as any], user, storage);
              if (result.success > 0) {
                googleCreatedCount++;
                console.log(`📊 [ML-APPLY] ✅ Created new Google Calendar event for task ${update.task.id}`);
              } else {
                googleFailedCount++;
                console.log(`📊 [ML-APPLY] ❌ Failed to create Google Calendar event for task ${update.task.id}`);
              }
            }
          } catch (error: any) {
            googleFailedCount++;
            console.error(`📊 [ML-APPLY] ❌ Failed to sync Google Calendar for task ${update.task.id}: ${error.message}`);
          }
        }
        
        console.log(`📊 [ML-APPLY] Google Calendar sync complete: ${googleUpdatedCount} updated, ${googleCreatedCount} created, ${googleFailedCount} failed`);
      }

      console.log(`📊 [ML-APPLY] Total updates: ${updates.length}`);

      const totalGCalSynced = googleUpdatedCount + googleCreatedCount;
      res.json({
        success: true,
        message: `Updated ${updates.length} tasks${totalGCalSynced > 0 ? ` and synced ${totalGCalSynced} to Google Calendar` : ''}`,
        updates,
        googleCalendarUpdates: googleUpdatedCount,
        googleCalendarCreated: googleCreatedCount,
        googleCalendarFailed: googleFailedCount,
      });
    } catch (error: any) {
      console.error("Error applying sort:", error);
      res.status(500).json({ error: "Failed to apply sorted schedule" });
    }
  });

  // Submit feedback on ML sorting (train the model)
  app.post("/api/ml/feedback", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { 
        date,
        originalSchedule, 
        mlSortedSchedule, 
        userCorrectedSchedule, 
        feedbackType, 
        feedbackReason,
        taskMetadata,
      } = req.body;

      if (!feedbackType || !['approved', 'corrected'].includes(feedbackType)) {
        return res.status(400).json({ error: "Valid feedback type (approved/corrected) is required" });
      }

      if (feedbackType === 'corrected' && !userCorrectedSchedule) {
        return res.status(400).json({ error: "User corrected schedule is required for corrections" });
      }

      // Get current preferences
      const currentPrefs = await storage.getMlSortingPreferences(userId);
      const preferences = mergePreferences(currentPrefs, {});

      // Learn from the feedback
      const updates = learnFromFeedback(
        preferences,
        feedbackType,
        mlSortedSchedule,
        userCorrectedSchedule,
        taskMetadata,
        feedbackReason
      );

      // Save updated preferences
      await storage.upsertMlSortingPreferences(userId, {
        ...preferences,
        ...updates,
      });

      // Save the feedback for future analysis
      await storage.saveMlSortingFeedback({
        userId,
        date: new Date(date),
        originalSchedule,
        mlSortedSchedule,
        userCorrectedSchedule: feedbackType === 'corrected' ? userCorrectedSchedule : undefined,
        feedbackType,
        feedbackReason,
        taskMetadata,
      });

      // If approved, apply the ML schedule; if corrected, apply the user's schedule
      const scheduleToApply = feedbackType === 'approved' ? mlSortedSchedule : userCorrectedSchedule;
      
      // Get user for Google Calendar sync
      const user = await storage.getUserById(userId);
      const hasGoogleAuth = user && (
        (user.googleCalendarAccessToken && user.googleCalendarRefreshToken) || 
        (user.googleAccessToken && user.googleRefreshToken)
      );
      
      const googleCalendarUpdates = [];
      
      for (const item of scheduleToApply) {
        const task = await storage.getTask(item.taskId, userId);
        if (task && task.userId === userId) {
          const newScheduledTime = new Date(item.startTime);
          await storage.updateTask(item.taskId, { scheduledTime: newScheduledTime }, userId);
          
          // Queue Google Calendar update if task has a linked event
          if (task.googleEventId && hasGoogleAuth) {
            googleCalendarUpdates.push({
              task: { 
                ...task, 
                scheduledTime: newScheduledTime,
                dueDate: newScheduledTime,
              },
            });
          }
        }
      }
      
      // Update Google Calendar events
      if (googleCalendarUpdates.length > 0 && user) {
        console.log(`📊 [ML-FEEDBACK] Syncing ${googleCalendarUpdates.length} tasks to Google Calendar...`);
        for (const update of googleCalendarUpdates) {
          try {
            await googleCalendar.updateEvent(update.task as any, user);
            console.log(`📊 [ML-FEEDBACK] ✅ Updated Google Calendar event ${update.task.googleEventId}`);
          } catch (error: any) {
            console.error(`📊 [ML-FEEDBACK] ❌ Failed to update Google Calendar event: ${error.message}`);
          }
        }
      }

      res.json({
        success: true,
        message: feedbackType === 'approved' 
          ? "Thank you! Your approval helps improve sorting accuracy." 
          : "Thank you for the correction! This helps train better sorting.",
        preferencesUpdated: Object.keys(updates).length > 0,
        newPreferences: {
          ...preferences,
          ...updates,
        },
      });
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}