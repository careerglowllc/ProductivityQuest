import { google } from 'googleapis';
import { Task } from '@shared/schema';

export interface GoogleCalendarService {
  createEvent(task: Task): Promise<void>;
  syncTasks(tasks: Task[]): Promise<void>;
}

class GoogleCalendarClient implements GoogleCalendarService {
  private calendar: any;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    this.calendar = google.calendar({ version: 'v3', auth });
  }

  async createEvent(task: Task): Promise<void> {
    if (!task.dueDate) {
      throw new Error('Task must have a due date to create calendar event');
    }

    const startTime = new Date(task.dueDate);
    const endTime = new Date(startTime.getTime() + task.duration * 60000); // Add duration in milliseconds

    const event = {
      summary: task.title,
      description: `${task.description}\n\nGold Reward: ${task.goldValue} coins\nDuration: ${task.duration} minutes`,
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
    };

    try {
      await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  async syncTasks(tasks: Task[]): Promise<void> {
    const pendingTasks = tasks.filter(task => !task.completed && task.dueDate);
    
    for (const task of pendingTasks) {
      try {
        await this.createEvent(task);
      } catch (error) {
        console.error(`Failed to sync task ${task.id}:`, error);
        // Continue with other tasks even if one fails
      }
    }
  }
}

export const googleCalendar = new GoogleCalendarClient();
