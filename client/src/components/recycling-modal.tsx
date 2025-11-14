import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, RotateCcw, Trash2, CheckCircle, Clock, Calendar, Coins, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface RecyclingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RecyclingModal({ isOpen, onClose }: RecyclingModalProps) {
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: recycledTasks = [], isLoading } = useQuery({
    queryKey: ["/api/recycled-tasks"],
    enabled: isOpen,
  });

  const handleRestore = async (taskId: number) => {
    try {
      await apiRequest("POST", `/api/tasks/${taskId}/restore`);
      queryClient.invalidateQueries({ queryKey: ["/api/recycled-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      toast({
        title: "Task Restored",
        description: "Task has been restored successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to restore task",
        variant: "destructive",
      });
    }
  };

  const handlePermanentDelete = async (taskId: number) => {
    try {
      await apiRequest("DELETE", `/api/tasks/${taskId}/permanent`);
      queryClient.invalidateQueries({ queryKey: ["/api/recycled-tasks"] });
      toast({
        title: "Task Permanently Deleted",
        description: "Task has been permanently deleted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to permanently delete task",
        variant: "destructive",
      });
    }
  };

  const handleBulkRestore = async () => {
    try {
      const promises = Array.from(selectedTasks).map(taskId => 
        apiRequest("POST", `/api/tasks/${taskId}/restore`)
      );
      await Promise.all(promises);
      
      queryClient.invalidateQueries({ queryKey: ["/api/recycled-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      
      setSelectedTasks(new Set());
      toast({
        title: "Tasks Restored",
        description: `${selectedTasks.size} tasks have been restored successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to restore selected tasks",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      const promises = Array.from(selectedTasks).map(taskId => 
        apiRequest("DELETE", `/api/tasks/${taskId}/permanent`)
      );
      await Promise.all(promises);
      
      queryClient.invalidateQueries({ queryKey: ["/api/recycled-tasks"] });
      
      setSelectedTasks(new Set());
      toast({
        title: "Tasks Permanently Deleted",
        description: `${selectedTasks.size} tasks have been permanently deleted`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to permanently delete selected tasks",
        variant: "destructive",
      });
    }
  };

  const completedTasks = recycledTasks.filter((task: any) => task.recycledReason === "completed");
  const deletedTasks = recycledTasks.filter((task: any) => task.recycledReason === "deleted");

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No date";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const TaskCard = ({ task }: { task: any }) => (
    <Card className="mb-4 bg-slate-800/40 backdrop-blur-md border-2 border-yellow-600/20 hover:border-yellow-500/40 transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <input
              type="checkbox"
              className="mt-1"
              checked={selectedTasks.has(task.id)}
              onChange={(e) => {
                const newSelected = new Set(selectedTasks);
                if (e.target.checked) {
                  newSelected.add(task.id);
                } else {
                  newSelected.delete(task.id);
                }
                setSelectedTasks(newSelected);
              }}
            />
            
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-yellow-100 mb-1">
                {task.title}
              </h3>
              
              {task.description && (
                <p className="text-yellow-200/70 mb-2">{task.description}</p>
              )}
              
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge variant="outline" className="flex items-center gap-1 bg-slate-700/40 text-slate-200 border-slate-600/40">
                  <Clock className="w-3 h-3" />
                  {task.duration} min
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1 bg-yellow-900/40 text-yellow-200 border-yellow-600/40">
                  <Coins className="w-3 h-3" />
                  {task.goldValue} gold
                </Badge>
                {task.dueDate && (
                  <Badge variant="outline" className="flex items-center gap-1 bg-blue-900/40 text-blue-200 border-blue-600/40">
                    <Calendar className="w-3 h-3" />
                    Due: {formatDate(task.dueDate)}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-yellow-300/60">
                <span>{task.recycledReason === "completed" ? "Completed" : "Deleted"}: {formatDate(task.recycledAt)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRestore(task.id)}
              className="flex items-center gap-1 bg-green-900/40 text-green-200 border-green-600/40 hover:bg-green-600/20"
            >
              <RotateCcw className="w-4 h-4" />
              Restore
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePermanentDelete(task.id)}
              className="flex items-center gap-1 bg-red-900/40 text-red-200 border-red-600/40 hover:bg-red-600/20"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-slate-800 border-2 border-yellow-600/40">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-yellow-100">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            Recycling Bin
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {isLoading ? (
            <div className="text-center py-8 text-yellow-200">Loading recycled tasks...</div>
          ) : recycledTasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-yellow-100 mb-2">Recycling bin is empty</h3>
              <p className="text-yellow-200/70">No deleted or completed tasks to restore</p>
            </div>
          ) : (
            <>
              {selectedTasks.size > 0 && (
                <div className="mb-4 p-4 bg-blue-900/40 border-2 border-blue-500/40 rounded-lg backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-200 font-medium">
                        {selectedTasks.size} task{selectedTasks.size > 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        onClick={handleBulkRestore}
                        className="bg-green-900/60 hover:bg-green-600/40 text-green-200 border border-green-600/40"
                        size="sm"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Restore Selected
                      </Button>
                      <Button 
                        onClick={handleBulkDelete}
                        className="bg-red-900/60 hover:bg-red-600/40 text-red-200 border border-red-600/40"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete Selected
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-slate-700/50">
                  <TabsTrigger value="all" className="data-[state=active]:bg-yellow-600/40 data-[state=active]:text-yellow-100">All ({recycledTasks.length})</TabsTrigger>
                  <TabsTrigger value="completed" className="data-[state=active]:bg-yellow-600/40 data-[state=active]:text-yellow-100">Completed ({completedTasks.length})</TabsTrigger>
                  <TabsTrigger value="deleted" className="data-[state=active]:bg-yellow-600/40 data-[state=active]:text-yellow-100">Deleted ({deletedTasks.length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-4">
                  {recycledTasks.map((task: any) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </TabsContent>
                
                <TabsContent value="completed" className="mt-4">
                  {completedTasks.length === 0 ? (
                    <div className="text-center py-8 text-yellow-300/60">No completed tasks in recycling</div>
                  ) : (
                    completedTasks.map((task: any) => (
                      <TaskCard key={task.id} task={task} />
                    ))
                  )}
                </TabsContent>
                
                <TabsContent value="deleted" className="mt-4">
                  {deletedTasks.length === 0 ? (
                    <div className="text-center py-8 text-yellow-300/60">No deleted tasks in recycling</div>
                  ) : (
                    deletedTasks.map((task: any) => (
                      <TaskCard key={task.id} task={task} />
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="bg-slate-700/50 border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}