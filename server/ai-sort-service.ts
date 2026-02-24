/**
 * AI-Powered Task Sorting Service
 * 
 * Uses OpenAI to intelligently schedule tasks based on:
 * - Task priorities, durations, and titles
 * - User's past feedback and verbal sorting preferences
 * - Current time of day (tasks go after "now" for today)
 * - Blocked time slots from Google Calendar
 * - Learned user preferences from feedback history
 */

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TaskForAISort {
  id: number;
  title: string;
  duration: number; // minutes
  importance: string;
  currentStartTime?: string;
  currentEndTime?: string;
}

export interface BlockedSlot {
  start: Date;
  end: Date;
  title?: string;
}

export interface AIScheduledTask {
  taskId: number;
  startTime: string;
  endTime: string;
}

interface FeedbackEntry {
  feedbackType: string;
  feedbackReason?: string;
  taskMetadata?: Array<{ taskId: number; priority: string; duration: number; title: string }>;
  createdAt?: Date;
}

/**
 * Extract user sorting rules from their feedback history.
 * Returns a list of natural-language rules the AI should follow.
 */
function extractUserRules(feedbackHistory: FeedbackEntry[]): string[] {
  const rules: string[] = [];
  
  for (const entry of feedbackHistory) {
    if (entry.feedbackReason && entry.feedbackReason.trim()) {
      // All feedback reasons are treated as user preferences
      rules.push(entry.feedbackReason.trim());
    }
  }
  
  // Deduplicate similar rules (keep most recent first since feedbackHistory is ordered desc)
  const uniqueRules: string[] = [];
  const seen = new Set<string>();
  for (const rule of rules) {
    const normalized = rule.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    if (!seen.has(normalized) && normalized.length > 5) {
      seen.add(normalized);
      uniqueRules.push(rule);
    }
  }
  
  return uniqueRules.slice(0, 10); // Keep last 10 unique rules
}

/**
 * Sort tasks using AI (OpenAI) with personalized user preferences from feedback.
 */
export async function sortTasksAI(
  tasks: TaskForAISort[],
  targetDate: Date,
  currentTime: Date,
  timezoneOffset: number,
  blockedSlots: BlockedSlot[],
  feedbackHistory: FeedbackEntry[],
  preferences: { preferredStartHour: number; preferredEndHour: number; breakDuration: number }
): Promise<AIScheduledTask[]> {
  if (tasks.length === 0) return [];
  
  // If no OpenAI API key, fall back to basic priority sort
  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️ [AI-SORT] No OpenAI API key, falling back to basic sort');
    return fallbackSort(tasks, targetDate, timezoneOffset, blockedSlots, preferences);
  }

  const userRules = extractUserRules(feedbackHistory);
  
  // Calculate current local time for the user
  const nowLocal = new Date(currentTime.getTime() - timezoneOffset * 60000);
  const currentLocalHour = nowLocal.getUTCHours();
  const currentLocalMinute = nowLocal.getUTCMinutes();
  const isToday = (() => {
    const targetLocal = new Date(targetDate.getTime() - timezoneOffset * 60000);
    return targetLocal.getUTCFullYear() === nowLocal.getUTCFullYear() &&
           targetLocal.getUTCMonth() === nowLocal.getUTCMonth() &&
           targetLocal.getUTCDate() === nowLocal.getUTCDate();
  })();

  // Format blocked slots for the prompt
  const blockedSlotsText = blockedSlots.map(slot => {
    const startLocal = new Date(slot.start.getTime() - timezoneOffset * 60000);
    const endLocal = new Date(slot.end.getTime() - timezoneOffset * 60000);
    const startStr = `${startLocal.getUTCHours()}:${String(startLocal.getUTCMinutes()).padStart(2, '0')}`;
    const endStr = `${endLocal.getUTCHours()}:${String(endLocal.getUTCMinutes()).padStart(2, '0')}`;
    return `- ${startStr} to ${endStr}: "${slot.title || 'Busy'}"`;
  }).join('\n');

  // Format tasks for the prompt
  const tasksText = tasks.map(t => {
    let currentTimeStr = '';
    if (t.currentStartTime) {
      const startLocal = new Date(new Date(t.currentStartTime).getTime() - timezoneOffset * 60000);
      currentTimeStr = ` (currently at ${startLocal.getUTCHours()}:${String(startLocal.getUTCMinutes()).padStart(2, '0')})`;
    }
    return `- ID:${t.id} "${t.title}" | Priority: ${t.importance} | Duration: ${t.duration}min${currentTimeStr}`;
  }).join('\n');

  // Build user rules section
  const userRulesText = userRules.length > 0 
    ? `\n## User's Personal Sorting Preferences (IMPORTANT - follow these):\n${userRules.map((r, i) => `${i + 1}. "${r}"`).join('\n')}\n`
    : '';

  const prompt = `You are a calendar scheduling AI. Schedule the following tasks for ${isToday ? 'TODAY' : 'a specific day'}.

## Current Context:
- ${isToday ? `Current time: ${currentLocalHour}:${String(currentLocalMinute).padStart(2, '0')}` : `Scheduling for a future date`}
- Working hours: ${preferences.preferredStartHour}:00 to ${preferences.preferredEndHour}:00
- Break between tasks: ${preferences.breakDuration} minutes
${isToday ? `- CRITICAL: ALL tasks MUST be scheduled AFTER the current time (${currentLocalHour}:${String(currentLocalMinute).padStart(2, '0')}). Round up to the next 5-minute increment.` : ''}

## Blocked Time Slots (DO NOT schedule tasks during these):
${blockedSlotsText || '(none)'}
${userRulesText}
## Tasks to Schedule:
${tasksText}

## Default Rules:
1. Higher priority tasks should generally come first (Pareto > High > Med-High > Medium > Med-Low > Low)
2. Tasks must NOT overlap with each other or with blocked slots
3. Schedule tasks within working hours
4. ${isToday ? 'Tasks MUST start AFTER the current time' : 'Start from the preferred start hour'}
5. If a user preference conflicts with a default rule, FOLLOW THE USER PREFERENCE

Respond with ONLY a JSON array of objects, each with: taskId (number), startHour (number 0-23), startMinute (number 0-59). Order them chronologically.
Example: [{"taskId": 1, "startHour": 9, "startMinute": 0}, {"taskId": 2, "startHour": 10, "startMinute": 30}]`;

  try {
    console.log('🤖 [AI-SORT] Calling OpenAI for task scheduling...');
    console.log('🤖 [AI-SORT] User rules:', userRules);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You are a precise calendar scheduling assistant. Return ONLY valid JSON arrays. No explanation text." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) throw new Error('Empty response from OpenAI');

    console.log('🤖 [AI-SORT] Raw response:', content);

    // Parse the JSON response - extract JSON from possible markdown
    let jsonStr = content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const aiSchedule: Array<{ taskId: number; startHour: number; startMinute: number }> = JSON.parse(jsonStr);

    // Convert AI response to full ISO timestamps
    const scheduledTasks: AIScheduledTask[] = aiSchedule.map(item => {
      const task = tasks.find(t => t.id === item.taskId);
      const duration = task?.duration || 60;

      // Build UTC time from local hour/minute
      // local_hour + offset_hours = UTC_hour
      const utcStartHour = item.startHour + (timezoneOffset / 60);
      const startTime = new Date(targetDate);
      startTime.setUTCHours(Math.floor(utcStartHour), item.startMinute + ((utcStartHour % 1) * 60), 0, 0);
      
      const endTime = new Date(startTime.getTime() + duration * 60000);

      return {
        taskId: item.taskId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      };
    });

    console.log('🤖 [AI-SORT] Scheduled', scheduledTasks.length, 'tasks');
    return scheduledTasks;

  } catch (error: any) {
    console.error('🤖 [AI-SORT] OpenAI error, falling back to basic sort:', error.message);
    return fallbackSort(tasks, targetDate, timezoneOffset, blockedSlots, preferences);
  }
}

/**
 * Fallback: basic priority-based sort when AI is unavailable
 */
function fallbackSort(
  tasks: TaskForAISort[],
  targetDate: Date,
  timezoneOffset: number,
  blockedSlots: BlockedSlot[],
  preferences: { preferredStartHour: number; preferredEndHour: number; breakDuration: number }
): AIScheduledTask[] {
  const priorityOrder: Record<string, number> = {
    'pareto': 0, 'high': 1, 'med-high': 2, 'medium': 3, 'med-low': 4, 'low': 5
  };

  const sorted = [...tasks].sort((a, b) => {
    const pa = priorityOrder[a.importance?.toLowerCase() || 'medium'] ?? 3;
    const pb = priorityOrder[b.importance?.toLowerCase() || 'medium'] ?? 3;
    return pa - pb;
  });

  // Start from now (rounded up to next 5 min) or preferred start hour
  const now = new Date();
  const nowLocal = new Date(now.getTime() - timezoneOffset * 60000);
  const targetLocal = new Date(targetDate.getTime() - timezoneOffset * 60000);
  const isToday = targetLocal.getUTCFullYear() === nowLocal.getUTCFullYear() &&
    targetLocal.getUTCMonth() === nowLocal.getUTCMonth() &&
    targetLocal.getUTCDate() === nowLocal.getUTCDate();

  let currentLocalMinutes: number;
  if (isToday) {
    currentLocalMinutes = nowLocal.getUTCHours() * 60 + nowLocal.getUTCMinutes();
    currentLocalMinutes = Math.ceil(currentLocalMinutes / 5) * 5; // Round up to 5
  } else {
    currentLocalMinutes = preferences.preferredStartHour * 60;
  }

  const sortedBlockedSlots = [...blockedSlots].sort((a, b) => a.start.getTime() - b.start.getTime());

  const result: AIScheduledTask[] = [];
  for (const task of sorted) {
    let startMinutes = currentLocalMinutes;

    // Skip past blocked slots
    for (const slot of sortedBlockedSlots) {
      const slotStartLocal = new Date(slot.start.getTime() - timezoneOffset * 60000);
      const slotEndLocal = new Date(slot.end.getTime() - timezoneOffset * 60000);
      const slotStartMin = slotStartLocal.getUTCHours() * 60 + slotStartLocal.getUTCMinutes();
      const slotEndMin = slotEndLocal.getUTCHours() * 60 + slotEndLocal.getUTCMinutes();

      const taskEndMin = startMinutes + task.duration;
      if (startMinutes < slotEndMin && taskEndMin > slotStartMin) {
        startMinutes = slotEndMin + preferences.breakDuration;
      }
    }

    const startHour = Math.floor(startMinutes / 60);
    const startMin = startMinutes % 60;
    const utcStartHour = startHour + (timezoneOffset / 60);

    const startTime = new Date(targetDate);
    startTime.setUTCHours(Math.floor(utcStartHour), startMin + ((utcStartHour % 1) * 60), 0, 0);
    const endTime = new Date(startTime.getTime() + task.duration * 60000);

    result.push({
      taskId: task.id,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    });

    currentLocalMinutes = startMinutes + task.duration + preferences.breakDuration;
  }

  return result;
}
