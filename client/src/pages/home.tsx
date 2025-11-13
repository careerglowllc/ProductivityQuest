import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Coins, Trophy, Calendar, ShoppingCart, TrendingUp, Clock, ArrowUpDown, CalendarDays, AlertTriangle, Download, Upload, CheckCircle, Trash2, Settings, LogOut, User, Search } from "lucide-react";
import { TaskCard } from "@/components/task-card";
import { ItemShopModal } from "@/components/item-shop-modal";
import { CalendarSyncModal } from "@/components/calendar-sync-modal";
import { CompletionAnimation } from "@/components/completion-animation";
import { RecyclingModal } from "@/components/recycling-modal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [importTaskCount, setImportTaskCount] = useState(0);
  const [exportTaskCount, setExportTaskCount] = useState(0);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [showRecycling, setShowRecycling] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [calendarNeedsAuth, setCalendarNeedsAuth] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ["/api/tasks"],
  });

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

    try {
      const selectedTaskIds = Array.from(selectedTasks);
      let totalGoldEarned = 0;
      let completedTasksCount = 0;

      // Complete each selected task
      for (const taskId of selectedTaskIds) {
        const response = await apiRequest("PATCH", `/api/tasks/${taskId}/complete`);
        const task = await response.json();
        totalGoldEarned += task.goldValue;
        completedTasksCount++;
      }

      // Clear selections
      setSelectedTasks(new Set());
      
      // Show completion animation for the first task (representing all)
      if (selectedTaskIds.length > 0) {
        const firstTaskId = selectedTaskIds[0];
        const firstTask = tasks.find((t: any) => t.id === firstTaskId);
        if (firstTask) {
          setCompletedTask({
            ...firstTask,
            goldValue: totalGoldEarned
          });
          setShowCompletion(true);
        }
      }
      
      refetchTasks();
      refetchProgress();
      
      toast({
        title: `${completedTasksCount} Quest${completedTasksCount > 1 ? 's' : ''} Complete!`,
        description: `You earned ${totalGoldEarned} gold total!`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete selected tasks",
        variant: "destructive",
      });
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
      const response = await apiRequest("GET", "/api/notion/count");
      const result = await response.json();
      setImportTaskCount(result.count);
      setShowImportConfirm(true);
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
      const response = await apiRequest("POST", "/api/notion/import");
      const result = await response.json();
      
      setShowImportConfirm(false);
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
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {user?.firstName || user?.email || "User"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = '/api/logout'}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.firstName || user?.username || "Adventurer"}! 👋
          </h2>
          <p className="text-gray-600">Ready to level up your productivity?</p>
          
          {/* Stats Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium mb-1">Total Gold</p>
                    <p className="text-4xl font-bold">{progress.goldTotal || 0}</p>
                  </div>
                  <Coins className="h-12 w-12 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium mb-1">Quests Completed</p>
                    <p className="text-4xl font-bold">{progress.tasksCompleted || 0}</p>
                  </div>
                  <CheckCircle className="h-12 w-12 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium mb-1">Today's Progress</p>
                    <p className="text-4xl font-bold">{stats.completedToday || 0}/{stats.totalToday || 0}</p>
                  </div>
                  <TrendingUp className="h-12 w-12 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

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
                  disabled={selectedTasks.size === 0}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    selectedTasks.size === 0 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Calendar className="w-5 h-5" />
                  <span className="font-medium">Calendar Sync {selectedTasks.size > 0 ? `(${selectedTasks.size})` : ''}</span>
                </button>
                <button
                  onClick={() => setShowRecycling(true)}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="font-medium">Recycling</span>
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
                <Button onClick={handleImportPrepare} className="flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Import ALL from Notion</span>
                </Button>
                <Button onClick={handleExportPrepare} variant="outline" className="flex items-center space-x-2">
                  <Upload className="w-4 h-4" />
                  <span>Export ALL to Notion</span>
                </Button>
                <Button 
                  onClick={() => setShowCalendarSync(true)}
                  variant="outline"
                  className="flex items-center space-x-2"
                  disabled={selectedTasks.size === 0}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Sync Calendar {selectedTasks.size > 0 ? `(${selectedTasks.size})` : ''}</span>
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <Card className="p-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search tasks by title, description, category, or importance..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </Button>
                )}
              </div>
            </Card>

            {/* Results Counter */}
            {(searchQuery || activeFilter !== "all") && (
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600">
                  {searchQuery ? (
                    <span>
                      Found <strong>{sortedTasks.length}</strong> tasks matching "{searchQuery}"
                      {activeFilter !== "all" && ` in ${activeFilter.replace("-", " ")}`}
                    </span>
                  ) : (
                    <span>
                      Showing <strong>{sortedTasks.length}</strong> tasks in {activeFilter.replace("-", " ")}
                    </span>
                  )}
                </div>
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Clear search
                  </Button>
                )}
              </div>
            )}

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

            {/* Bulk Actions for Selected Tasks */}
            {selectedTasks.size > 0 && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-800 font-medium">
                      {selectedTasks.size} task{selectedTasks.size > 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleCompleteSelected}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Complete Selected
                    </Button>
                    <Button 
                      onClick={handleAppendToNotion}
                      variant="outline"
                      className="border-green-500 text-green-600 hover:bg-green-50"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Append to Notion
                    </Button>
                    <Button 
                      onClick={handleDeleteFromNotion}
                      variant="outline"
                      className="border-red-500 text-red-600 hover:bg-red-50"
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
                <div className="text-center py-8">Loading tasks...</div>
              ) : tasks.length === 0 ? (
                <Card className="p-8 text-center">
                  <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No tasks yet</h3>
                  <p className="text-gray-600 mb-4">Import from Notion to get started with your quests!</p>
                  <Button onClick={handleImportPrepare}>Import ALL from Notion</Button>
                </Card>
              ) : sortedTasks.length === 0 ? (
                <Card className="p-8 text-center">
                  <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import ALL from Notion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600 mb-4">
              This will import {importTaskCount} tasks from your Notion database and overwrite all existing tasks in the app.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                <span className="text-yellow-800 font-medium">Warning:</span>
              </div>
              <p className="text-yellow-700 mt-1">
                All {tasks.length} existing tasks in the app will be deleted and replaced with {importTaskCount} tasks from Notion.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportConfirm} className="bg-blue-600 hover:bg-blue-700">
              Import {importTaskCount} Tasks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Confirmation Modal */}
      <Dialog open={showExportConfirm} onOpenChange={setShowExportConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export ALL to Notion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600 mb-4">
              This will export {exportTaskCount} tasks from the app to your Notion database and overwrite all existing tasks in Notion.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-800 font-medium">Warning:</span>
              </div>
              <p className="text-red-700 mt-1">
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
    </div>
  );
}
