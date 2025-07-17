import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Coins, Trophy, Calendar, ShoppingCart, TrendingUp, Clock, ArrowUpDown, CalendarDays, AlertTriangle } from "lucide-react";
import { TaskCard } from "@/components/task-card";
import { ItemShopModal } from "@/components/item-shop-modal";
import { CalendarSyncModal } from "@/components/calendar-sync-modal";
import { CompletionAnimation } from "@/components/completion-animation";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type FilterType = "all" | "due-today" | "high-reward" | "quick-tasks";
type SortType = "due-date" | "importance";

export default function Home() {
  const [showItemShop, setShowItemShop] = useState(false);
  const [showCalendarSync, setShowCalendarSync] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completedTask, setCompletedTask] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("due-date");
  const { toast } = useToast();

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ["/api/tasks"],
  });

  const { data: progress = { goldTotal: 0, tasksCompleted: 0 }, refetch: refetchProgress } = useQuery({
    queryKey: ["/api/progress"],
  });

  const { data: stats = { completedToday: 0, totalToday: 0, goldEarnedToday: 0 } } = useQuery({
    queryKey: ["/api/stats"],
  });

  const handleCompleteTask = async (taskId: number) => {
    try {
      const response = await apiRequest("PATCH", `/api/tasks/${taskId}/complete`);
      const task = await response.json();
      
      setCompletedTask(task);
      setShowCompletion(true);
      
      refetchTasks();
      refetchProgress();
      
      toast({
        title: "Quest Complete!",
        description: `You earned ${task.goldValue} gold!`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete task",
        variant: "destructive",
      });
    }
  };

  const handleNotionSync = async () => {
    try {
      const response = await apiRequest("POST", "/api/notion/sync");
      const result = await response.json();
      
      refetchTasks();
      toast({
        title: "Notion Sync Complete",
        description: `Synced ${result.count} tasks from Notion`,
      });
    } catch (error) {
      toast({
        title: "Sync Error",
        description: "Failed to sync with Notion. Please check your integration settings.",
        variant: "destructive",
      });
    }
  };

  const handleCalendarSync = async () => {
    try {
      await apiRequest("POST", "/api/calendar/sync");
      setShowCalendarSync(false);
      toast({
        title: "Calendar Sync Complete",
        description: "Tasks have been synced to your Google Calendar",
      });
    } catch (error) {
      toast({
        title: "Sync Error",
        description: "Failed to sync with Google Calendar. Please check your settings.",
        variant: "destructive",
      });
    }
  };

  const pendingTasks = tasks.filter((task: any) => !task.completed && task.dueDate);

  // Filter tasks based on active filter
  const getFilteredTasks = () => {
    const activeTasks = tasks.filter((task: any) => !task.completed);
    
    switch (activeFilter) {
      case "due-today":
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        return activeTasks.filter((task: any) => {
          if (!task.dueDate) return false;
          const taskDate = new Date(task.dueDate);
          taskDate.setHours(0, 0, 0, 0);
          return taskDate >= today && taskDate < tomorrow;
        });
      
      case "high-reward":
        return activeTasks.filter((task: any) => task.goldValue >= 10);
      
      case "quick-tasks":
        return activeTasks.filter((task: any) => task.duration <= 30);
      
      default:
        return activeTasks;
    }
  };

  // Sort tasks based on selected sort option
  const getSortedTasks = (filteredTasks: any[]) => {
    const sortedTasks = [...filteredTasks];
    
    if (sortBy === "due-date") {
      sortedTasks.sort((a, b) => {
        // Tasks with no due date go to the end
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    } else if (sortBy === "importance") {
      const importanceOrder = {
        "Pareto": 6,
        "High": 5,
        "Med-High": 4,
        "Medium": 3,
        "Med-Low": 2,
        "Low": 1
      };
      
      sortedTasks.sort((a, b) => {
        const aImportance = importanceOrder[a.importance as keyof typeof importanceOrder] || 0;
        const bImportance = importanceOrder[b.importance as keyof typeof importanceOrder] || 0;
        return bImportance - aImportance; // Higher importance first
      });
    }
    
    return sortedTasks;
  };

  const filteredTasks = getFilteredTasks();
  const sortedTasks = getSortedTasks(filteredTasks);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Trophy className="text-gold w-8 h-8" />
                <h1 className="text-2xl font-bold text-gray-900">QuestList</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 bg-gradient-to-r from-yellow-100 to-yellow-200 px-4 py-2 rounded-full">
                <Coins className="text-yellow-600 w-5 h-5" />
                <span className="font-semibold text-gray-900">{progress.goldTotal}</span>
                <span className="text-sm text-gray-600">Gold</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">U</span>
                </div>
                <span className="text-sm font-medium text-gray-900">User</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <nav className="space-y-4">
                <div className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-primary text-white">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">Tasks</span>
                </div>
                <button
                  onClick={() => setShowItemShop(true)}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span className="font-medium">Item Shop</span>
                </button>
                <button
                  onClick={() => setShowCalendarSync(true)}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Calendar className="w-5 h-5" />
                  <span className="font-medium">Calendar Sync</span>
                </button>
                <div className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-medium">Progress</span>
                </div>
              </nav>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Today's Progress</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Tasks Completed</span>
                      <span className="font-medium text-gray-900">
                        {stats.completedToday}/{stats.totalToday}
                      </span>
                    </div>
                    <Progress 
                      value={stats.totalToday > 0 ? (stats.completedToday / stats.totalToday) * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Gold Earned</span>
                      <span className="font-medium text-yellow-600">+{stats.goldEarnedToday}</span>
                    </div>
                    <Progress 
                      value={stats.goldEarnedToday > 0 ? Math.min((stats.goldEarnedToday / 500) * 100, 100) : 0} 
                      className="h-2"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Your Quests</h2>
                <p className="text-gray-600">Complete tasks to earn gold and unlock rewards</p>
              </div>
              <div className="flex space-x-3">
                <Button onClick={handleNotionSync} className="flex items-center space-x-2">
                  <Trophy className="w-4 h-4" />
                  <span>Sync Notion</span>
                </Button>
                <Button 
                  onClick={() => setShowCalendarSync(true)}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Sync Calendar</span>
                </Button>
              </div>
            </div>

            {/* Task Filters */}
            <Card className="p-4 mb-6">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant={activeFilter === "all" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setActiveFilter("all")}
                  >
                    All Tasks
                  </Badge>
                  <Badge 
                    variant={activeFilter === "due-today" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setActiveFilter("due-today")}
                  >
                    Due Today
                  </Badge>
                  <Badge 
                    variant={activeFilter === "high-reward" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setActiveFilter("high-reward")}
                  >
                    High Reward
                  </Badge>
                  <Badge 
                    variant={activeFilter === "quick-tasks" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setActiveFilter("quick-tasks")}
                  >
                    Quick Tasks
                  </Badge>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <ArrowUpDown className="w-4 h-4" />
                      Sort
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => setSortBy("due-date")}
                      className="flex items-center gap-2"
                    >
                      <CalendarDays className="w-4 h-4" />
                      <span>Due Date</span>
                      {sortBy === "due-date" && <span className="ml-auto">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSortBy("importance")}
                      className="flex items-center gap-2"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>Importance</span>
                      {sortBy === "importance" && <span className="ml-auto">✓</span>}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>

            {/* Task List */}
            <div className="space-y-4">
              {tasksLoading ? (
                <div className="text-center py-8">Loading tasks...</div>
              ) : tasks.length === 0 ? (
                <Card className="p-8 text-center">
                  <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No tasks yet</h3>
                  <p className="text-gray-600 mb-4">Sync with Notion to get started with your quests!</p>
                  <Button onClick={handleNotionSync}>Sync with Notion</Button>
                </Card>
              ) : sortedTasks.length === 0 ? (
                <Card className="p-8 text-center">
                  <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No tasks match your filter</h3>
                  <p className="text-gray-600 mb-4">Try adjusting your filter to see more tasks</p>
                  <Button onClick={() => setActiveFilter("all")} variant="outline">Show All Tasks</Button>
                </Card>
              ) : (
                sortedTasks.map((task: any) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={handleCompleteTask}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ItemShopModal
        isOpen={showItemShop}
        onClose={() => setShowItemShop(false)}
        userGold={progress.goldTotal}
        onPurchase={refetchProgress}
      />
      
      <CalendarSyncModal
        isOpen={showCalendarSync}
        onClose={() => setShowCalendarSync(false)}
        onSync={handleCalendarSync}
        pendingTasksCount={pendingTasks.length}
      />
      
      <CompletionAnimation
        isOpen={showCompletion}
        onClose={() => setShowCompletion(false)}
        task={completedTask}
        newGoldTotal={progress.goldTotal}
      />
    </div>
  );
}
