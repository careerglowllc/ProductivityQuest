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
    <Card className="mb-4">
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
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {task.title}
              </h3>
              
              {task.description && (
                <p className="text-gray-600 mb-2">{task.description}</p>
              )}
              
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {task.duration} min
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Coins className="w-3 h-3" />
                  {task.goldValue} gold
                </Badge>
                {task.dueDate && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Due: {formatDate(task.dueDate)}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{task.recycledReason === "completed" ? "Completed" : "Deleted"}: {formatDate(task.recycledAt)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRestore(task.id)}
              className="flex items-center gap-1"
            >
              <RotateCcw className="w-4 h-4" />
              Restore
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePermanentDelete(task.id)}
              className="flex items-center gap-1 text-red-600 hover:text-red-700"
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
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Recycling Bin
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {isLoading ? (
            <div className="text-center py-8">Loading recycled tasks...</div>
          ) : recycledTasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Recycling bin is empty</h3>
              <p className="text-gray-600">No deleted or completed tasks to restore</p>
            </div>
          ) : (
            <>
              {selectedTasks.size > 0 && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-800 font-medium">
                        {selectedTasks.size} task{selectedTasks.size > 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        onClick={handleBulkRestore}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Restore Selected
                      </Button>
                      <Button 
                        onClick={handleBulkDelete}
                        className="bg-red-600 hover:bg-red-700 text-white"
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
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">All ({recycledTasks.length})</TabsTrigger>
                  <TabsTrigger value="completed">Completed ({completedTasks.length})</TabsTrigger>
                  <TabsTrigger value="deleted">Deleted ({deletedTasks.length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-4">
                  {recycledTasks.map((task: any) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </TabsContent>
                
                <TabsContent value="completed" className="mt-4">
                  {completedTasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No completed tasks in recycling</div>
                  ) : (
                    completedTasks.map((task: any) => (
                      <TaskCard key={task.id} task={task} />
                    ))
                  )}
                </TabsContent>
                
                <TabsContent value="deleted" className="mt-4">
                  {deletedTasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No deleted tasks in recycling</div>
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
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}