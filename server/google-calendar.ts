import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { Task, User } from '@shared/schema';

export class GoogleCalendarService {
  private getAuthenticatedClient(user: User): JWT {
    if (!user.googleClientEmail || !user.googlePrivateKey) {
      throw new Error('Google service account credentials not configured');
    }

    // Clean up the private key - remove extra quotes and handle newlines
    let privateKey = user.googlePrivateKey;
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, '\n');

    return new JWT({
      email: user.googleClientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
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