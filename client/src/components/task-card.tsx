import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Calendar, Coins, AlertTriangle, Zap, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: {
    id: number;
    title: string;
    description: string;
    duration: number;
    goldValue: number;
    dueDate: string | null;
    completed: boolean;
    completedAt: string | null;
    importance?: string;
    kanbanStage?: string;
    recurType?: string;
  };
  onComplete: (taskId: number) => void;
}

export function TaskCard({ task, onComplete }: TaskCardProps) {
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No due date";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <Card className={cn(
      "hover:shadow-md transition-shadow",
      task.completed && "opacity-60"
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "mt-1 w-5 h-5 rounded-full border-2 p-0 hover:bg-transparent",
                task.completed 
                  ? "bg-green-500 border-green-500 text-white"
                  : "border-gray-300 hover:border-primary"
              )}
              onClick={() => !task.completed && onComplete(task.id)}
              disabled={task.completed}
            >
              {task.completed && <CheckCircle className="w-3 h-3" />}
            </Button>
            
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                "text-lg font-semibold text-gray-900 mb-1",
                task.completed && "line-through text-gray-500"
              )}>
                {task.title}
              </h3>
              <p className="text-gray-600 text-sm mb-2">
                {task.description}
              </p>
              <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(task.duration)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(task.dueDate)}</span>
                </div>
                {task.completed && task.completedAt && (
                  <div className="flex items-center space-x-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Completed</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {task.importance && (
                  <Badge variant="outline" className={cn(
                    "text-xs",
                    task.importance === "Pareto" && "bg-red-100 text-red-800 border-red-200",
                    task.importance === "High" && "bg-orange-100 text-orange-800 border-orange-200",
                    task.importance === "Med-High" && "bg-yellow-100 text-yellow-800 border-yellow-200",
                    task.importance === "Medium" && "bg-blue-100 text-blue-800 border-blue-200",
                    task.importance === "Med-Low" && "bg-gray-100 text-gray-800 border-gray-200",
                    task.importance === "Low" && "bg-green-100 text-green-800 border-green-200"
                  )}>
                    {task.importance === "Pareto" && <Zap className="w-3 h-3 mr-1" />}
                    {task.importance === "High" && <AlertTriangle className="w-3 h-3 mr-1" />}
                    {task.importance}
                  </Badge>
                )}
                
                {task.recurType === "🔄Recurring" && (
                  <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-200">
                    <Repeat className="w-3 h-3 mr-1" />
                    Recurring
                  </Badge>
                )}
                
                {task.kanbanStage && task.kanbanStage !== "Done" && (
                  <Badge variant="outline" className="text-xs">
                    {task.kanbanStage}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <Badge 
            variant={task.completed ? "secondary" : "default"}
            className={cn(
              "flex items-center space-x-1 px-3 py-1",
              task.completed 
                ? "bg-green-100 text-green-800"
                : "bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800"
            )}
          >
            <Coins className="w-4 h-4" />
            <span className="font-semibold">{task.goldValue}</span>
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
