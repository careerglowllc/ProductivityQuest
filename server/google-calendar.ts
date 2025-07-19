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

// Log initial configuration at startup
console.log('🔗 Google OAuth Redirect URI:', getRedirectUri());
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
          const oauth2Client = new OAuth2Client(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            REDIRECT_URI
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

    try {
      const auth = this.getAuthenticatedClient(user);
      const calendar = google.calendar({ version: 'v3', auth });

      for (const task of tasks) {
        if (!task.dueDate) continue;

        try {
          const event = {
            summary: task.title,
            description: `${task.description}\n\nGold Reward: ${task.goldValue}\nImportance: ${task.importance || 'Not set'}\nLife Domain: ${task.lifeDomain || 'Not set'}`,
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
            colorId: this.getColorForImportance(task.importance),
          };

          await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
          });

          success++;
        } catch (error) {
          console.error(`Failed to create calendar event for task ${task.id}:`, error);
          failed++;
        }
      }
    } catch (error) {
      console.error('Calendar sync error:', error);
      throw error;
    }

    return { success, failed };
  }

  private getColorForImportance(importance?: string): string {
    const colorMap: { [key: string]: string } = {
      'Pareto': '11', // Red
      'High': '6',    // Orange
      'Med-High': '5', // Yellow
      'Medium': '2',   // Green
      'Med-Low': '1',  // Blue
      'Low': '8',      // Gray
    };
    
    return colorMap[importance || 'Medium'] || '2';
  }
}

export const googleCalendar = new GoogleCalendarService();