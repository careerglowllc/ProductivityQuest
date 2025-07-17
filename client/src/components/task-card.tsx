import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Calendar, Coins } from "lucide-react";
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
              <div className="flex items-center space-x-4 text-sm text-gray-500">
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
