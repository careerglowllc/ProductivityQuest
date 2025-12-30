/**
 * ML-based Task Sorting Service
 * 
 * This service provides intelligent task scheduling that learns from user feedback.
 * It uses priority-weighted scheduling combined with user-specific preferences
 * learned over time from approval/correction feedback.
 * 
 * Core Rules (always applied):
 * 1. Higher priority tasks come first (Pareto > High > Med-High > Medium > Med-Low > Low)
 * 2. Tasks cannot overlap - they must be scheduled sequentially
 * 3. Tasks are scheduled within working hours with optional breaks
 */

export interface TaskForSorting {
  id: number;
  title: string;
  duration: number; // in minutes
  importance: string; // 'Pareto', 'High', 'Med-High', 'Medium', 'Med-Low', 'Low'
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
    pareto: number;
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

// Default preferences for new users - these encode basic scheduling rules
const DEFAULT_PREFERENCES: UserPreferences = {
  preferredStartHour: 8,   // Don't schedule tasks before 8am
  preferredEndHour: 22,    // Don't schedule tasks after 10pm
  priorityWeights: {
    pareto: 150,  // Pareto tasks are highest priority
    high: 100,
    medHigh: 75,
    medium: 50,
    medLow: 25,
    low: 10,
  },
  breakDuration: 0, // No breaks by default - tightly pack tasks
  highPriorityTimePreference: 'morning',
  totalApproved: 0,
  totalCorrected: 0,
};

/**
 * Get priority weight for a task
 */
function getPriorityWeight(importance: string, weights: UserPreferences['priorityWeights']): number {
  const normalized = importance?.toLowerCase()?.trim() || '';
  switch (normalized) {
    case 'pareto': return weights.pareto || 150;
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
 * Core Algorithm:
 * 1. Score each task based on priority weight
 * 2. Sort tasks by score (highest priority first - Pareto > High > Med-High > Medium > Med-Low > Low)
 * 3. Find the earliest current start time among all tasks
 * 4. Schedule tasks sequentially starting from that time, respecting breaks
 * 5. Ensure NO overlaps - tasks are packed tightly
 */
export function sortTasksML(
  tasks: TaskForSorting[],
  date: Date,
  preferences: UserPreferences = DEFAULT_PREFERENCES
): ScheduledTask[] {
  if (tasks.length === 0) return [];

  console.log('📊 [ML-SORT] Starting sort with', tasks.length, 'tasks');
  console.log('📊 [ML-SORT] Preferences:', JSON.stringify(preferences, null, 2));

  // Calculate scores for each task based on priority
  const scoredTasks = tasks.map(task => {
    const priorityWeight = getPriorityWeight(task.importance, preferences.priorityWeights);
    console.log(`📊 [ML-SORT] Task "${task.title}" (${task.importance}) -> score ${priorityWeight}`);
    return {
      ...task,
      score: priorityWeight,
    };
  });

  // Sort by score (highest priority first)
  scoredTasks.sort((a, b) => {
    // Primary: sort by priority score (descending)
    if (b.score !== a.score) return b.score - a.score;
    // Secondary: shorter tasks first (for ties)
    return a.duration - b.duration;
  });

  console.log('📊 [ML-SORT] Sorted order:');
  scoredTasks.forEach((t, i) => console.log(`   ${i + 1}. "${t.title}" (${t.importance}, score: ${t.score})`));

  // Find the earliest current start time among all tasks
  // This anchors our schedule to when tasks were originally placed
  let anchorTime: Date | null = null;
  for (const task of tasks) {
    if (task.currentStartTime) {
      const taskStart = new Date(task.currentStartTime);
      if (!anchorTime || taskStart < anchorTime) {
        anchorTime = taskStart;
      }
    }
  }

  // If no tasks have start times, use preferred start hour
  if (!anchorTime) {
    anchorTime = new Date(date);
    anchorTime.setHours(preferences.preferredStartHour, 0, 0, 0);
  }

  // Enforce minimum start hour constraint (e.g., no tasks before 8am)
  const minStartHour = preferences.preferredStartHour;
  const anchorHour = anchorTime.getHours();
  if (anchorHour < minStartHour) {
    console.log(`📊 [ML-SORT] Anchor time ${anchorHour}:00 is before ${minStartHour}:00, adjusting to ${minStartHour}:00`);
    anchorTime.setHours(minStartHour, 0, 0, 0);
  }

  console.log('📊 [ML-SORT] Anchor time:', anchorTime.toISOString());

  // Schedule tasks in sorted order, ensuring NO overlaps
  // Also enforce end hour constraint (don't schedule past preferredEndHour)
  const scheduledTasks: ScheduledTask[] = [];
  let currentTime = new Date(anchorTime);
  const maxEndHour = preferences.preferredEndHour;

  for (const task of scoredTasks) {
    const startTime = new Date(currentTime);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + task.duration);
    
    // Check if this task would end after the max end hour
    const endHour = endTime.getHours() + (endTime.getMinutes() / 60);
    if (endHour > maxEndHour) {
      console.log(`📊 [ML-SORT] Task "${task.title}" would end at ${endTime.toLocaleTimeString()} (past ${maxEndHour}:00), moving to next day's start`);
      // Move to next day at preferred start hour
      startTime.setDate(startTime.getDate() + 1);
      startTime.setHours(preferences.preferredStartHour, 0, 0, 0);
      endTime.setTime(startTime.getTime());
      endTime.setMinutes(endTime.getMinutes() + task.duration);
    }
    
    console.log(`📊 [ML-SORT] Scheduling "${task.title}": ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}`);

    scheduledTasks.push({
      taskId: task.id,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    });

    // Move current time to after this task (plus optional break)
    currentTime = new Date(endTime);
    if (preferences.breakDuration > 0) {
      currentTime.setMinutes(currentTime.getMinutes() + preferences.breakDuration);
    }
  }

  console.log('📊 [ML-SORT] Final schedule:', scheduledTasks.length, 'tasks scheduled');

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
