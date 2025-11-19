import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Trash2, RotateCcw, AlertTriangle, CheckCircle, ArrowLeft, CheckSquare, XSquare, Search, X } from "lucide-react";
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
  skillTags?: string[];
};

export default function RecyclingBin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<"all" | "completed" | "deleted">("all");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<number | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

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
      // Invalidate all calendar event queries (matches any year/month params)
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0]?.toString().startsWith('/api/google-calendar/events') || false
      });
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
      // Show loading toast immediately
      toast({
        title: "Deleting Task...",
        description: "Permanently removing task from database. You can navigate away.",
        duration: Infinity,
      });
      
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
        title: "✅ Task Permanently Deleted",
        description: "The task has been permanently removed from the database.",
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

  // Batch handlers
  const handleTaskSelect = (taskId: number, selected: boolean) => {
    const newSelected = new Set(selectedTasks);
    if (selected) {
      newSelected.add(taskId);
    } else {
      newSelected.delete(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleSelectAll = () => {
    const newSelected = new Set<number>();
    filteredTasks.forEach((task: any) => {
      newSelected.add(task.id);
    });
    setSelectedTasks(newSelected);
    toast({
      title: "Tasks Selected",
      description: `Selected ${filteredTasks.length} task${filteredTasks.length > 1 ? 's' : ''}`,
    });
  };

  const handleDeselectAll = () => {
    setSelectedTasks(new Set());
  };

  const handleBatchRestore = async () => {
    if (selectedTasks.size === 0) return;

    try {
      const response = await apiRequest("POST", "/api/tasks/restore", {
        taskIds: Array.from(selectedTasks)
      });

      const data = await response.json();

      queryClient.invalidateQueries({ queryKey: ["/api/recycled-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      // Invalidate all calendar event queries (matches any year/month params)
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0]?.toString().startsWith('/api/google-calendar/events') || false
      });

      toast({
        title: "Tasks Restored",
        description: `${data.restoredCount} task${data.restoredCount > 1 ? 's' : ''} restored to your quest list`,
      });

      setSelectedTasks(new Set());
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to restore tasks",
        variant: "destructive",
      });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedTasks.size === 0) return;

    const taskCount = selectedTasks.size;
    
    // Close confirmation dialog and show loading toast immediately
    setConfirmBatchDelete(false);
    
    // Show persistent loading toast
    toast({
      title: "Deleting Tasks...",
      description: `Permanently deleting ${taskCount} task${taskCount > 1 ? 's' : ''}. This may take a moment. You can navigate away - we'll notify you when it's done.`,
      duration: Infinity, // Keep toast visible until we manually dismiss it
    });

    try {
      const response = await apiRequest("POST", "/api/tasks/permanent-delete", {
        taskIds: Array.from(selectedTasks)
      });

      const data = await response.json();

      queryClient.invalidateQueries({ queryKey: ["/api/recycled-tasks"] });

      // Dismiss loading toast and show success
      toast({
        title: "✅ Deletion Complete",
        description: `${data.deletedCount} task${data.deletedCount > 1 ? 's' : ''} permanently removed from the database`,
      });

      setSelectedTasks(new Set());
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to permanently delete tasks",
        variant: "destructive",
      });
    }
  };

  // Filter tasks by tab and search query
  const filteredTasks = recycledTasks.filter(task => {
    // Filter by tab
    const tabMatch = selectedTab === "all" || task.recycledReason === selectedTab;
    
    // Filter by search query
    if (!searchQuery.trim()) return tabMatch;
    
    const query = searchQuery.toLowerCase();
    const titleMatch = task.title.toLowerCase().includes(query);
    const descriptionMatch = task.description?.toLowerCase().includes(query);
    const skillMatch = task.skillTags?.some(skill => skill.toLowerCase().includes(query));
    
    return tabMatch && (titleMatch || descriptionMatch || skillMatch);
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

        {/* Search Bar */}
        <Card className="mb-6 bg-slate-800/80 backdrop-blur-md border-2 border-yellow-600/40">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400/60" />
              <Input
                type="text"
                placeholder="Search recycled tasks by title, description, or skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 bg-slate-900/60 border-yellow-600/30 text-yellow-100 placeholder:text-yellow-400/40 focus:border-yellow-500/60"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 text-yellow-400/60 hover:text-yellow-400 hover:bg-slate-700/50"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {searchQuery && (
              <p className="text-sm text-yellow-200/60 mt-2">
                Found {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Batch Selection Controls */}
        {filteredTasks.length > 0 && (
          <Card className="mb-6 bg-slate-800/60 backdrop-blur-md border-2 border-red-600/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-2">
                  {selectedTasks.size < filteredTasks.length ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleSelectAll}
                      className="flex items-center gap-2 bg-slate-800/80 border-blue-500/40 text-blue-300 hover:bg-blue-600/20 hover:text-blue-100"
                    >
                      <CheckSquare className="w-4 h-4" />
                      Select All ({filteredTasks.length})
                    </Button>
                  ) : selectedTasks.size > 0 ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleDeselectAll}
                      className="flex items-center gap-2 bg-slate-800/80 border-red-500/40 text-red-300 hover:bg-red-600/20 hover:text-red-100"
                    >
                      <XSquare className="w-4 h-4" />
                      Deselect All
                    </Button>
                  ) : null}
                </div>
                
                {selectedTasks.size > 0 && (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleBatchRestore}
                      className="bg-green-700 hover:bg-green-600 text-white border border-green-500/50"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restore {selectedTasks.size} Task{selectedTasks.size > 1 ? 's' : ''}
                    </Button>
                    <Button
                      onClick={() => setConfirmBatchDelete(true)}
                      className="bg-red-700 hover:bg-red-600 text-white border border-red-500/50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Permanently
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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
                  {searchQuery ? (
                    <>
                      <Search className="h-12 w-12 text-yellow-600/40 mx-auto mb-4" />
                      <p className="text-yellow-200/70 mb-2">No tasks found matching "{searchQuery}"</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchQuery("")}
                        className="text-yellow-400 hover:text-yellow-300 hover:bg-slate-700/50"
                      >
                        Clear search
                      </Button>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-12 w-12 text-yellow-600/40 mx-auto mb-4" />
                      <p className="text-yellow-200/70">
                        {selectedTab === "all" 
                          ? "No tasks in recycling bin" 
                          : `No ${selectedTab} tasks in recycling bin`}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredTasks.map((task) => (
                  <Card 
                    key={task.id} 
                    className={`bg-slate-800/80 backdrop-blur border-2 transition-all cursor-pointer ${
                      selectedTasks.has(task.id)
                        ? "border-blue-500/60 bg-blue-900/20"
                        : "border-yellow-600/40 hover:border-yellow-500/60"
                    }`}
                    onClick={() => handleTaskSelect(task.id, !selectedTasks.has(task.id))}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedTasks.has(task.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleTaskSelect(task.id, e.target.checked);
                            }}
                            className="w-4 h-4 mt-1 rounded border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
                          />
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

                          {task.skillTags && task.skillTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {task.skillTags.map((skill: string) => (
                                <Badge key={skill} variant="outline" className="text-xs bg-purple-900/40 text-purple-200 border-purple-600/40">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
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
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmRestore(task.id);
                            }}
                            className="bg-green-900/60 border-green-600/40 text-green-100 hover:bg-green-800/80 hover:border-green-500/60"
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Restore
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDelete(task.id);
                            }}
                            className="bg-red-900/60 border-red-600/40 text-red-100 hover:bg-red-800/80 hover:border-red-500/60"
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

        {/* Batch Delete Confirmation Dialog */}
        <Dialog open={confirmBatchDelete} onOpenChange={setConfirmBatchDelete}>
          <DialogContent className="bg-slate-800 border-2 border-red-600/40">
            <DialogHeader>
              <DialogTitle className="text-yellow-100 font-serif flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                Permanently Delete {selectedTasks.size} Task{selectedTasks.size > 1 ? 's' : ''}?
              </DialogTitle>
              <DialogDescription className="text-yellow-200/70">
                This action cannot be undone. {selectedTasks.size} task{selectedTasks.size > 1 ? 's' : ''} will be permanently removed from the database.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmBatchDelete(false)}
                className="border-yellow-600/40 text-yellow-100 hover:bg-yellow-600/20"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBatchDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Forever
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
