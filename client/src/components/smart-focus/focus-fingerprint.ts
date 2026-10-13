import { isReminder } from "@shared/quest-schedule";

// Cache key for a ranking: task fields the ranking reads, never private preferences.
// A task edit or completion must not reuse an old queue.
export function focusFingerprint(userId: string | number | undefined, day: string, tasks: readonly any[]) {
  return JSON.stringify({
    userId,
    day,
    tasks: tasks.filter((task) => !task.completed && !isReminder(task)).map((task) => ({
      id: task.id, title: task.title, description: task.description, details: task.details,
      dueDate: task.dueDate, startDate: task.startDate, importance: task.importance,
      questType: task.questType, duration: task.duration, assignedTo: task.assignedTo,
      kanbanStage: task.kanbanStage, recurType: task.recurType, businessWorkFilter: task.businessWorkFilter, apple: task.apple,
    })).sort((a, b) => a.id - b.id),
  });
}
