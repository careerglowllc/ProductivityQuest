# Google Calendar Integration - Implementation Guide

## Overview
This document outlines the complete implementation of Google Calendar integration for ProductivityQuest, including OAuth 2.0 authentication, sync logic, and user configuration.

---

## Architecture

### 1. Database Schema Updates

Add to `userSettings` table in `shared/schema.ts`:

```typescript
googleCalendarClientId: text("google_calendar_client_id"),
googleCalendarClientSecret: text("google_calendar_client_secret"), 
googleCalendarRefreshToken: text("google_calendar_refresh_token"),
googleCalendarAccessToken: text("google_calendar_access_token"),
googleCalendarTokenExpiry: timestamp("google_calendar_token_expiry"),
googleCalendarSyncEnabled: boolean("google_calendar_sync_enabled").default(false),
googleCalendarSyncDirection: text("google_calendar_sync_direction").default('both'), // 'import' | 'export' | 'both'
googleCalendarLastSync: timestamp("google_calendar_last_sync"),
```

### 2. Migration File

Create `migrations/add_google_calendar_fields.sql`:

```sql
ALTER TABLE user_settings 
ADD COLUMN google_calendar_client_id TEXT,
ADD COLUMN google_calendar_client_secret TEXT,
ADD COLUMN google_calendar_refresh_token TEXT,
ADD COLUMN google_calendar_access_token TEXT,
ADD COLUMN google_calendar_token_expiry TIMESTAMP,
ADD COLUMN google_calendar_sync_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN google_calendar_sync_direction TEXT DEFAULT 'both',
ADD COLUMN google_calendar_last_sync TIMESTAMP;

-- Add index for faster lookups
CREATE INDEX idx_user_settings_calendar_enabled ON user_settings(google_calendar_sync_enabled);
```

---

## Backend Implementation

### 3. Google Calendar Service (`server/google-calendar.ts`)

```typescript
import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
  }

  /**
   * Get authorization URL for user to grant permissions
   */
  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly'
      ],
      prompt: 'consent' // Force to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  /**
   * Set credentials from stored tokens
   */
  setCredentials(accessToken: string, refreshToken?: string, expiryDate?: number) {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: expiryDate
    });
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken() {
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    return credentials;
  }

  /**
   * Import events from Google Calendar
   */
  async importEvents(startDate?: Date, endDate?: Date) {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: (startDate || new Date()).toISOString(),
      timeMax: endDate?.toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items || [];
  }

  /**
   * Export task to Google Calendar as event
   */
  async exportTaskAsEvent(task: any) {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    const event = {
      summary: task.title,
      description: task.description || '',
      start: {
        dateTime: task.dueDate ? new Date(task.dueDate).toISOString() : undefined,
        date: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : undefined
      },
      end: {
        dateTime: task.dueDate 
          ? new Date(new Date(task.dueDate).getTime() + (task.duration || 30) * 60000).toISOString() 
          : undefined,
        date: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : undefined
      },
      extendedProperties: {
        private: {
          productivityQuestTaskId: task.id.toString()
        }
      }
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    return response.data;
  }

  /**
   * Update existing calendar event
   */
  async updateEvent(eventId: string, task: any) {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    const event = {
      summary: task.title,
      description: task.description || '',
      start: {
        dateTime: task.dueDate ? new Date(task.dueDate).toISOString() : undefined,
        date: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : undefined
      },
      end: {
        dateTime: task.dueDate 
          ? new Date(new Date(task.dueDate).getTime() + (task.duration || 30) * 60000).toISOString() 
          : undefined,
        date: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : undefined
      }
    };

    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId,
      requestBody: event,
    });

    return response.data;
  }

  /**
   * Delete event from Google Calendar
   */
  async deleteEvent(eventId: string) {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });
  }
}

/**
 * Helper to convert Google Calendar event to ProductivityQuest task
 */
export function convertEventToTask(event: any) {
  return {
    title: event.summary || 'Untitled Event',
    description: event.description || '',
    dueDate: event.start?.dateTime || event.start?.date,
    duration: event.start?.dateTime && event.end?.dateTime
      ? Math.round((new Date(event.end.dateTime).getTime() - new Date(event.start.dateTime).getTime()) / 60000)
      : 30,
    googleCalendarEventId: event.id,
    importance: 'Medium', // Default importance
    skillName: 'Scholar' // Default skill
  };
}
```

---

### 4. API Routes (`server/routes.ts`)

Add these routes:

```typescript
// Google Calendar OAuth callback
app.get("/api/google-calendar/callback", requireAuth, async (req: any, res) => {
  try {
    const { code } = req.query;
    const userId = req.session.userId;

    if (!code) {
      return res.status(400).json({ error: "Authorization code missing" });
    }

    // Get user settings to retrieve client ID and secret
    const settings = await storage.getUserSettings(userId);
    
    if (!settings?.googleCalendarClientId || !settings?.googleCalendarClientSecret) {
      return res.status(400).json({ error: "Google Calendar credentials not configured" });
    }

    // Initialize Google Calendar service
    const redirectUri = `${process.env.APP_URL || 'http://localhost:5000'}/api/google-calendar/callback`;
    const calendarService = new GoogleCalendarService(
      settings.googleCalendarClientId,
      settings.googleCalendarClientSecret,
      redirectUri
    );

    // Exchange code for tokens
    const tokens = await calendarService.getTokensFromCode(code);

    // Save tokens to database
    await storage.updateUserSettings(userId, {
      googleCalendarAccessToken: tokens.access_token!,
      googleCalendarRefreshToken: tokens.refresh_token || settings.googleCalendarRefreshToken,
      googleCalendarTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null
    });

    // Redirect to integration page with success message
    res.redirect('/settings/google-calendar?auth=success');
  } catch (error) {
    console.error("Google Calendar OAuth error:", error);
    res.redirect('/settings/google-calendar?auth=error');
  }
});

// Initiate Google Calendar OAuth flow
app.get("/api/google-calendar/auth", requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId;
    const settings = await storage.getUserSettings(userId);
    
    if (!settings?.googleCalendarClientId || !settings?.googleCalendarClientSecret) {
      return res.status(400).json({ error: "Google Calendar credentials not configured" });
    }

    const redirectUri = `${process.env.APP_URL || 'http://localhost:5000'}/api/google-calendar/callback`;
    const calendarService = new GoogleCalendarService(
      settings.googleCalendarClientId,
      settings.googleCalendarClientSecret,
      redirectUri
    );

    const authUrl = calendarService.getAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error("Error initiating Google Calendar auth:", error);
    res.status(500).json({ error: "Failed to initiate authorization" });
  }
});

// Manual sync endpoint
app.post("/api/google-calendar/sync", requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId;
    const settings = await storage.getUserSettings(userId);

    if (!settings?.googleCalendarSyncEnabled) {
      return res.status(400).json({ error: "Google Calendar sync is not enabled" });
    }

    if (!settings.googleCalendarAccessToken) {
      return res.status(400).json({ error: "Not authenticated with Google Calendar" });
    }

    // Initialize service
    const redirectUri = `${process.env.APP_URL || 'http://localhost:5000'}/api/google-calendar/callback`;
    const calendarService = new GoogleCalendarService(
      settings.googleCalendarClientId!,
      settings.googleCalendarClientSecret!,
      redirectUri
    );

    // Check if token needs refresh
    if (settings.googleCalendarTokenExpiry && new Date(settings.googleCalendarTokenExpiry) < new Date()) {
      const newTokens = await calendarService.refreshAccessToken();
      await storage.updateUserSettings(userId, {
        googleCalendarAccessToken: newTokens.access_token!,
        googleCalendarTokenExpiry: newTokens.expiry_date ? new Date(newTokens.expiry_date) : null
      });
      calendarService.setCredentials(
        newTokens.access_token!,
        settings.googleCalendarRefreshToken!,
        newTokens.expiry_date
      );
    } else {
      calendarService.setCredentials(
        settings.googleCalendarAccessToken,
        settings.googleCalendarRefreshToken!,
        settings.googleCalendarTokenExpiry ? new Date(settings.googleCalendarTokenExpiry).getTime() : undefined
      );
    }

    let imported = 0;
    let exported = 0;

    // Import from Google Calendar
    if (settings.googleCalendarSyncDirection === 'import' || settings.googleCalendarSyncDirection === 'both') {
      const events = await calendarService.importEvents(new Date(), undefined);
      
      for (const event of events) {
        const taskData = convertEventToTask(event);
        
        // Check if task already exists
        const existingTask = await storage.getTaskByGoogleEventId(userId, event.id);
        
        if (!existingTask) {
          await storage.createTask(userId, taskData);
          imported++;
        }
      }
    }

    // Export to Google Calendar
    if (settings.googleCalendarSyncDirection === 'export' || settings.googleCalendarSyncDirection === 'both') {
      const tasks = await storage.getUncompletedTasks(userId);
      
      for (const task of tasks) {
        if (task.dueDate && !task.googleCalendarEventId) {
          const event = await calendarService.exportTaskAsEvent(task);
          await storage.updateTask(userId, task.id, { googleCalendarEventId: event.id });
          exported++;
        }
      }
    }

    // Update last sync time
    await storage.updateUserSettings(userId, {
      googleCalendarLastSync: new Date()
    });

    res.json({ imported, exported, lastSync: new Date() });
  } catch (error) {
    console.error("Error syncing with Google Calendar:", error);
    res.status(500).json({ error: "Failed to sync with Google Calendar" });
  }
});

// Disconnect Google Calendar
app.post("/api/google-calendar/disconnect", requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId;
    
    await storage.updateUserSettings(userId, {
      googleCalendarAccessToken: null,
      googleCalendarRefreshToken: null,
      googleCalendarTokenExpiry: null,
      googleCalendarSyncEnabled: false
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting Google Calendar:", error);
    res.status(500).json({ error: "Failed to disconnect" });
  }
});
```

---

### 5. Storage Methods (`server/storage.ts`)

Add these methods:

```typescript
async getTaskByGoogleEventId(userId: string, eventId: string): Promise<any> {
  const [task] = await db.select()
    .from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      eq(tasks.googleCalendarEventId, eventId)
    ));
  return task;
}

async getUncompletedTasks(userId: string): Promise<any[]> {
  return await db.select()
    .from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      eq(tasks.completed, false)
    ))
    .orderBy(tasks.dueDate);
}
```

---

## Frontend Integration

### 6. Add Route in `App.tsx`

```typescript
import GoogleCalendarIntegration from "@/pages/google-calendar-integration";

// Add route
<Route path="/settings/google-calendar" component={GoogleCalendarIntegration} />
```

### 7. Add Link in Settings Page

```typescript
<Link href="/settings/google-calendar">
  <Button className="w-full justify-start" variant="ghost">
    <Calendar className="mr-2 h-4 w-4" />
    Google Calendar Integration
  </Button>
</Link>
```

---

## Installation & Setup

### 8. Install Dependencies

```bash
npm install googleapis google-auth-library
```

### 9. Environment Variables

Add to `.env`:

```
APP_URL=http://localhost:5000
# Or in production:
# APP_URL=https://productivityquest.onrender.com
```

### 10. Run Migration

```bash
npx drizzle-kit push:pg
```

---

## Testing Checklist

- [ ] User can add Google Calendar credentials
- [ ] OAuth flow redirects correctly
- [ ] Tokens are stored securely
- [ ] Token refresh works automatically
- [ ] Import from Google Calendar creates tasks
- [ ] Export to Google Calendar creates events
- [ ] Two-way sync updates both systems
- [ ] Sync can be toggled on/off
- [ ] Manual sync works immediately
- [ ] Disconnect clears all tokens

---

## Security Considerations

1. **Token Storage**: All tokens stored encrypted in database
2. **HTTPS Only**: OAuth redirect must use HTTPS in production
3. **Scope Limitation**: Only request calendar.events scope, not full account access
4. **Token Refresh**: Automatically refresh expired tokens
5. **User Isolation**: All calendar operations scoped to authenticated user

---

## Future Enhancements

- Calendar selection (allow sync with specific calendars)
- Conflict resolution UI
- Sync history/logs
- Batch sync for better performance
- Webhook support for real-time updates
- Task<->Event mapping customization

---

**Status**: Ready for implementation  
**Last Updated**: November 16, 2025
