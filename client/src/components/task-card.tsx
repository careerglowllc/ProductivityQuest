import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, Clock, Calendar, Coins, AlertTriangle, Zap, Repeat, Apple, Brain, Users, DollarSign, Target, Mountain, Zap as Power, Activity } from "lucide-react";
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
    lifeDomain?: string;
    apple?: boolean;
    smartPrep?: boolean;
    delegationTask?: boolean;
    velin?: boolean;
  };
  onSelect: (taskId: number, selected: boolean) => void;
  isSelected: boolean;
}

export function TaskCard({ task, onSelect, isSelected }: TaskCardProps) {
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
      "bg-slate-800/40 backdrop-blur-md border-2 border-yellow-600/20 hover:border-yellow-500/40 hover:shadow-lg hover:shadow-yellow-600/10 transition-all",
      task.completed && "opacity-60"
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <div className="mt-1.5">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelect(task.id, checked as boolean)}
                disabled={task.completed}
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                "text-lg font-semibold text-yellow-100 mb-1",
                task.completed && "line-through text-yellow-400/60"
              )}>
                {task.title}
              </h3>
              <p className="text-yellow-200/70 text-sm mb-2">
                {task.description}
              </p>
              <div className="flex items-center space-x-4 text-sm text-yellow-300/60 mb-2">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(task.duration)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(task.dueDate)}</span>
                </div>
                {task.importance && (
                  <div className="flex items-center space-x-1">
                    <span>{task.importance === "Pareto" ? "🔥" : task.importance === "High" ? "🚨" : task.importance === "Med-High" ? "⚠️" : task.importance === "Medium" ? "📋" : task.importance === "Med-Low" ? "📝" : "📄"}</span>
                    <span>{task.importance}</span>
                  </div>
                )}
                {task.recurType && (
                  <div className="flex items-center space-x-1">
                    <span>{task.recurType === "🔄Recurring" ? "🔄" : "⏳"}</span>
                    <span>{task.recurType === "🔄Recurring" ? "Recurring" : "One-time"}</span>
                  </div>
                )}
                {task.completed && task.completedAt && (
                  <div className="flex items-center space-x-1 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>Completed</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center flex-wrap gap-2">
                {task.importance && (
                  <Badge variant="outline" className={cn(
                    "text-xs border",
                    task.importance === "Pareto" && "bg-red-900/40 text-red-200 border-red-600/40",
                    task.importance === "High" && "bg-orange-900/40 text-orange-200 border-orange-600/40",
                    task.importance === "Med-High" && "bg-yellow-900/40 text-yellow-200 border-yellow-600/40",
                    task.importance === "Medium" && "bg-blue-900/40 text-blue-200 border-blue-600/40",
                    task.importance === "Med-Low" && "bg-slate-700/40 text-slate-200 border-slate-600/40",
                    task.importance === "Low" && "bg-green-900/40 text-green-200 border-green-600/40"
                  )}>
                    {task.importance === "Pareto" && <Zap className="w-3 h-3 mr-1" />}
                    {task.importance === "High" && <AlertTriangle className="w-3 h-3 mr-1" />}
                    {task.importance}
                  </Badge>
                )}
                
                {task.lifeDomain && (
                  <Badge variant="outline" className={cn(
                    "text-xs border",
                    task.lifeDomain === "Relationships" && "bg-pink-900/40 text-pink-200 border-pink-600/40",
                    task.lifeDomain === "Finance" && "bg-green-900/40 text-green-200 border-green-600/40",
                    task.lifeDomain === "Purpose" && "bg-purple-900/40 text-purple-200 border-purple-600/40",
                    task.lifeDomain === "General" && "bg-slate-700/40 text-slate-200 border-slate-600/40",
                    task.lifeDomain === "Physical" && "bg-red-900/40 text-red-200 border-red-600/40",
                    task.lifeDomain === "Adventure" && "bg-orange-900/40 text-orange-200 border-orange-600/40",
                    task.lifeDomain === "Power" && "bg-yellow-900/40 text-yellow-200 border-yellow-600/40",
                    task.lifeDomain === "Mental" && "bg-blue-900/40 text-blue-200 border-blue-600/40"
                  )}>
                    {task.lifeDomain === "Relationships" && <Users className="w-3 h-3 mr-1" />}
                    {task.lifeDomain === "Finance" && <DollarSign className="w-3 h-3 mr-1" />}
                    {task.lifeDomain === "Purpose" && <Target className="w-3 h-3 mr-1" />}
                    {task.lifeDomain === "Physical" && <Activity className="w-3 h-3 mr-1" />}
                    {task.lifeDomain === "Adventure" && <Mountain className="w-3 h-3 mr-1" />}
                    {task.lifeDomain === "Power" && <Power className="w-3 h-3 mr-1" />}
                    {task.lifeDomain === "Mental" && <Brain className="w-3 h-3 mr-1" />}
                    {task.lifeDomain}
                  </Badge>
                )}
                
                {task.recurType === "🔄Recurring" && (
                  <Badge variant="outline" className="text-xs bg-purple-900/40 text-purple-200 border-purple-600/40">
                    <Repeat className="w-3 h-3 mr-1" />
                    Recurring
                  </Badge>
                )}
                
                {task.kanbanStage && task.kanbanStage !== "Done" && (
                  <Badge variant="outline" className="text-xs bg-slate-700/40 text-slate-200 border-slate-600/40">
                    {task.kanbanStage}
                  </Badge>
                )}
                
                {/* Checkbox indicators */}
                <div className="flex items-center space-x-1">
                  {task.apple && (
                    <Badge variant="outline" className="text-xs bg-slate-700/40 text-slate-200 border-slate-600/40">
                      <Apple className="w-3 h-3 mr-1" />
                      Apple
                    </Badge>
                  )}
                  {task.smartPrep && (
                    <Badge variant="outline" className="text-xs bg-blue-900/40 text-blue-200 border-blue-600/40">
                      <Brain className="w-3 h-3 mr-1" />
                      SmartPrep
                    </Badge>
                  )}
                  {task.delegationTask && (
                    <Badge variant="outline" className="text-xs bg-green-900/40 text-green-200 border-green-600/40">
                      <Users className="w-3 h-3 mr-1" />
                      Delegation
                    </Badge>
                  )}
                  {task.velin && (
                    <Badge variant="outline" className="text-xs bg-purple-900/40 text-purple-200 border-purple-600/40">
                      Velin
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <Badge 
            variant={task.completed ? "secondary" : "default"}
            className={cn(
              "flex items-center space-x-1 px-3 py-1",
              task.completed 
                ? "bg-green-900/40 text-green-200 border border-green-600/40"
                : "bg-gradient-to-r from-yellow-600/40 to-yellow-500/40 text-yellow-100 border border-yellow-600/50"
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
