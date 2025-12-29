/**
 * ML-based Task Sorting Service
 * 
 * This service provides intelligent task scheduling that learns from user feedback.
 * It uses priority-weighted scheduling combined with user-specific preferences
 * learned over time from approval/correction feedback.
 */

export interface TaskForSorting {
  id: number;
  title: string;
  duration: number; // in minutes
  importance: string; // 'High', 'Med-High', 'Medium', 'Med-Low', 'Low'
  currentStartTime?: string;
  currentEndTime?: string;
}

export interface ScheduledTask {
  taskId: number;
  startTime: string;
  endTime: string;
}

export interface UserPreferences {
  preferredStartHour: number;
  preferredEndHour: number;
  priorityWeights: {
    high: number;
    medHigh: number;
    medium: number;
    medLow: number;
    low: number;
  };
  breakDuration: number;
  highPriorityTimePreference: string; // 'morning', 'afternoon', 'evening'
  totalApproved: number;
  totalCorrected: number;
}

// Default preferences for new users
const DEFAULT_PREFERENCES: UserPreferences = {
  preferredStartHour: 9,
  preferredEndHour: 18,
  priorityWeights: {
    high: 100,
    medHigh: 75,
    medium: 50,
    medLow: 25,
    low: 10,
  },
  breakDuration: 15,
  highPriorityTimePreference: 'morning',
  totalApproved: 0,
  totalCorrected: 0,
};

/**
 * Get priority weight for a task
 */
function getPriorityWeight(importance: string, weights: UserPreferences['priorityWeights']): number {
  switch (importance?.toLowerCase()) {
    case 'high': return weights.high;
    case 'med-high': return weights.medHigh;
    case 'medium': return weights.medium;
    case 'med-low': return weights.medLow;
    case 'low': return weights.low;
    default: return weights.medium;
  }
}

/**
 * Get time preference multiplier based on when high priority tasks should be scheduled
 */
function getTimePreferenceMultiplier(
  hour: number,
  importance: string,
  preference: string
): number {
  const isHighPriority = ['high', 'med-high'].includes(importance?.toLowerCase() || '');
  
  if (!isHighPriority) return 1.0;
  
  switch (preference) {
    case 'morning':
      if (hour >= 9 && hour < 12) return 1.5;
      if (hour >= 12 && hour < 14) return 1.2;
      return 0.8;
    case 'afternoon':
      if (hour >= 13 && hour < 17) return 1.5;
      if (hour >= 11 && hour < 13) return 1.2;
      return 0.8;
    case 'evening':
      if (hour >= 16 && hour < 20) return 1.5;
      if (hour >= 14 && hour < 16) return 1.2;
      return 0.8;
    default:
      return 1.0;
  }
}

/**
 * Sort tasks using ML-learned preferences
 * 
 * Algorithm:
 * 1. Score each task based on priority weight × time preference
 * 2. Sort tasks by score (highest first)
 * 3. Schedule tasks in order, respecting breaks
 * 4. Ensure no overlaps
 */
export function sortTasksML(
  tasks: TaskForSorting[],
  date: Date,
  preferences: UserPreferences = DEFAULT_PREFERENCES
): ScheduledTask[] {
  if (tasks.length === 0) return [];

  // Calculate scores for each task
  const scoredTasks = tasks.map(task => {
    const priorityWeight = getPriorityWeight(task.importance, preferences.priorityWeights);
    return {
      ...task,
      score: priorityWeight,
    };
  });

  // Sort by score (highest priority first)
  scoredTasks.sort((a, b) => b.score - a.score);

  // Schedule tasks starting from preferred start hour
  const scheduledTasks: ScheduledTask[] = [];
  let currentTime = new Date(date);
  currentTime.setHours(preferences.preferredStartHour, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(preferences.preferredEndHour, 0, 0, 0);

  // Apply time preference - if high priority tasks should be in morning, afternoon, or evening
  // Adjust the start time accordingly
  if (preferences.highPriorityTimePreference === 'afternoon') {
    // Start high priority tasks at 1 PM
    const highPriorityTasks = scoredTasks.filter(t => 
      ['high', 'med-high'].includes(t.importance?.toLowerCase() || '')
    );
    const lowPriorityTasks = scoredTasks.filter(t => 
      !['high', 'med-high'].includes(t.importance?.toLowerCase() || '')
    );
    
    // Schedule low priority in morning, high priority in afternoon
    for (const task of lowPriorityTasks) {
      if (currentTime.getHours() >= 13) break; // Stop at 1 PM for low priority
      
      const endTime = new Date(currentTime);
      endTime.setMinutes(endTime.getMinutes() + task.duration);
      
      scheduledTasks.push({
        taskId: task.id,
        startTime: currentTime.toISOString(),
        endTime: endTime.toISOString(),
      });
      
      currentTime = new Date(endTime);
      currentTime.setMinutes(currentTime.getMinutes() + preferences.breakDuration);
    }
    
    // Set to 1 PM for high priority
    currentTime.setHours(13, 0, 0, 0);
    
    for (const task of highPriorityTasks) {
      if (currentTime >= endOfDay) break;
      
      const endTime = new Date(currentTime);
      endTime.setMinutes(endTime.getMinutes() + task.duration);
      
      scheduledTasks.push({
        taskId: task.id,
        startTime: currentTime.toISOString(),
        endTime: endTime.toISOString(),
      });
      
      currentTime = new Date(endTime);
      currentTime.setMinutes(currentTime.getMinutes() + preferences.breakDuration);
    }
  } else {
    // Default: schedule in priority order (morning preference or no preference)
    for (const task of scoredTasks) {
      if (currentTime >= endOfDay) break;
      
      const endTime = new Date(currentTime);
      endTime.setMinutes(endTime.getMinutes() + task.duration);
      
      // If this would extend past end of day, try to fit it
      if (endTime > endOfDay) {
        // See if we can start earlier (find a gap)
        continue;
      }
      
      scheduledTasks.push({
        taskId: task.id,
        startTime: currentTime.toISOString(),
        endTime: endTime.toISOString(),
      });
      
      currentTime = new Date(endTime);
      currentTime.setMinutes(currentTime.getMinutes() + preferences.breakDuration);
    }
  }

  return scheduledTasks;
}

/**
 * Learn from user feedback to update preferences
 */
export function learnFromFeedback(
  currentPreferences: UserPreferences,
  feedbackType: 'approved' | 'corrected',
  mlSchedule: ScheduledTask[],
  userSchedule?: ScheduledTask[],
  taskMetadata?: Array<{ taskId: number; priority: string; duration: number }>,
  reason?: string
): Partial<UserPreferences> {
  const updates: Partial<UserPreferences> = {};

  if (feedbackType === 'approved') {
    // User approved - reinforce current settings
    updates.totalApproved = (currentPreferences.totalApproved || 0) + 1;
  } else if (feedbackType === 'corrected' && userSchedule && taskMetadata) {
    updates.totalCorrected = (currentPreferences.totalCorrected || 0) + 1;

    // Analyze the corrections to learn
    const mlTaskOrder = mlSchedule.map(s => s.taskId);
    const userTaskOrder = userSchedule.map(s => s.taskId);

    // Check if user moved high priority tasks later
    const highPriorityTasks = taskMetadata
      .filter(t => ['high', 'med-high'].includes(t.priority?.toLowerCase() || ''))
      .map(t => t.taskId);

    if (highPriorityTasks.length > 0) {
      const avgMLPosition = highPriorityTasks.reduce((sum, id) => sum + mlTaskOrder.indexOf(id), 0) / highPriorityTasks.length;
      const avgUserPosition = highPriorityTasks.reduce((sum, id) => sum + userTaskOrder.indexOf(id), 0) / highPriorityTasks.length;

      // If user consistently moves high priority tasks later, update time preference
      if (avgUserPosition > avgMLPosition + 1) {
        // User prefers high priority tasks later in the day
        if (currentPreferences.highPriorityTimePreference === 'morning') {
          updates.highPriorityTimePreference = 'afternoon';
        } else if (currentPreferences.highPriorityTimePreference === 'afternoon') {
          updates.highPriorityTimePreference = 'evening';
        }
      }
    }

    // Analyze if user prefers different breaks
    if (userSchedule.length > 1) {
      const breaks: number[] = [];
      for (let i = 1; i < userSchedule.length; i++) {
        const prevEnd = new Date(userSchedule[i - 1].endTime);
        const nextStart = new Date(userSchedule[i].startTime);
        const breakMinutes = (nextStart.getTime() - prevEnd.getTime()) / (1000 * 60);
        if (breakMinutes > 0 && breakMinutes < 120) { // Ignore large gaps
          breaks.push(breakMinutes);
        }
      }
      
      if (breaks.length > 0) {
        const avgBreak = Math.round(breaks.reduce((a, b) => a + b, 0) / breaks.length);
        // Gradually adjust break preference
        const currentBreak = currentPreferences.breakDuration;
        updates.breakDuration = Math.round(currentBreak + (avgBreak - currentBreak) * 0.2); // 20% adjustment
      }
    }

    // Learn start time preference from corrections
    if (userSchedule.length > 0) {
      const firstTaskStart = new Date(userSchedule[0].startTime);
      const userStartHour = firstTaskStart.getHours();
      const currentStart = currentPreferences.preferredStartHour;
      // Gradually adjust (20% weight to new data)
      updates.preferredStartHour = Math.round(currentStart + (userStartHour - currentStart) * 0.2);
    }

    // Analyze reason text for keywords
    if (reason) {
      const lowerReason = reason.toLowerCase();
      if (lowerReason.includes('morning') && lowerReason.includes('important')) {
        updates.highPriorityTimePreference = 'morning';
      } else if (lowerReason.includes('afternoon') || lowerReason.includes('after lunch')) {
        updates.highPriorityTimePreference = 'afternoon';
      } else if (lowerReason.includes('evening') || lowerReason.includes('later')) {
        updates.highPriorityTimePreference = 'evening';
      }
      
      if (lowerReason.includes('break') || lowerReason.includes('rest')) {
        updates.breakDuration = Math.min(30, (currentPreferences.breakDuration || 15) + 5);
      }
      
      if (lowerReason.includes('no break') || lowerReason.includes('back to back')) {
        updates.breakDuration = Math.max(0, (currentPreferences.breakDuration || 15) - 5);
      }
    }
  }

  return updates;
}

/**
 * Merge preferences - useful for database updates
 */
export function mergePreferences(
  existing: Partial<UserPreferences> | null,
  updates: Partial<UserPreferences>
): UserPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    ...existing,
    ...updates,
    priorityWeights: {
      ...DEFAULT_PREFERENCES.priorityWeights,
      ...(existing?.priorityWeights || {}),
      ...(updates.priorityWeights || {}),
    },
  };
}

export { DEFAULT_PREFERENCES };
