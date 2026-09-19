import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

type PendingCompletedDeletion = {
  id: number;
  title: string;
  deleteAt: string;
};

export function PendingCompletedDeletionManager() {
  const [now, setNow] = useState(() => Date.now());
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const userId = (user as { id?: string } | undefined)?.id;
  const { data: pending = [] } = useQuery<PendingCompletedDeletion[]>({
    queryKey: ["/api/tasks/pending-completed-deletions", userId],
    queryFn: async () => {
      const response = await fetch("/api/tasks/pending-completed-deletions", { credentials: "include" });
      if (response.status === 401) return [];
      if (!response.ok) throw new Error("Unable to load pending deletions");
      return response.json();
    },
    enabled: Boolean(userId),
    retry: false,
    refetchInterval: 1000,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!userId) return;
    return () => {
      queryClient.removeQueries({
        queryKey: ["/api/tasks/pending-completed-deletions", userId],
        exact: true,
      });
    };
  }, [queryClient, userId]);

  const refreshTaskViews = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/tasks/pending-completed-deletions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/completed-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["/api/questlines"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
  };

  const undo = useMutation({
    mutationFn: async (task: PendingCompletedDeletion) => {
      await apiRequest("POST", `/api/tasks/${task.id}/undo-completed-deletion`);
      return task;
    },
    onSuccess: (task) => {
      refreshTaskViews();
      toast({ title: "Removal undone", description: `"${task.title}" has been restored.` });
    },
    onError: () => {
      refreshTaskViews();
      toast({
        title: "Undo window expired",
        description: "This quest has already been permanently deleted.",
        variant: "destructive",
      });
    },
  });

  const visible = pending.filter((task) => new Date(task.deleteAt).getTime() > now);
  if (!userId || !visible.length) return null;

  return (
    <aside className="fixed right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-[110] flex w-[min(390px,calc(100vw-2rem))] flex-col gap-2" aria-label="Pending permanent deletions">
      {visible.map((task) => {
        const remainingSeconds = Math.max(0, Math.ceil((new Date(task.deleteAt).getTime() - now) / 1000));
        const undoing = undo.isPending && undo.variables?.id === task.id;
        return (
          <div key={task.id} className="flex items-center gap-3 rounded-xl border border-red-500/35 bg-slate-950/95 p-4 text-slate-100 shadow-2xl backdrop-blur">
            <Trash2 className="h-5 w-5 shrink-0 text-red-300" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{task.title}</p>
              <p className="mt-1 text-xs text-slate-400">Permanently deleting in {remainingSeconds}s</p>
            </div>
            <Button size="sm" variant="outline" disabled={undoing || remainingSeconds <= 0} onClick={() => undo.mutate(task)}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Undo
            </Button>
          </div>
        );
      })}
    </aside>
  );
}