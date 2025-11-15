import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Trash2, RotateCcw, AlertTriangle, CheckCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

type RecycledTask = {
  id: number;
  title: string;
  description: string;
  goldValue: number;
  duration: number;
  recycledAt: string;
  recycledReason: "completed" | "deleted";
  completedAt?: string;
  dueDate?: string;
  importance?: string;
};

export default function RecyclingBin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<"all" | "completed" | "deleted">("all");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<number | null>(null);

  // Fetch recycled tasks
  const { data: recycledTasks = [], isLoading } = useQuery<RecycledTask[]>({
    queryKey: ["/api/recycled-tasks"],
    queryFn: async () => {
      const response = await fetch("/api/recycled-tasks", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch recycled tasks");
      return response.json();
    },
  });

  // Restore task mutation
  const restoreMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await fetch(`/api/tasks/${taskId}/restore`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to restore task");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/recycled-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/progress"] });
      toast({
        title: "Task Restored",
        description: `"${data.title}" has been restored to your task list.`,
      });
      setConfirmRestore(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to restore task. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Permanent delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await fetch(`/api/tasks/${taskId}/permanent`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete task");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recycled-tasks"] });
      toast({
        title: "Task Permanently Deleted",
        description: "The task has been permanently removed.",
      });
      setConfirmDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter tasks by tab
  const filteredTasks = recycledTasks.filter(task => {
    if (selectedTab === "all") return true;
    return task.recycledReason === selectedTab;
  });

  const getImportanceBadgeColor = (importance?: string) => {
    switch (importance) {
      case "Pareto": return "bg-purple-600";
      case "High": return "bg-red-600";
      case "Med-High": return "bg-orange-600";
      case "Medium": return "bg-yellow-600";
      case "Med-Low": return "bg-blue-600";
      case "Low": return "bg-gray-600";
      default: return "bg-gray-500";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center text-yellow-100 py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
            <p className="mt-4">Loading recycling bin...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="text-yellow-100 hover:text-yellow-200 mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tasks
            </Button>
          </Link>
          <Card className="bg-slate-800/80 backdrop-blur border-2 border-yellow-600/40">
            <CardHeader>
              <CardTitle className="text-yellow-100 font-serif flex items-center gap-2">
                <Trash2 className="h-6 w-6" />
                Recycling Bin
              </CardTitle>
              <p className="text-yellow-200/70 text-sm">
                Tasks in the recycling bin can be restored or permanently deleted.
              </p>
            </CardHeader>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/80 border border-yellow-600/40">
            <TabsTrigger value="all" className="data-[state=active]:bg-yellow-600/20 data-[state=active]:text-yellow-100">
              All ({recycledTasks.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-green-600/20 data-[state=active]:text-yellow-100">
              Completed ({recycledTasks.filter(t => t.recycledReason === "completed").length})
            </TabsTrigger>
            <TabsTrigger value="deleted" className="data-[state=active]:bg-red-600/20 data-[state=active]:text-yellow-100">
              Deleted ({recycledTasks.filter(t => t.recycledReason === "deleted").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="mt-6">
            {filteredTasks.length === 0 ? (
              <Card className="bg-slate-800/80 backdrop-blur border-2 border-yellow-600/40">
                <CardContent className="py-12 text-center">
                  <Trash2 className="h-12 w-12 text-yellow-600/40 mx-auto mb-4" />
                  <p className="text-yellow-200/70">
                    {selectedTab === "all" 
                      ? "No tasks in recycling bin" 
                      : `No ${selectedTab} tasks in recycling bin`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredTasks.map((task) => (
                  <Card key={task.id} className="bg-slate-800/80 backdrop-blur border-2 border-yellow-600/40 hover:border-yellow-500/60 transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-yellow-100 font-medium text-lg">{task.title}</h3>
                            {task.recycledReason === "completed" ? (
                              <Badge className="bg-green-600/80 text-white">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Completed
                              </Badge>
                            ) : (
                              <Badge className="bg-red-600/80 text-white">
                                <Trash2 className="h-3 w-3 mr-1" />
                                Deleted
                              </Badge>
                            )}
                            {task.importance && (
                              <Badge className={`${getImportanceBadgeColor(task.importance)} text-white`}>
                                {task.importance}
                              </Badge>
                            )}
                          </div>
                          
                          {task.description && (
                            <p className="text-yellow-200/70 text-sm mb-3">{task.description}</p>
                          )}
                          
                          <div className="flex items-center gap-4 text-sm text-yellow-200/60">
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-400">💰</span>
                              <span>{task.goldValue} gold</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>⏱️</span>
                              <span>{task.duration} min</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Trash2 className="h-3 w-3" />
                              <span>
                                Recycled {format(new Date(task.recycledAt), "MMM d, yyyy")}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmRestore(task.id)}
                            className="border-green-600/40 text-green-100 hover:bg-green-600/20"
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Restore
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmDelete(task.id)}
                            className="border-red-600/40 text-red-100 hover:bg-red-600/20"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Forever
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Restore Confirmation Dialog */}
        <Dialog open={confirmRestore !== null} onOpenChange={() => setConfirmRestore(null)}>
          <DialogContent className="bg-slate-800 border-2 border-green-600/40">
            <DialogHeader>
              <DialogTitle className="text-yellow-100 font-serif flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-green-400" />
                Restore Task?
              </DialogTitle>
              <DialogDescription className="text-yellow-200/70">
                This will move the task back to your active task list.
                {recycledTasks.find(t => t.id === confirmRestore)?.recycledReason === "completed" && (
                  <span className="block mt-2 text-yellow-300">
                    Note: This task was previously completed. The gold earned will not be refunded.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmRestore(null)}
                className="border-yellow-600/40 text-yellow-100 hover:bg-yellow-600/20"
              >
                Cancel
              </Button>
              <Button
                onClick={() => confirmRestore && restoreMutation.mutate(confirmRestore)}
                disabled={restoreMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {restoreMutation.isPending ? "Restoring..." : "Restore Task"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={confirmDelete !== null} onOpenChange={() => setConfirmDelete(null)}>
          <DialogContent className="bg-slate-800 border-2 border-red-600/40">
            <DialogHeader>
              <DialogTitle className="text-yellow-100 font-serif flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                Permanently Delete Task?
              </DialogTitle>
              <DialogDescription className="text-yellow-200/70">
                This action cannot be undone. The task will be permanently removed from the database.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmDelete(null)}
                className="border-yellow-600/40 text-yellow-100 hover:bg-yellow-600/20"
              >
                Cancel
              </Button>
              <Button
                onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete)}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Forever"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
