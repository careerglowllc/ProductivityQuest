import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Task, User } from '@shared/schema';

// Function to get credentials fresh each time
function getGoogleCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment variables.');
  }
  
  return { clientId, clientSecret };
}

// Dynamic redirect URI that works in both development and production
const getRedirectUri = () => {
  if (process.env.REPLIT_DOMAINS) {
    // Running on Replit - use the Replit domain
    return `https://${process.env.REPLIT_DOMAINS}/api/google/callback`;
  } else if (process.env.NODE_ENV === 'production') {
    // Production environment
    return 'https://your-app-domain.replit.app/api/google/callback';
  } else {
    // Local development
    return 'http://localhost:5000/api/google/callback';
  }
};

// Get redirect URI for per-user Google Calendar OAuth (uses different callback path)
const getGoogleCalendarRedirectUri = () => {
  const port = process.env.PORT || 5001;
  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS}/api/google-calendar/callback`;
  } else if (process.env.NODE_ENV === 'production') {
    return process.env.APP_URL 
      ? `${process.env.APP_URL}/api/google-calendar/callback`
      : `https://productivityquest.onrender.com/api/google-calendar/callback`;
  } else {
    // Local development - match the actual server port
    return `http://localhost:${port}/api/google-calendar/callback`;
  }
};

// Log initial configuration at startup
console.log('🔗 Google OAuth Redirect URI:', getRedirectUri());
console.log('🔗 Google Calendar Redirect URI:', getGoogleCalendarRedirectUri());
console.log('🌐 REPLIT_DOMAINS:', process.env.REPLIT_DOMAINS);
console.log('🏗️ NODE_ENV:', process.env.NODE_ENV);
console.log('🔑 Google Client ID at startup:', process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + '...');

export class GoogleCalendarService {
  private getAuthenticatedClient(user: User): OAuth2Client {
    if (!user.googleAccessToken || !user.googleRefreshToken) {
      throw new Error('Google OAuth credentials not configured');
    }

    const { clientId, clientSecret } = getGoogleCredentials();
    const oauth2Client = new OAuth2Client(
      clientId,
      clientSecret,
      getRedirectUri()
    );

    oauth2Client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
      expiry_date: user.googleTokenExpiry?.getTime(),
    });

    return oauth2Client;
  }

  generateAuthUrl(): string {
    const { clientId, clientSecret } = getGoogleCredentials();
    const redirectUri = getRedirectUri();
    
    console.log('📝 Creating OAuth client with:');
    console.log('   Client ID:', clientId);
    console.log('   Redirect URI:', redirectUri);
    
    const oauth2Client = new OAuth2Client(
      clientId,
      clientSecret,
      redirectUri
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly'
      ],
      prompt: 'consent',
    });

    console.log('🔗 Generated OAuth URL with redirect URI:', redirectUri);
    console.log('🔗 Generated OAuth URL:', authUrl);
    return authUrl;
  }

  async getTokenFromCode(code: string): Promise<any> {
    const { clientId, clientSecret } = getGoogleCredentials();
    const oauth2Client = new OAuth2Client(
      clientId,
      clientSecret,
      getRedirectUri()
    );

    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  }

  async testConnection(user: User): Promise<{ calendarId: string }> {
    const auth = this.getAuthenticatedClient(user);
    const calendar = google.calendar({ version: 'v3', auth });

    try {
      // Test by listing calendars
      const response = await calendar.calendarList.list();
      
      // Find the primary calendar
      const primaryCalendar = response.data.items?.find(cal => cal.primary);
      
      if (!primaryCalendar) {
        throw new Error('No primary calendar found');
      }

      return { calendarId: primaryCalendar.id || 'primary' };
    } catch (error: any) {
      console.error('Google Calendar test connection error:', error);
      
      // If token is expired, try to refresh it
      if (error.code === 401 && user.googleRefreshToken) {
        try {
          const { clientId, clientSecret } = getGoogleCredentials();
          const oauth2Client = new OAuth2Client(
            clientId,
            clientSecret,
            getRedirectUri()
          );
          
          oauth2Client.setCredentials({
            refresh_token: user.googleRefreshToken,
          });
          
          const { credentials } = await oauth2Client.refreshAccessToken();
          
          // Return the new tokens so they can be saved
          throw new Error('TOKEN_EXPIRED_REFRESH_NEEDED');
        } catch (refreshError) {
          throw new Error('Access token expired and refresh failed. Please re-authenticate.');
        }
      }
      
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }

  async createEvent(task: Task, user: User): Promise<any> {
    const auth = this.getAuthenticatedClient(user);
    const calendar = google.calendar({ version: 'v3', auth });

    const startTime = task.dueDate!;
    const endTime = new Date(task.dueDate!.getTime() + task.duration * 60000);

    const event = {
      summary: task.title,
      description: `${task.description}\n\nGold Reward: ${task.goldValue}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: user.timezone || 'America/Los_Angeles',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: user.timezone || 'America/Los_Angeles',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 15 },
          { method: 'email', minutes: 60 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    return response.data;
  }

  async syncTasks(tasks: Task[], user: User, storage: any): Promise<{ success: number; failed: number; created: number; updated: number; eventIds: Map<number, string> }> {
    let success = 0;
    let failed = 0;
    let created = 0;
    let updated = 0;
    const eventIds = new Map<number, string>(); // Map of task ID to Google Event ID

    console.log('📅 [SYNC TASKS] Starting sync for', tasks.length, 'tasks');
    console.log('📅 [SYNC TASKS] User credentials check:');
    console.log('   - googleCalendarClientId:', !!user.googleCalendarClientId);
    console.log('   - googleCalendarClientSecret:', !!user.googleCalendarClientSecret);
    console.log('   - googleCalendarAccessToken:', !!user.googleCalendarAccessToken);
    console.log('   - googleCalendarRefreshToken:', !!user.googleCalendarRefreshToken);
    console.log('   - Legacy googleAccessToken:', !!user.googleAccessToken);
    console.log('   - Legacy googleRefreshToken:', !!user.googleRefreshToken);

    try {
      // Use per-user credentials if available (same pattern as getEvents)
      let auth: OAuth2Client;
      
      if (user.googleCalendarClientId && user.googleCalendarClientSecret && 
          user.googleCalendarAccessToken && user.googleCalendarRefreshToken) {
        console.log('📅 [SYNC TASKS] Using per-user OAuth credentials');
        console.log('📅 [SYNC TASKS] Redirect URI:', getGoogleCalendarRedirectUri());
        // Use user's own OAuth credentials
        auth = new OAuth2Client(
          user.googleCalendarClientId,
          user.googleCalendarClientSecret,
          getGoogleCalendarRedirectUri()
        );
        
        auth.setCredentials({
          access_token: user.googleCalendarAccessToken,
          refresh_token: user.googleCalendarRefreshToken,
          expiry_date: user.googleCalendarTokenExpiry?.getTime(),
        });
      } else {
        console.log('📅 [SYNC TASKS] Falling back to legacy credentials');
        // Fallback to legacy credentials
        auth = this.getAuthenticatedClient(user);
      }

      const calendar = google.calendar({ version: 'v3', auth });

      for (const task of tasks) {
        if (!task.dueDate) {
          console.log(`📅 [SYNC TASKS] Skipping task ${task.id} "${task.title}" - no due date`);
          continue;
        }

        try {
          // Use scheduledTime if available, otherwise use dueDate
          const startTime = task.scheduledTime || task.dueDate;
          const endTime = new Date(startTime.getTime() + task.duration * 60000);
          
          console.log(`📅 [SYNC TASKS] Processing task ${task.id} "${task.title}"`);
          console.log(`   - Scheduled time: ${task.scheduledTime || 'not set, using dueDate'}`);
          console.log(`   - Start time: ${startTime}`);
          console.log(`   - Duration: ${task.duration} minutes`);
          console.log(`   - Importance: ${task.importance}`);
          console.log(`   - Existing Google Event ID: ${task.googleEventId || 'none'}`);
          
          // Format datetime for Google Calendar API
          // Google Calendar accepts ISO 8601 datetime with timezone offset
          // We'll use the full ISO string (UTC) and let Google handle it with the timeZone parameter
          const formatDateTimeForGoogle = (date: Date) => {
            // Return the ISO string - Google API will use the timeZone parameter to interpret it
            return date.toISOString();
          };
          
          console.log(`   - Start time ISO: ${formatDateTimeForGoogle(startTime)}`);
          console.log(`   - User timezone: ${user.timezone || 'America/Los_Angeles'}`);
          
          const eventData = {
            summary: task.title,
            description: `${task.description || ''}\n\n🏆 Gold Reward: ${task.goldValue}\n⚡ Importance: ${task.importance || 'Not set'}\n📋 ProductivityQuest Task ID: ${task.id}`,
            start: {
              dateTime: formatDateTimeForGoogle(startTime),
              timeZone: user.timezone || 'America/Los_Angeles',
            },
            end: {
              dateTime: formatDateTimeForGoogle(endTime),
              timeZone: user.timezone || 'America/Los_Angeles',
            },
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'popup', minutes: 15 },
              ],
            },
            // Color based on importance
            colorId: this.getColorForImportance(task.importance || undefined),
          };

          let response;
          
          if (task.googleEventId) {
            // Update existing event
            console.log(`📅 [SYNC TASKS] Updating existing event ${task.googleEventId}`);
            try {
              response = await calendar.events.update({
                calendarId: task.googleCalendarId || 'primary',
                eventId: task.googleEventId,
                requestBody: eventData,
              });
              updated++;
              console.log(`✅ [SYNC TASKS] Updated existing event for task ${task.id}`);
            } catch (updateError: any) {
              // If update fails (event deleted), create new one
              if (updateError.code === 404) {
                console.log(`⚠️ [SYNC TASKS] Event not found, creating new one`);
                response = await calendar.events.insert({
                  calendarId: 'primary',
                  requestBody: eventData,
                });
                created++;
              } else {
                throw updateError;
              }
            }
          } else {
            // Create new event
            console.log(`📅 [SYNC TASKS] Creating new event`);
            response = await calendar.events.insert({
              calendarId: 'primary',
              requestBody: eventData,
            });
            created++;
          }
          
          const googleEventId = response.data.id;
          eventIds.set(task.id, googleEventId!);
          
          // Update task with Google Event ID if it's new or changed
          if (googleEventId && googleEventId !== task.googleEventId && storage) {
            await storage.updateTask(task.id, {
              googleEventId: googleEventId,
              googleCalendarId: 'primary',
            }, user.id);
            console.log(`📅 [SYNC TASKS] Saved Google Event ID ${googleEventId} to task ${task.id}`);
          }
          
          console.log(`✅ [SYNC TASKS] Successfully synced task ${task.id}, Google Event ID: ${googleEventId}`);

          success++;
        } catch (error: any) {
          console.error(`❌ [SYNC TASKS] Failed to sync task ${task.id}:`, error.message);
          if (error.response?.data) {
            console.error('   Error details:', JSON.stringify(error.response.data));
          }
          failed++;
        }
      }
    } catch (error) {
      console.error('Calendar sync error:', error);
      throw error;
    }

    return { success, failed, created, updated, eventIds };
  }

  // Import events from Google Calendar and update task times
  async importEventsToTasks(user: User, storage: any): Promise<{ updated: number; errors: number }> {
    let updated = 0;
    let errors = 0;

    try {
      // Get all events for the next 30 days
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const events = await this.getEvents(user, startDate, endDate);
      console.log(`📅 [IMPORT] Found ${events.length} Google Calendar events`);

      // Get all tasks for this user
      const tasks = await storage.getTasks(user.id);
      
      // Create a map of Google Event ID to task
      const eventIdToTask = new Map<string, Task>();
      tasks.forEach((task: Task) => {
        if (task.googleEventId) {
          eventIdToTask.set(task.googleEventId, task);
        }
      });

      // Update tasks based on Google Calendar event times
      // IMPORTANT: Only update if there's a significant time difference (> 5 minutes)
      // This prevents minor floating-point/timezone issues from causing unwanted updates
      // The assumption is that if a user manually moves an event in Google Calendar,
      // the change will be more than a few minutes
      for (const event of events) {
        const task = eventIdToTask.get(event.id);
        if (!task) continue; // Not a ProductivityQuest task

        try {
          // Google Calendar returns dateTime with timezone, e.g., "2026-01-26T09:00:00-08:00"
          const eventStartRaw = event.start?.dateTime;
          const eventEndRaw = event.end?.dateTime;
          
          if (!eventStartRaw) continue;

          const eventStart = new Date(eventStartRaw);
          const eventEnd = eventEndRaw ? new Date(eventEndRaw) : null;

          // Calculate duration from event
          const durationMinutes = eventEnd 
            ? Math.round((eventEnd.getTime() - eventStart.getTime()) / 60000)
            : task.duration;

          // Check if times have changed (compare UTC timestamps)
          const taskScheduledTime = task.scheduledTime ? new Date(task.scheduledTime).getTime() : null;
          const eventStartTime = eventStart.getTime();
          
          // Only update if the times differ by more than 5 minutes
          // This prevents timezone/rounding issues from causing unwanted updates
          const timeDiffMinutes = taskScheduledTime 
            ? Math.abs(eventStartTime - taskScheduledTime) / 60000 
            : Infinity;
          
          // Also check if duration changed significantly (> 1 minute)
          const durationDiff = Math.abs((task.duration || 30) - durationMinutes);
          
          if (timeDiffMinutes > 5 || durationDiff > 1) {
            console.log(`📅 [IMPORT] Updating task ${task.id} "${task.title}"`);
            console.log(`   - Google Calendar event start (raw): ${eventStartRaw}`);
            console.log(`   - Google Calendar event start (parsed): ${eventStart.toISOString()}`);
            console.log(`   - Task scheduled time (current): ${task.scheduledTime ? new Date(task.scheduledTime).toISOString() : 'null'}`);
            console.log(`   - Time difference: ${timeDiffMinutes.toFixed(1)} minutes`);
            console.log(`   - Duration change: ${task.duration} -> ${durationMinutes} (diff: ${durationDiff})`);
            
            await storage.updateTask(task.id, {
              scheduledTime: eventStart,
              dueDate: eventStart, // Also update due date to match
              duration: durationMinutes,
            }, user.id);
            
            updated++;
          }
        } catch (error: any) {
          console.error(`❌ [IMPORT] Failed to update task from event:`, error.message);
          errors++;
        }
      }
    } catch (error) {
      console.error('Import error:', error);
      throw error;
    }

    return { updated, errors };
  }

  async getEvents(user: User, startDate: Date, endDate: Date, calendarIds?: string[]): Promise<any[]> {
    try {
      // Use per-user credentials if available
      let auth: OAuth2Client;
      
      if (user.googleCalendarClientId && user.googleCalendarClientSecret && 
          user.googleCalendarAccessToken && user.googleCalendarRefreshToken) {
        // Use user's own OAuth credentials
        auth = new OAuth2Client(
          user.googleCalendarClientId,
          user.googleCalendarClientSecret,
          getGoogleCalendarRedirectUri()
        );
        
        auth.setCredentials({
          access_token: user.googleCalendarAccessToken,
          refresh_token: user.googleCalendarRefreshToken,
          expiry_date: user.googleCalendarTokenExpiry?.getTime(),
        });
      } else {
        // Fallback to legacy credentials
        auth = this.getAuthenticatedClient(user);
      }

      const calendar = google.calendar({ version: 'v3', auth });
      
      // Try to fetch the calendar list to get color information
      // This might fail if user hasn't granted calendar.readonly scope
      let calendarsMetadata: any[] = [];
      let calendarMetadataMap = new Map();
      
      try {
        const calendarListResponse = await calendar.calendarList.list();
        calendarsMetadata = calendarListResponse.data.items || [];
        calendarMetadataMap = new Map(
          calendarsMetadata.map(cal => [cal.id!, cal])
        );
      } catch (calListError: any) {
        console.warn('⚠️ Could not fetch calendar list (may need calendar.readonly scope):', calListError.message);
        // Continue without calendar metadata - just use primary calendar
      }
      
      // If no specific calendars requested, fetch from all calendars (or just primary if list failed)
      let calendarsToFetch = calendarIds;
      if (!calendarsToFetch || calendarsToFetch.length === 0) {
        calendarsToFetch = calendarsMetadata.length > 0 
          ? calendarsMetadata.map(cal => cal.id!) 
          : ['primary'];
      }

      // Fetch events from all calendars
      const allEvents: any[] = [];
      
      for (const calId of calendarsToFetch) {
        try {
          const response = await calendar.events.list({
            calendarId: calId,
            timeMin: startDate.toISOString(),
            timeMax: endDate.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 250,
          });

          const events = response.data.items || [];
          const calMetadata = calendarMetadataMap.get(calId);
          
          // Add calendar info to each event
          events.forEach(event => {
            (event as any).calendarId = calId;
            (event as any).calendarName = calMetadata?.summary || 'Primary';
            (event as any).calendarBackgroundColor = calMetadata?.backgroundColor;
            (event as any).calendarForegroundColor = calMetadata?.foregroundColor;
          });
          allEvents.push(...events);
        } catch (error) {
          console.error(`Error fetching events from calendar ${calId}:`, error);
          // Continue with other calendars even if one fails
        }
      }

      return allEvents;
    } catch (error: any) {
      console.error('Error fetching Google Calendar events:', error);
      
      // Only throw auth expired for genuine auth issues, not network errors
      // The OAuth2Client should automatically refresh tokens via the refresh token
      if (error.code === 401 && error.message?.includes('invalid_grant')) {
        console.error('⚠️ Refresh token invalid - user needs to re-authorize');
        throw new Error('CALENDAR_AUTH_EXPIRED');
      }
      
      // For other errors (network, rate limits, etc), log but don't fail completely
      console.warn('⚠️ Non-fatal calendar error - returning empty events:', error.message);
      return []; // Return empty array instead of throwing
    }
  }

  async getCalendarList(user: User): Promise<any[]> {
    try {
      let auth: OAuth2Client;
      
      if (user.googleCalendarClientId && user.googleCalendarClientSecret && 
          user.googleCalendarAccessToken && user.googleCalendarRefreshToken) {
        auth = new OAuth2Client(
          user.googleCalendarClientId,
          user.googleCalendarClientSecret,
          getGoogleCalendarRedirectUri()
        );
        
        auth.setCredentials({
          access_token: user.googleCalendarAccessToken,
          refresh_token: user.googleCalendarRefreshToken,
          expiry_date: user.googleCalendarTokenExpiry?.getTime(),
        });
      } else {
        auth = this.getAuthenticatedClient(user);
      }

      const calendar = google.calendar({ version: 'v3', auth });
      const response = await calendar.calendarList.list();
      
      return (response.data.items || []).map(cal => ({
        id: cal.id,
        summary: cal.summary,
        description: cal.description,
        primary: cal.primary,
        backgroundColor: cal.backgroundColor,
        foregroundColor: cal.foregroundColor,
        selected: cal.selected,
      }));
    } catch (error: any) {
      console.error('Error fetching calendar list:', error);
      
      // Only throw auth expired for genuine invalid_grant errors
      if (error.code === 401 && error.message?.includes('invalid_grant')) {
        console.error('⚠️ Refresh token invalid - user needs to re-authorize');
        throw new Error('CALENDAR_AUTH_EXPIRED');
      }
      
      // For other errors, return empty list instead of throwing
      console.warn('⚠️ Non-fatal calendar list error - returning empty list:', error.message);
      return [];
    }
  }

  async updateEvent(task: Task, user: User): Promise<any> {
    try {
      if (!task.googleEventId) {
        console.log(`📅 [UPDATE EVENT] Skipping task ${task.id} - no googleEventId`);
        return null; // Task is not synced to Google Calendar
      }

      // Default to 'primary' calendar if not specified
      const calendarId = task.googleCalendarId || 'primary';

      // Use scheduledTime if available, otherwise fall back to dueDate
      const rawStartTime = task.scheduledTime || task.dueDate;
      if (!rawStartTime) {
        console.log(`📅 [UPDATE EVENT] Skipping task ${task.id} - no scheduledTime or dueDate`);
        return null; // No time to sync
      }
      
      // Ensure startTime is a proper Date object (handle string from DB)
      const startTime = rawStartTime instanceof Date ? rawStartTime : new Date(rawStartTime);
      
      console.log(`📅 [UPDATE EVENT] Processing task ${task.id} "${task.title}"`);
      console.log(`   - Raw scheduledTime: ${task.scheduledTime} (type: ${typeof task.scheduledTime})`);
      console.log(`   - Raw dueDate: ${task.dueDate} (type: ${typeof task.dueDate})`);
      console.log(`   - Parsed startTime: ${startTime.toISOString()}`);

      let auth: OAuth2Client;
      
      if (user.googleCalendarClientId && user.googleCalendarClientSecret && 
          user.googleCalendarAccessToken && user.googleCalendarRefreshToken) {
        auth = new OAuth2Client(
          user.googleCalendarClientId,
          user.googleCalendarClientSecret,
          getGoogleCalendarRedirectUri()
        );
        
        auth.setCredentials({
          access_token: user.googleCalendarAccessToken,
          refresh_token: user.googleCalendarRefreshToken,
          expiry_date: user.googleCalendarTokenExpiry?.getTime(),
        });
      } else {
        auth = this.getAuthenticatedClient(user);
      }

      const calendar = google.calendar({ version: 'v3', auth });
      
      const endTime = new Date(startTime.getTime() + task.duration * 60000);
      
      console.log(`📅 [UPDATE EVENT] Task ${task.id} "${task.title}"`);
      console.log(`   - Start time: ${startTime.toISOString()}`);
      console.log(`   - End time: ${endTime.toISOString()}`);
      console.log(`   - Duration: ${task.duration} minutes`);
      
      const event = {
        summary: task.title,
        description: `${task.description || ''}\n\n🏆 Gold Reward: ${task.goldValue}\n⚡ Importance: ${task.importance || 'Not set'}\n📋 ProductivityQuest Task ID: ${task.id}`,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: user.timezone || 'America/Los_Angeles',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: user.timezone || 'America/Los_Angeles',
        },
        colorId: this.getColorForImportance(task.importance || undefined),
      };

      const response = await calendar.events.update({
        calendarId: calendarId,
        eventId: task.googleEventId,
        requestBody: event,
      });

      return response.data;
    } catch (error: any) {
      console.error('Error updating Google Calendar event:', error.message);
      
      // Auth errors - throw so the caller can inform the user
      if (error.code === 401) {
        if (error.message?.includes('invalid_grant')) {
          console.error('⚠️ Refresh token invalid - user needs to re-authorize');
          throw new Error('Google Calendar authorization expired. Please re-connect your Google Calendar.');
        }
        console.error('⚠️ Access token expired or invalid');
        throw new Error('Google Calendar access expired. Please re-sync.');
      }
      
      // If event not found, it may have been deleted from Google Calendar
      if (error.code === 404) {
        console.warn('⚠️ Event not found in Google Calendar (may have been deleted)');
        return null;
      }
      
      // For rate limit or server errors, throw with descriptive message
      if (error.code === 403) {
        console.error('⚠️ Google Calendar API rate limit or permission error');
        throw new Error('Google Calendar rate limit reached. Try again in a moment.');
      }
      
      // For other errors, throw with the error message
      console.warn('⚠️ Calendar update error:', error.message);
      throw new Error(`Google Calendar sync failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Delete an event from Google Calendar
   */
  async deleteEvent(user: User, eventId: string, calendarId: string = 'primary'): Promise<boolean> {
    try {
      let auth: OAuth2Client;
      
      if (user.googleCalendarClientId && user.googleCalendarClientSecret && 
          user.googleCalendarAccessToken && user.googleCalendarRefreshToken) {
        auth = new OAuth2Client(
          user.googleCalendarClientId,
          user.googleCalendarClientSecret,
          getGoogleCalendarRedirectUri()
        );
        
        auth.setCredentials({
          access_token: user.googleCalendarAccessToken,
          refresh_token: user.googleCalendarRefreshToken,
          expiry_date: user.googleCalendarTokenExpiry?.getTime(),
        });
      } else {
        auth = this.getAuthenticatedClient(user);
      }

      const calendar = google.calendar({ version: 'v3', auth });
      
      await calendar.events.delete({
        calendarId: calendarId,
        eventId: eventId,
      });

      console.log(`✅ Deleted Google Calendar event: ${eventId}`);
      return true;
    } catch (error: any) {
      console.error('Error deleting Google Calendar event:', error);
      
      // If event not found, consider it already deleted
      if (error.code === 404) {
        console.warn('⚠️ Event not found in Google Calendar (may have been already deleted)');
        return true;
      }
      
      throw error;
    }
  }

  private getColorForImportance(importance?: string): string {
    // Google Calendar color IDs:
    // 1 = Blue, 2 = Green, 3 = Purple, 4 = Red, 5 = Yellow, 6 = Orange, 7 = Turquoise, 8 = Gray, 9 = Bold Blue, 10 = Bold Green, 11 = Bold Red
    const colorMap: { [key: string]: string } = {
      'Pareto': '11', // Bold Red
      'High': '11',   // Bold Red
      'Med-High': '6', // Orange
      'Medium': '5',   // Yellow
      'Med-Low': '1',  // Blue
      'Low': '2',      // Green
    };
    
    return colorMap[importance || 'Medium'] || '5'; // Default to yellow for Medium
  }
}

export const googleCalendar = new GoogleCalendarService();