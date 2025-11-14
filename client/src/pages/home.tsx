import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Coins, Trophy, Calendar, ShoppingCart, TrendingUp, Clock, ArrowUpDown, CalendarDays, AlertTriangle, Download, Upload, CheckCircle, Trash2, Settings, LogOut, User, Search } from "lucide-react";
import { TaskCard } from "@/components/task-card";
import { TaskDetailModal } from "@/components/task-detail-modal";
import { ItemShopModal } from "@/components/item-shop-modal";
import { CalendarSyncModal } from "@/components/calendar-sync-modal";
import { CompletionAnimation } from "@/components/completion-animation";
import { RecyclingModal } from "@/components/recycling-modal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";

type FilterType = "all" | "due-today" | "high-reward" | "quick-tasks" | "high-priority" | "routines" | "apple";
type SortType = "due-date" | "importance";

export default function Home() {
  const [location] = useLocation();
  const [showItemShop, setShowItemShop] = useState(false);
  const [showCalendarSync, setShowCalendarSync] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completedTask, setCompletedTask] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("due-date");
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [importTaskCount, setImportTaskCount] = useState(0);
  const [exportTaskCount, setExportTaskCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [showRecycling, setShowRecycling] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [calendarNeedsAuth, setCalendarNeedsAuth] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ["/api/tasks"],
  });

  // Handle taskId query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const taskIdParam = params.get('taskId');
    if (taskIdParam) {
      setDetailTaskId(parseInt(taskIdParam));
    }
  }, [location]);

  const { data: progress = { goldTotal: 0, tasksCompleted: 0 }, refetch: refetchProgress } = useQuery({
    queryKey: ["/api/progress"],
  });

  const { data: stats = { completedToday: 0, totalToday: 0, goldEarnedToday: 0 } } = useQuery({
    queryKey: ["/api/stats"],
  });

  const handleTaskSelect = (taskId: number, selected: boolean) => {
    const newSelected = new Set(selectedTasks);
    if (selected) {
      newSelected.add(taskId);
    } else {
      newSelected.delete(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleCompleteSelected = async () => {
    if (selectedTasks.size === 0) return;

    const selectedTaskIds = Array.from(selectedTasks);
    
    // Calculate total gold immediately for optimistic UI
    let totalGoldEarned = 0;
    const tasksToComplete = selectedTaskIds.map(id => {
      const task = (tasks as any[]).find((t: any) => t.id === id);
      if (task) totalGoldEarned += task.goldValue;
      return task;
    }).filter(Boolean);

    if (tasksToComplete.length === 0) return;

    // OPTIMISTIC UI: Update immediately
    setSelectedTasks(new Set());
    
    // Show completion animation
    setCompletedTask({
      ...tasksToComplete[0],
      goldValue: totalGoldEarned
    });
    setShowCompletion(true);

    // Show toast immediately
    toast({
      title: `${tasksToComplete.length} Quest${tasksToComplete.length > 1 ? 's' : ''} Complete!`,
      description: `Earning ${totalGoldEarned} gold...`,
    });

    try {
      // Call simplified batch endpoint - Notion updates happen in background
      await apiRequest("POST", "/api/tasks/complete-batch", { 
        taskIds: selectedTaskIds 
      });
      
      // Refresh data after backend completes
      refetchTasks();
      refetchProgress();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete tasks. Refreshing...",
        variant: "destructive",
      });
      // Force refresh to get correct state
      refetchTasks();
      refetchProgress();
    }
  };

  const handleAppendToNotion = async () => {
    if (selectedTasks.size === 0) return;

    try {
      const selectedTaskIds = Array.from(selectedTasks);
      const response = await apiRequest("POST", "/api/notion/append", {
        taskIds: selectedTaskIds
      });
      const result = await response.json();

      // Clear selection
      setSelectedTasks(new Set());
      
      // Refresh tasks to get updated notion IDs
      refetchTasks();

      toast({
        title: "Success",
        description: result.message || `${result.count} tasks appended to Notion`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to append tasks to Notion",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFromNotion = async () => {
    if (selectedTasks.size === 0) return;

    try {
      const selectedTaskIds = Array.from(selectedTasks);
      const response = await apiRequest("POST", "/api/notion/delete", {
        taskIds: selectedTaskIds
      });
      const result = await response.json();

      // Clear selection
      setSelectedTasks(new Set());
      
      // Refresh tasks to reflect changes
      refetchTasks();

      toast({
        title: "Success",
        description: result.message || `${result.count} tasks deleted from Notion`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete tasks from Notion",
        variant: "destructive",
      });
    }
  };

  const handleImportPrepare = async () => {
    try {
      const response = await apiRequest("GET", "/api/notion/check-duplicates");
      const result = await response.json();
      setImportTaskCount(result.totalCount);
      setDuplicateCount(result.duplicateCount);
      
      if (result.duplicateCount > 0) {
        setShowDuplicateConfirm(true);
      } else {
        setShowImportConfirm(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get Notion task count",
        variant: "destructive",
      });
    }
  };

  const handleExportPrepare = async () => {
    const currentTaskCount = tasks.length;
    setExportTaskCount(currentTaskCount);
    setShowExportConfirm(true);
  };

  const handleImportConfirm = async () => {
    try {
      const response = await apiRequest("POST", "/api/notion/import", {
        includeDuplicates,
      });
      const result = await response.json();
      
      setShowImportConfirm(false);
      setShowDuplicateConfirm(false);
      refetchTasks();
      toast({
        title: "Import Complete",
        description: `Imported ${result.count} tasks from Notion`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import from Notion",
        variant: "destructive",
      });
      setShowImportConfirm(false);
      setShowDuplicateConfirm(false);
    }
  };

  const handleExportConfirm = async () => {
    try {
      const response = await apiRequest("POST", "/api/notion/export");
      const result = await response.json();
      
      setShowExportConfirm(false);
      toast({
        title: "Export Complete",
        description: `Exported ${result.count} tasks to Notion`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export to Notion",
        variant: "destructive",
      });
      setShowExportConfirm(false);
    }
  };

  const handleCalendarSync = async () => {
    try {
      const selectedTaskIds = Array.from(selectedTasks);
      const response = await apiRequest("POST", "/api/calendar/sync", {
        selectedTasks: selectedTaskIds
      });
      const result = await response.json();
      
      setShowCalendarSync(false);
      setSelectedTasks(new Set()); // Clear selection after sync
      
      toast({
        title: "Calendar Sync Complete",
        description: `${result.count} tasks synced to your Google Calendar${result.failed > 0 ? ` (${result.failed} failed)` : ''}`,
      });
    } catch (error: any) {
      const errorData = error.response?.data || {};
      
      if (errorData.needsAuth) {
        setShowCalendarSync(false);
        setCalendarNeedsAuth(true);
        setTimeout(() => setShowCalendarSync(true), 100); // Reopen with auth prompt
        return;
      }
      
      if (errorData.tokenRefreshed) {
        toast({
          title: "Token Refreshed",
          description: "Please try syncing again.",
        });
        return;
      }
      
      toast({
        title: "Sync Error",
        description: errorData.error || "Failed to sync with Google Calendar. Please check your settings.",
        variant: "destructive",
      });
    }
  };

  const pendingTasks = tasks.filter((task: any) => !task.completed && task.dueDate);

  // Filter tasks based on active filter and search query
  const getFilteredTasks = () => {
    let activeTasks = tasks.filter((task: any) => !task.completed);
    
    // Apply search filter first
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      activeTasks = activeTasks.filter((task: any) => {
        const titleMatch = task.title?.toLowerCase().includes(query);
        const descriptionMatch = task.description?.toLowerCase().includes(query);
        const categoryMatch = task.category?.toLowerCase().includes(query);
        const importanceMatch = task.importance?.toLowerCase().includes(query);
        return titleMatch || descriptionMatch || categoryMatch || importanceMatch;
      });
    }
    
    // Apply category filter
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
          return taskDate <= today; // Include today and overdue tasks
        });
      
      case "high-reward":
        // Filter tasks with high gold value (50+)
        return activeTasks.filter((task: any) => task.goldValue >= 50);
      
      case "quick-tasks":
        return activeTasks.filter((task: any) => task.duration <= 30);
      
      case "high-priority":
        // Filter for Pareto, High, and Med-High priority tasks, sorted by priority
        const highPriorityTasks = activeTasks.filter((task: any) => 
          task.importance === "Pareto" || 
          task.importance === "High" || 
          task.importance === "Med-High"
        );
        // Sort by priority level within this filter
        const priorityMap: { [key: string]: number } = {
          'Pareto': 6,
          'High': 5,
          'Med-High': 4,
          'Medium': 3,
          'Med-Low': 2,
          'Low': 1,
        };
        return highPriorityTasks.sort((a: any, b: any) => 
          (priorityMap[b.importance] || 0) - (priorityMap[a.importance] || 0)
        );
      
      case "routines":
        // Filter for recurring tasks (Recur Type is not "one-time" or blank)
        return activeTasks.filter((task: any) => 
          task.recurType && 
          task.recurType !== "one-time" && 
          task.recurType.trim() !== ""
        );
      
      case "apple":
        // Filter for Apple Business/Work Filter tasks
        return activeTasks.filter((task: any) => 
          task.businessWorkFilter === "Apple"
        );
      
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
    <div className={`min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 ${!isMobile ? 'pt-16' : ''} relative overflow-hidden`}>
      {/* Starfield Background Effect */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-10 left-10 w-1 h-1 bg-yellow-200 rounded-full animate-pulse"></div>
        <div className="absolute top-20 right-20 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-40 left-1/4 w-1 h-1 bg-purple-200 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-60 right-1/3 w-1 h-1 bg-yellow-200 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute top-32 right-1/2 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
      </div>

      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md shadow-lg border-b border-yellow-600/30 sticky top-0 z-50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              {!isMobile && (
                <Link href="/dashboard">
                  <a className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity">
                    <Trophy className="text-yellow-400 w-8 h-8" />
                    <h1 className="text-2xl font-serif font-bold text-yellow-100">QuestList</h1>
                  </a>
                </Link>
              )}
            </div>
            
            {/* Show gold and user only on mobile (web has it in top nav) */}
            {isMobile && (
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2 bg-gradient-to-r from-yellow-600/30 to-yellow-500/30 backdrop-blur-sm px-4 py-2 rounded-full border border-yellow-500/50">
                  <Coins className="text-yellow-400 w-5 h-5" />
                  <span className="font-semibold text-yellow-100">{progress.goldTotal}</span>
                  <span className="text-sm text-yellow-200/80">Gold</span>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2 hover:bg-slate-700/50 text-yellow-100">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center border-2 border-yellow-400/50">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium">
                        {user?.firstName || user?.email || "User"}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-slate-800 border-yellow-600/30 text-yellow-100">
                    <DropdownMenuItem asChild className="hover:bg-slate-700 focus:bg-slate-700">
                      <Link href="/settings" className="flex items-center">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.location.href = '/api/logout'} className="hover:bg-slate-700 focus:bg-slate-700">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Your Quests Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-serif font-bold text-yellow-100">Your Quests</h2>
            <p className="text-yellow-200/70">Complete tasks to earn gold and unlock rewards</p>
          </div>
          <div className="flex space-x-3">
            <Button onClick={handleImportPrepare} className="flex items-center space-x-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-slate-900 border border-yellow-400/50">
              <Download className="w-4 h-4" />
              <span>Import ALL from Notion</span>
            </Button>
            <Button onClick={handleExportPrepare} variant="outline" className="flex items-center space-x-2 bg-slate-700/50 border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20 hover:text-yellow-100 hover:border-yellow-500/60">
              <Upload className="w-4 h-4" />
              <span>Export ALL to Notion</span>
            </Button>
          </div>
        </div>

            {/* Search Bar */}
            <Card className="p-4 mb-4 bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-400/60 w-4 h-4" />
                <Input
                  placeholder="Search tasks by title, description, category, or importance..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full bg-slate-700/50 border-yellow-600/20 text-yellow-100 placeholder:text-yellow-200/40 focus:border-yellow-500/50"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-yellow-400/60 hover:text-yellow-300 hover:bg-slate-700/50"
                  >
                    ×
                  </Button>
                )}
              </div>
            </Card>

            {/* Results Counter */}
            {(searchQuery || activeFilter !== "all") && (
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-yellow-200/70">
                  {searchQuery ? (
                    <span>
                      Found <strong className="text-yellow-100">{sortedTasks.length}</strong> tasks matching "{searchQuery}"
                      {activeFilter !== "all" && ` in ${activeFilter.replace("-", " ")}`}
                    </span>
                  ) : (
                    <span>
                      Showing <strong className="text-yellow-100">{sortedTasks.length}</strong> tasks in {activeFilter.replace("-", " ")}
                    </span>
                  )}
                </div>
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="text-yellow-300 hover:text-yellow-100 hover:bg-slate-700/50"
                  >
                    Clear search
                  </Button>
                )}
              </div>
            )}

            {/* Task Filters */}
            <Card className="p-4 mb-6 bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant={activeFilter === "all" ? "default" : "outline"}
                    className={`cursor-pointer ${
                      activeFilter === "all" 
                        ? "bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-900 border-yellow-400 hover:from-yellow-500 hover:to-yellow-400" 
                        : "border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20"
                    }`}
                    onClick={() => setActiveFilter("all")}
                  >
                    All Tasks
                  </Badge>
                  <Badge 
                    variant={activeFilter === "due-today" ? "default" : "outline"}
                    className={`cursor-pointer ${
                      activeFilter === "due-today" 
                        ? "bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-900 border-yellow-400 hover:from-yellow-500 hover:to-yellow-400" 
                        : "border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20"
                    }`}
                    onClick={() => setActiveFilter("due-today")}
                  >
                    Due Today
                  </Badge>
                  <Badge 
                    variant={activeFilter === "high-reward" ? "default" : "outline"}
                    className={`cursor-pointer ${
                      activeFilter === "high-reward" 
                        ? "bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-900 border-yellow-400 hover:from-yellow-500 hover:to-yellow-400" 
                        : "border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20"
                    }`}
                    onClick={() => setActiveFilter("high-reward")}
                  >
                    High Reward
                  </Badge>
                  <Badge 
                    variant={activeFilter === "quick-tasks" ? "default" : "outline"}
                    className={`cursor-pointer ${
                      activeFilter === "quick-tasks" 
                        ? "bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-900 border-yellow-400 hover:from-yellow-500 hover:to-yellow-400" 
                        : "border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20"
                    }`}
                    onClick={() => setActiveFilter("quick-tasks")}
                  >
                    Quick Tasks
                  </Badge>
                  <Badge 
                    variant={activeFilter === "high-priority" ? "default" : "outline"}
                    className={`cursor-pointer ${
                      activeFilter === "high-priority" 
                        ? "bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-900 border-yellow-400 hover:from-yellow-500 hover:to-yellow-400" 
                        : "border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20"
                    }`}
                    onClick={() => setActiveFilter("high-priority")}
                  >
                    High Priority
                  </Badge>
                  <Badge 
                    variant={activeFilter === "routines" ? "default" : "outline"}
                    className={`cursor-pointer ${
                      activeFilter === "routines" 
                        ? "bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-900 border-yellow-400 hover:from-yellow-500 hover:to-yellow-400" 
                        : "border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20"
                    }`}
                    onClick={() => setActiveFilter("routines")}
                  >
                    Routines
                  </Badge>
                  <Badge 
                    variant={activeFilter === "apple" ? "default" : "outline"}
                    className={`cursor-pointer ${
                      activeFilter === "apple" 
                        ? "bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-900 border-yellow-400 hover:from-yellow-500 hover:to-yellow-400" 
                        : "border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20"
                    }`}
                    onClick={() => setActiveFilter("apple")}
                  >
                    🍎 Apple
                  </Badge>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2 bg-slate-800/80 border-yellow-600/40 text-yellow-200 hover:bg-slate-700/80 hover:text-yellow-100">
                      <ArrowUpDown className="w-4 h-4" />
                      Sort
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-slate-800 border-yellow-600/30">
                    <DropdownMenuItem 
                      onClick={() => setSortBy("due-date")}
                      className="flex items-center gap-2 text-yellow-100 hover:bg-slate-700 focus:bg-slate-700"
                    >
                      <CalendarDays className="w-4 h-4" />
                      <span>Due Date</span>
                      {sortBy === "due-date" && <span className="ml-auto text-yellow-400">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSortBy("importance")}
                      className="flex items-center gap-2 text-yellow-100 hover:bg-slate-700 focus:bg-slate-700"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>Importance</span>
                      {sortBy === "importance" && <span className="ml-auto text-yellow-400">✓</span>}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>

            {/* Bulk Actions for Selected Tasks */}
            {selectedTasks.size > 0 && (
              <Card className="p-4 bg-blue-900/40 backdrop-blur-md border-2 border-blue-500/40 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-200 font-medium">
                      {selectedTasks.size} task{selectedTasks.size > 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleCompleteSelected}
                      className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white border border-blue-400/50"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Complete Selected
                    </Button>
                    <Button 
                      onClick={handleAppendToNotion}
                      variant="outline"
                      className="border-green-500/40 text-green-300 hover:bg-green-600/20 hover:text-green-200"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Append to Notion
                    </Button>
                    <Button 
                      onClick={handleDeleteFromNotion}
                      variant="outline"
                      className="border-red-500/40 text-red-300 hover:bg-red-600/20 hover:text-red-200"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete from Notion
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Task List */}
            <div className="space-y-4">
              {tasksLoading ? (
                <div className="text-center py-8 text-yellow-200/70">Loading tasks...</div>
              ) : tasks.length === 0 ? (
                <Card className="p-8 text-center bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30">
                  <Trophy className="w-16 h-16 text-yellow-400/50 mx-auto mb-4" />
                  <h3 className="text-lg font-serif font-semibold text-yellow-100 mb-2">No tasks yet</h3>
                  <p className="text-yellow-200/70 mb-4">Import from Notion to get started with your quests!</p>
                  <Button onClick={handleImportPrepare} className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-slate-900 border border-yellow-400/50">Import ALL from Notion</Button>
                </Card>
              ) : sortedTasks.length === 0 ? (
                <Card className="p-8 text-center bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30">
                  <Search className="w-16 h-16 text-yellow-400/50 mx-auto mb-4" />
                  <h3 className="text-lg font-serif font-semibold text-yellow-100 mb-2">
                    {searchQuery ? `No tasks found for "${searchQuery}"` : "No tasks match your filter"}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchQuery 
                      ? "Try searching with different keywords or clear your search"
                      : "Try adjusting your filter to see more tasks"
                    }
                  </p>
                  <div className="flex gap-2 justify-center">
                    {searchQuery && (
                      <Button onClick={() => setSearchQuery("")} variant="outline">
                        Clear Search
                      </Button>
                    )}
                    <Button onClick={() => setActiveFilter("all")} variant="outline">
                      Show All Tasks
                    </Button>
                  </div>
                </Card>
              ) : (
                sortedTasks.map((task: any) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onSelect={handleTaskSelect}
                    isSelected={selectedTasks.has(task.id)}
                  />
                ))
              )}
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
        onClose={() => {
          setShowCalendarSync(false);
          setCalendarNeedsAuth(false);
        }}
        onSync={handleCalendarSync}
        selectedTasksCount={selectedTasks.size}
        needsGoogleAuth={calendarNeedsAuth}
      />
      
      <CompletionAnimation
        isOpen={showCompletion}
        onClose={() => setShowCompletion(false)}
        task={completedTask}
        newGoldTotal={progress.goldTotal}
      />

      <RecyclingModal
        isOpen={showRecycling}
        onClose={() => setShowRecycling(false)}
      />

      {/* Import Confirmation Modal */}
      <Dialog open={showImportConfirm} onOpenChange={setShowImportConfirm}>
        <DialogContent className="bg-slate-800 border-2 border-yellow-600/40">
          <DialogHeader>
            <DialogTitle className="text-yellow-100 font-serif">Import ALL from Notion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-yellow-200/70 mb-4">
              This will import {importTaskCount} tasks from your Notion database and overwrite all existing tasks in the app.
            </p>
            <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mr-2" />
                <span className="text-yellow-200 font-medium">Warning:</span>
              </div>
              <p className="text-yellow-200/80 mt-1">
                All {tasks.length} existing tasks in the app will be deleted and replaced with {importTaskCount} tasks from Notion.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportConfirm(false)} className="border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20 hover:text-yellow-100">
              Cancel
            </Button>
            <Button onClick={handleImportConfirm} className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white border border-blue-400/50">
              Import {importTaskCount} Tasks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Detection Dialog */}
      <Dialog open={showDuplicateConfirm} onOpenChange={setShowDuplicateConfirm}>
        <DialogContent className="bg-slate-800 border-2 border-yellow-600/40">
          <DialogHeader>
            <DialogTitle className="text-yellow-100 font-serif">Duplicates Detected</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-yellow-200/70 mb-4">
              Found {duplicateCount} task(s) that already exist in your app (based on Notion ID).
            </p>
            <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mr-2" />
                <span className="text-yellow-200 font-medium">Choose an option:</span>
              </div>
              <p className="text-yellow-200/80 mt-1">
                • <strong>Include Duplicates:</strong> Import all {importTaskCount} tasks (duplicates will be updated)<br/>
                • <strong>Skip Duplicates:</strong> Import only {importTaskCount - duplicateCount} new tasks
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDuplicateConfirm(false)} 
              className="border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20 hover:text-yellow-100"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setIncludeDuplicates(false);
                handleImportConfirm();
              }} 
              className="bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-500 hover:to-slate-400 text-white border border-slate-400/50"
            >
              Skip Duplicates ({importTaskCount - duplicateCount})
            </Button>
            <Button 
              onClick={() => {
                setIncludeDuplicates(true);
                handleImportConfirm();
              }} 
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white border border-blue-400/50"
            >
              Include All ({importTaskCount})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Confirmation Modal */}
      <Dialog open={showExportConfirm} onOpenChange={setShowExportConfirm}>
        <DialogContent className="bg-slate-800 border-2 border-yellow-600/40">
          <DialogHeader>
            <DialogTitle className="text-yellow-100 font-serif">Export ALL to Notion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-yellow-200/70 mb-4">
              This will export {exportTaskCount} tasks from the app to your Notion database and overwrite all existing tasks in Notion.
            </p>
            <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
                <span className="text-red-200 font-medium">Warning:</span>
              </div>
              <p className="text-red-200/80 mt-1">
                All existing tasks in your Notion database will be deleted and replaced with {exportTaskCount} tasks from the app.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleExportConfirm} className="bg-red-600 hover:bg-red-700">
              Export {exportTaskCount} Tasks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Detail Modal */}
      {detailTaskId && (
        <TaskDetailModal
          task={tasks.find((t: any) => t.id === detailTaskId)}
          open={!!detailTaskId}
          onOpenChange={(open) => {
            if (!open) {
              setDetailTaskId(null);
              // Remove query parameter
              window.history.pushState({}, '', '/tasks');
            }
          }}
        />
      )}
    </div>
  );
}
