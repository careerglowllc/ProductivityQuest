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
      scope: ['https://www.googleapis.com/auth/calendar.events'],
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

    const event = {
      summary: task.title,
      description: `${task.description}\n\nGold Reward: ${task.goldValue}`,
      start: {
        dateTime: task.dueDate?.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: new Date(task.dueDate!.getTime() + task.duration * 60000).toISOString(),
        timeZone: 'UTC',
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

  async syncTasks(tasks: Task[], user: User): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

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
          console.log(`📅 [SYNC TASKS] Creating event for task ${task.id} "${task.title}"`);
          console.log(`   - Due date: ${task.dueDate}`);
          console.log(`   - Duration: ${task.duration} minutes`);
          console.log(`   - Importance: ${task.importance}`);
          
          const event = {
            summary: task.title,
            description: `${task.description}\n\nGold Reward: ${task.goldValue}\nImportance: ${task.importance || 'Not set'}`,
            start: {
              dateTime: task.dueDate.toISOString(),
              timeZone: 'UTC',
            },
            end: {
              dateTime: new Date(task.dueDate.getTime() + task.duration * 60000).toISOString(),
              timeZone: 'UTC',
            },
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'popup', minutes: 15 },
                { method: 'email', minutes: 60 },
              ],
            },
            // Color based on importance
            colorId: this.getColorForImportance(task.importance || undefined),
          };

          const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
          });
          
          console.log(`✅ [SYNC TASKS] Successfully created event for task ${task.id}, Google Event ID: ${response.data.id}`);

          success++;
        } catch (error: any) {
          console.error(`❌ [SYNC TASKS] Failed to create calendar event for task ${task.id}:`, error.message);
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

    return { success, failed };
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
      
      // First fetch the calendar list to get color information
      const calendarListResponse = await calendar.calendarList.list();
      const calendarsMetadata = calendarListResponse.data.items || [];
      
      // Create a map of calendar ID to metadata
      const calendarMetadataMap = new Map(
        calendarsMetadata.map(cal => [cal.id!, cal])
      );
      
      // If no specific calendars requested, fetch from all calendars
      let calendarsToFetch = calendarIds;
      if (!calendarsToFetch || calendarsToFetch.length === 0) {
        calendarsToFetch = calendarsMetadata.map(cal => cal.id!) || ['primary'];
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
            (event as any).calendarName = calMetadata?.summary || 'Unknown';
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
      if (!task.googleEventId || !task.googleCalendarId || !task.dueDate) {
        return null; // Task is not synced to Google Calendar
      }

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
      
      const event = {
        summary: task.title,
        description: `${task.description}\n\nGold Reward: ${task.goldValue}\nImportance: ${task.importance || 'Not set'}`,
        start: {
          dateTime: task.dueDate.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: new Date(task.dueDate.getTime() + task.duration * 60000).toISOString(),
          timeZone: 'UTC',
        },
        colorId: this.getColorForImportance(task.importance || undefined),
      };

      const response = await calendar.events.update({
        calendarId: task.googleCalendarId,
        eventId: task.googleEventId,
        requestBody: event,
      });

      return response.data;
    } catch (error: any) {
      console.error('Error updating Google Calendar event:', error);
      
      // Only throw auth expired for genuine invalid_grant errors
      if (error.code === 401 && error.message?.includes('invalid_grant')) {
        console.error('⚠️ Refresh token invalid - user needs to re-authorize');
        throw new Error('CALENDAR_AUTH_EXPIRED');
      }
      
      // If event not found, it may have been deleted from Google Calendar
      if (error.code === 404) {
        console.warn('⚠️ Event not found in Google Calendar (may have been deleted)');
        return null;
      }
      
      // For other errors, log but don't fail completely
      console.warn('⚠️ Non-fatal calendar update error:', error.message);
      return null;
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