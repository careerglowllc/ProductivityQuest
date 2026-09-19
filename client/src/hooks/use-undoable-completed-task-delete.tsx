import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type DeletableCompletedTask = {
  id: number;
  title: string;
};

export function useUndoableCompletedTaskDelete() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const refreshTaskViews = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/tasks/pending-completed-deletions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/completed-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["/api/questlines"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
  };

  const mutation = useMutation({
    mutationFn: async (task: DeletableCompletedTask) => {
      await apiRequest("POST", `/api/tasks/${task.id}/schedule-completed-deletion`);
      return task;
    },
    onSuccess: (task) => {
      refreshTaskViews();
      toast({
        title: "Quest removed",
        description: `"${task.title}" will be permanently deleted in 30 seconds. Use the Undo panel to restore it.`,
      });
    },
    onError: () => {
      toast({
        title: "Could not remove quest",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    removeCompletedTask: mutation.mutate,
    isRemovingTask: (taskId: number) => mutation.isPending && mutation.variables?.id === taskId,
  };
}