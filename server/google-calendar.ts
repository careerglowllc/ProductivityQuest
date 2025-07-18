import { google } from 'googleapis';
import { Task, User } from '@shared/schema';

export interface GoogleCalendarService {
  getAuthUrl(): string;
  getTokensFromCode(code: string): Promise<{ accessToken: string; refreshToken: string; expiry: Date }>;
  createEvent(task: Task, user: User): Promise<void>;
  syncTasks(tasks: Task[], user: User): Promise<{ success: number; failed: number }>;
  refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiry: Date }>;
}

class GoogleCalendarClient implements GoogleCalendarService {
  private oauth2Client: any;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NODE_ENV === 'production' 
        ? `${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`
        : 'http://localhost:5000/api/auth/google/callback'
    );
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar'],
      prompt: 'consent', // Forces refresh token to be returned
    });
  }

  async getTokensFromCode(code: string): Promise<{ accessToken: string; refreshToken: string; expiry: Date }> {
    const { tokens } = await this.oauth2Client.getToken(code);
    
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiry: new Date(tokens.expiry_date)
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiry: Date }> {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    
    return {
      accessToken: credentials.access_token,
      expiry: new Date(credentials.expiry_date)
    };
  }

  private async getCalendarClient(user: User): Promise<any> {
    if (!user.googleAccessToken) {
      throw new Error('User has not authorized Google Calendar access');
    }

    // Check if token is expired and refresh if needed
    const now = new Date();
    if (user.googleTokenExpiry && user.googleTokenExpiry <= now) {
      if (!user.googleRefreshToken) {
        throw new Error('Google token expired and no refresh token available');
      }
      
      const { accessToken, expiry } = await this.refreshAccessToken(user.googleRefreshToken);
      
      // Update user tokens (this would need to be handled by the caller)
      throw new Error('TOKEN_REFRESH_NEEDED:' + JSON.stringify({ accessToken, expiry }));
    }

    this.oauth2Client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
    });

    return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  async createEvent(task: Task, user: User): Promise<void> {
    if (!task.dueDate) {
      throw new Error('Task must have a due date to create calendar event');
    }

    const calendar = await this.getCalendarClient(user);
    const startTime = new Date(task.dueDate);
    const endTime = new Date(startTime.getTime() + task.duration * 60000); // Add duration in milliseconds

    const event = {
      summary: `🎯 ${task.title}`,
      description: `${task.description}\n\n💰 Gold Reward: ${task.goldValue} coins\n⏱️ Duration: ${task.duration} minutes${task.importance ? `\n📈 Importance: ${task.importance}` : ''}${task.lifeDomain ? `\n🌟 Life Domain: ${task.lifeDomain}` : ''}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'America/New_York', // Default timezone, can be made configurable
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'America/New_York',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 15 },
          { method: 'email', minutes: 60 },
        ],
      },
      colorId: this.getEventColor(task.importance),
    };

    try {
      await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  private getEventColor(importance?: string): string {
    // Google Calendar color IDs
    const colorMap: { [key: string]: string } = {
      'Pareto': '11', // Red
      'High': '9',    // Blue
      'Med-High': '3', // Purple
      'Medium': '6',   // Orange
      'Med-Low': '5',  // Yellow
      'Low': '2',      // Green
    };
    
    return colorMap[importance || 'Medium'] || '6'; // Default to orange
  }

  async syncTasks(tasks: Task[], user: User): Promise<{ success: number; failed: number }> {
    const pendingTasks = tasks.filter(task => !task.completed && task.dueDate);
    let success = 0;
    let failed = 0;
    
    for (const task of pendingTasks) {
      try {
        await this.createEvent(task, user);
        success++;
      } catch (error) {
        console.error(`Failed to sync task ${task.id}:`, error);
        failed++;
      }
    }
    
    return { success, failed };
  }
}

export const googleCalendar = new GoogleCalendarClient();
