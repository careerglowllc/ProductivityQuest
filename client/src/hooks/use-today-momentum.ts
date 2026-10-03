import { useQuery } from "@tanstack/react-query";

export function useTodayMomentum() {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const tomorrow = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const since = todayStart.toISOString();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks"],
  });
  // Only today's completions are needed here, so ask for just those rather than the whole archive.
  const { data: completedArchive, isLoading: completedLoading } = useQuery<{ tasks: any[] }>({
    queryKey: ["/api/completed-tasks", { since }],
    queryFn: async () => {
      const response = await fetch(`/api/completed-tasks?${new URLSearchParams({ since, limit: "200" })}`, { credentials: "include" });
      if (!response.ok) throw new Error("Unable to load today's completed quests");
      return response.json();
    },
  });

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeCompleted = Array.isArray(completedArchive?.tasks) ? completedArchive.tasks : [];
  const isCompletedToday = (task: any) => {
    if (!task.completedAt) return false;
    const timestamp = new Date(task.completedAt).getTime();
    return timestamp >= todayStart.getTime() && timestamp < tomorrow.getTime();
  };
  const isRecurring = (task: any) => {
    const normalized = String(task.recurType || "").toLowerCase().replace(/[^a-z-]/g, "");
    return normalized !== "" && normalized !== "one-time";
  };

  const openToday = safeTasks.filter(
    (task: any) => !task.completed && task.dueDate && new Date(task.dueDate).getTime() < tomorrow.getTime(),
  );
  const completedTodayRecurring = safeTasks.filter(
    (task: any) => isRecurring(task) && isCompletedToday(task),
  );
  const completedTodayOneTime = safeCompleted.filter(
    (task: any) => task.recycledReason === "completed" && isCompletedToday(task),
  );

  const totalToday = openToday.length + completedTodayRecurring.length + completedTodayOneTime.length;
  const completedToday =
    openToday.filter((task: any) => task.completed).length +
    completedTodayRecurring.length +
    completedTodayOneTime.length;
  const pct = totalToday > 0 ? (completedToday / totalToday) * 100 : 0;

  return {
    completedToday,
    totalToday,
    pct,
    isLoading: tasksLoading || completedLoading,
  };
}