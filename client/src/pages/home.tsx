import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Coins, Trophy, Calendar, ShoppingCart, TrendingUp, Clock, ArrowUpDown, CalendarDays, AlertTriangle, Download, Upload, CheckCircle, Trash2, Settings, LogOut, User, Search, Tag, FileSpreadsheet, CheckSquare, XSquare, LayoutGrid, List, ArrowRight, X, FolderOpen, Filter } from "lucide-react";
import { TaskCard } from "@/components/task-card";
import { TaskDetailModal } from "@/components/task-detail-modal";
import { ItemShopModal } from "@/components/item-shop-modal";
import { CalendarSyncModal } from "@/components/calendar-sync-modal";
import { CompletionAnimation } from "@/components/completion-animation";
import { LevelUpModal } from "@/components/level-up-modal";
import { SkillAdjustmentModal } from "@/components/skill-adjustment-modal";
import { AddTaskModal } from "@/components/add-task-modal";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";

type FilterType = "all" | "due-today" | "high-reward" | "quick-tasks" | "high-priority" | "routines" | "business-apple" | "business-general" | "business-mw";
type BusinessFilterType = "Apple" | "General" | "MW";
type SortType = "due-date" | "importance";
type ViewType = "list" | "grid";

export default function Home() {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const [showItemShop, setShowItemShop] = useState(false);
  const [showCalendarSync, setShowCalendarSync] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completedTask, setCompletedTask] = useState<any>(null);
  const [completionSkillXPGains, setCompletionSkillXPGains] = useState<any[]>([]);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [leveledUpSkills, setLeveledUpSkills] = useState<any[]>([]);
  
  // Load saved filter preference from localStorage, default to 'all'
  const [activeFilter, setActiveFilter] = useState<FilterType>(() => {
    const savedFilter = localStorage.getItem('tasksFilter');
    const validFilters: FilterType[] = ["all", "due-today", "high-reward", "quick-tasks", "high-priority", "routines", "business-apple", "business-general", "business-mw"];
    if (savedFilter && validFilters.includes(savedFilter as FilterType)) {
      return savedFilter as FilterType;
    }
    return "all";
  });
  
  // Load saved sort preference from localStorage, default to 'due-date'
  const [sortBy, setSortBy] = useState<SortType>(() => {
    const savedSort = localStorage.getItem('tasksSort');
    const validSorts: SortType[] = ["due-date", "importance"];
    if (savedSort && validSorts.includes(savedSort as SortType)) {
      return savedSort as SortType;
    }
    return "due-date";
  });
  
  const [viewType, setViewType] = useState<ViewType>("list");
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [importTaskCount, setImportTaskCount] = useState(0);
  const [exportTaskCount, setExportTaskCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [calendarNeedsAuth, setCalendarNeedsAuth] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null);
  const [showReschedulePopover, setShowReschedulePopover] = useState(false);
  
  // Calendar duplicate state
  const [showCalendarDuplicateConfirm, setShowCalendarDuplicateConfirm] = useState(false);
  const [calendarDuplicateCount, setCalendarDuplicateCount] = useState(0);
  const [calendarDuplicateTasks, setCalendarDuplicateTasks] = useState<any[]>([]);
  const [pendingCalendarTaskIds, setPendingCalendarTaskIds] = useState<number[]>([]);
  
  // Categorization adjustment state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [lastCategorizedTasks, setLastCategorizedTasks] = useState<any[]>([]);
  const [recategorizeQueue, setRecategorizeQueue] = useState<any[]>([]);
  
  // Delete from Notion confirmation state
  const [showDeleteNotionConfirm, setShowDeleteNotionConfirm] = useState(false);
  const [deleteNotionTaskCount, setDeleteNotionTaskCount] = useState(0);
  
  // Undo functionality state
  const [lastAction, setLastAction] = useState<{
    type: 'complete' | 'append-notion' | 'delete-notion' | 'import-notion' | 'export-notion' | null;
    taskIds: number[];
    goldEarned?: number;
    exportDetails?: { exported: number[]; linked: number[] }; // For export undo
  }>({ type: null, taskIds: [] });

  // Date-based undo state (for reschedule, push days, move overdue)
  const [lastDateAction, setLastDateAction] = useState<{
    label: string;
    previousDates: { id: number; dueDate: string | null }[];
  } | null>(null);
  // Keep a ref so toast onClick callbacks always see the latest value
  const lastDateActionRef = useRef(lastDateAction);
  lastDateActionRef.current = lastDateAction;
  
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Calendar operation queue - ensures clear/sync/remove operations run sequentially
  const calendarQueueRef = useRef<Promise<void>>(Promise.resolve());
  const enqueueCalendarOp = useCallback((op: () => Promise<void>) => {
    calendarQueueRef.current = calendarQueueRef.current.then(op, op);
  }, []);

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

  // Save filter preference whenever it changes
  useEffect(() => {
    localStorage.setItem('tasksFilter', activeFilter);
  }, [activeFilter]);
  
  // Save sort preference whenever it changes
  useEffect(() => {
    localStorage.setItem('tasksSort', sortBy);
  }, [sortBy]);

  const { data: progress = { goldTotal: 0, tasksCompleted: 0 }, refetch: refetchProgress } = useQuery({
    queryKey: ["/api/progress"],
  });

  const { data: stats = { completedToday: 0, totalToday: 0, goldEarnedToday: 0 } } = useQuery({
    queryKey: ["/api/stats"],
  });

  const { data: skills = [] } = useQuery({
    queryKey: ["/api/skills"],
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

  const handleSelectAll = (tasksToSelect: any[]) => {
    const newSelected = new Set<number>();
    tasksToSelect.forEach((task: any) => {
      newSelected.add(task.id);
    });
    setSelectedTasks(newSelected);
    toast({
      title: "Tasks Selected",
      description: `Selected ${tasksToSelect.length} task${tasksToSelect.length > 1 ? 's' : ''}`,
    });
  };

  const handleDeselectAll = () => {
    setSelectedTasks(new Set());
    toast({
      title: "Selection Cleared",
      description: "All tasks deselected",
    });
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

    // Calculate optimistic skill XP gains BEFORE backend call
    const optimisticSkillXPGains: any[] = [];
    const skillXPMap = new Map<string, { xpGained: number; currentXP: number; currentLevel: number; maxXP: number }>();
    
    // Simple XP calculation (matches backend logic)
    const calculateOptimisticXP = (importance: string, duration: number, skillCount: number) => {
      const importanceMultipliers: any = {
        'Pareto': 3.0,
        'High': 2.5,
        'Med-High': 2.0,
        'Medium': 1.5,
        'Med-Low': 1.0,
        'Low': 0.5
      };
      const baseXP = duration * 0.5;
      const multiplier = importanceMultipliers[importance] || 1.5;
      return Math.round((baseXP * multiplier) / Math.max(skillCount, 1));
    };

    // Calculate XP for all tasks being completed
    tasksToComplete.forEach((task: any) => {
      if (task.skillTags && task.skillTags.length > 0) {
        const xpPerSkill = calculateOptimisticXP(task.importance, task.duration, task.skillTags.length);
        
        task.skillTags.forEach((skillName: string) => {
          if (skillXPMap.has(skillName)) {
            const existing = skillXPMap.get(skillName)!;
            existing.xpGained += xpPerSkill;
          } else {
            // Find skill in current skills data
            const currentSkill = (skills as any[])?.find((s: any) => s.skillName === skillName);
            if (currentSkill) {
              skillXPMap.set(skillName, {
                xpGained: xpPerSkill,
                currentXP: currentSkill.xp || 0,
                currentLevel: currentSkill.level || 1,
                maxXP: currentSkill.maxXp || 100
              });
            }
          }
        });
      }
    });

    // Convert to array format for display
    skillXPMap.forEach((data, skillName) => {
      optimisticSkillXPGains.push({
        skillName,
        xpGained: data.xpGained,
        newXP: data.currentXP + data.xpGained,
        newLevel: data.currentLevel,
        maxXP: data.maxXP
      });
    });

    // OPTIMISTIC UI: Update immediately
    setSelectedTasks(new Set());
    
    // Show completion animation IMMEDIATELY with optimistic data
    setCompletedTask({
      ...tasksToComplete[0],
      goldValue: totalGoldEarned
    });
    setCompletionSkillXPGains(optimisticSkillXPGains); // Show calculated XP immediately!
    setShowCompletion(true);

    // Track for undo immediately so toast Undo button works
    setLastAction({
      type: 'complete',
      taskIds: selectedTaskIds,
      goldEarned: totalGoldEarned
    });

    // Show toast immediately with undo action
    toast({
      title: `${tasksToComplete.length} Quest${tasksToComplete.length > 1 ? 's' : ''} Complete!`,
      description: `Earning ${totalGoldEarned} gold. Task${tasksToComplete.length > 1 ? 's' : ''} moved to recycling bin.`,
      duration: 15000,
      action: (
        <ToastAction altText="Undo completion" onClick={() => handleUndo()}>
          Undo
        </ToastAction>
      ),
    });

    try {
      // Call backend to actually update database - happens in background
      const response = await apiRequest("POST", "/api/tasks/complete-batch", { 
        taskIds: selectedTaskIds 
      });
      
      const data = await response.json();
      
      console.log('🎮 Backend completion confirmed:', data);
      
      // Check for level-ups and queue them to show AFTER completion modal
      if (data.leveledUpSkills && data.leveledUpSkills.length > 0) {
        console.log('🎉 Level ups detected:', data.leveledUpSkills);
        setLeveledUpSkills(data.leveledUpSkills);
      }
      
      // Optionally update with accurate backend data if different
      // (Usually the optimistic calc is close enough, but backend is authoritative)
      if (data.skillXPGains && data.skillXPGains.length > 0) {
        // Backend returned actual XP with level-ups calculated
        setCompletionSkillXPGains(data.skillXPGains);
      }
      
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

  const handleDeleteSelected = async () => {
    if (selectedTasks.size === 0) return;

    const selectedTaskIds = Array.from(selectedTasks);
    const tasksToDelete = selectedTaskIds.map(id => {
      return (tasks as any[]).find((t: any) => t.id === id);
    }).filter(Boolean);

    if (tasksToDelete.length === 0) return;

    // OPTIMISTIC UI: Update immediately
    setSelectedTasks(new Set());

    // Show toast immediately
    toast({
      title: `${tasksToDelete.length} Quest${tasksToDelete.length > 1 ? 's' : ''} Deleted`,
      description: `Task${tasksToDelete.length > 1 ? 's' : ''} moved to recycling bin without earning gold or XP.`,
    });

    try {
      // Call backend to actually update database
      const response = await apiRequest("POST", "/api/tasks/delete-batch", { 
        taskIds: selectedTaskIds 
      });
      
      const data = await response.json();
      
      console.log('🗑️ Backend deletion confirmed:', data);
      
      // Track for undo
      setLastAction({
        type: 'delete-notion', // Reusing the delete-notion type for undo
        taskIds: selectedTaskIds
      });
      
      // Refresh data after backend completes
      refetchTasks();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete tasks. Refreshing...",
        variant: "destructive",
      });
      // Force refresh to get correct state
      refetchTasks();
    }
  };

  // Remove selected tasks from calendar (keeps quests)
  const handleRemoveFromCalendar = () => {
    if (selectedTasks.size === 0) return;

    const selectedTaskIds = Array.from(selectedTasks);
    // Look through ALL tasks (including completed) to find ones that match selection
    const tasksWithSchedule = selectedTaskIds.map(id => {
      return (tasks as any[]).find((t: any) => t.id === id);
    }).filter((t: any) => t && (t.scheduledTime || t.googleEventId));

    if (tasksWithSchedule.length === 0) {
      toast({
        title: "No Scheduled Tasks",
        description: "None of the selected tasks are on the calendar.",
      });
      return;
    }

    // Clear selection immediately (optimistic)
    setSelectedTasks(new Set());

    toast({
      title: "Removing from Calendar...",
      description: `Unscheduling ${tasksWithSchedule.length} task${tasksWithSchedule.length > 1 ? 's' : ''}...`,
    });

    enqueueCalendarOp(async () => {
      try {
        let successCount = 0;
        for (const task of tasksWithSchedule) {
          try {
            await apiRequest("POST", `/api/tasks/${task.id}/unschedule`, {
              removeFromGoogleCalendar: true
            });
            successCount++;
          } catch (err) {
            console.error(`Failed to unschedule task ${task.id}:`, err);
          }
        }

        toast({
          title: "✓ Removed from Calendar",
          description: `${successCount} task${successCount > 1 ? 's' : ''} removed from calendar. Quests are still available here.`,
        });

        await refetchTasks();
        queryClient.invalidateQueries({ queryKey: ['/api/google-calendar/events'] });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to remove some tasks from calendar.",
          variant: "destructive",
        });
        refetchTasks();
      }
    });
  };

  // Remove ALL scheduled tasks from calendar (including completed ones)
  const handleRemoveAllFromCalendar = () => {
    // Find ALL tasks that are scheduled (completed or not)
    const allScheduledTasks = (tasks as any[]).filter((t: any) => t.scheduledTime || t.googleEventId);

    if (allScheduledTasks.length === 0) {
      toast({
        title: "No Scheduled Tasks",
        description: "There are no tasks on the calendar.",
      });
      return;
    }

    // Clear selection
    setSelectedTasks(new Set());

    toast({
      title: "Clearing Calendar...",
      description: `Removing ${allScheduledTasks.length} task${allScheduledTasks.length > 1 ? 's' : ''} from calendar...`,
    });

    enqueueCalendarOp(async () => {
      try {
        let successCount = 0;
        for (const task of allScheduledTasks) {
          try {
            await apiRequest("POST", `/api/tasks/${task.id}/unschedule`, {
              removeFromGoogleCalendar: true
            });
            successCount++;
          } catch (err) {
            console.error(`Failed to unschedule task ${task.id}:`, err);
          }
        }

        toast({
          title: "✓ Calendar Cleared",
          description: `${successCount} task${successCount > 1 ? 's' : ''} removed from calendar.`,
        });

        await refetchTasks();
        queryClient.invalidateQueries({ queryKey: ['/api/google-calendar/events'] });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to remove some tasks from calendar.",
          variant: "destructive",
        });
        refetchTasks();
      }
    });
  };

  const handleAppendToNotion = async () => {
    if (selectedTasks.size === 0) return;

    try {
      const selectedTaskIds = Array.from(selectedTasks);
      const response = await apiRequest("POST", "/api/notion/append", {
        taskIds: selectedTaskIds
      });
      const result = await response.json();

      // Track for undo
      setLastAction({
        type: 'append-notion',
        taskIds: selectedTaskIds
      });

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

    // Count tasks that have Notion IDs (can be deleted from Notion)
    const selectedTaskIds = Array.from(selectedTasks);
    const tasksWithNotionId = (tasks as any[]).filter((task: any) => 
      selectedTaskIds.includes(task.id) && task.notionId
    );
    
    setDeleteNotionTaskCount(tasksWithNotionId.length);
    setShowDeleteNotionConfirm(true);
  };

  const handleDeleteFromNotionConfirm = async () => {
    setShowDeleteNotionConfirm(false);
    
    try {
      const selectedTaskIds = Array.from(selectedTasks);
      const response = await apiRequest("POST", "/api/notion/delete", {
        taskIds: selectedTaskIds
      });
      const result = await response.json();

      // Track for undo
      setLastAction({
        type: 'delete-notion',
        taskIds: selectedTaskIds
      });

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

  const handleRecategorizeSelected = async () => {
    if (selectedTasks.size === 0) return;

    const selectedTaskIds = Array.from(selectedTasks);
    const tasksToRecategorize = (tasks as any[]).filter((task: any) => 
      selectedTaskIds.includes(task.id)
    );
    
    if (tasksToRecategorize.length === 0) return;
    
    // Set up the queue for sequential recategorization
    setRecategorizeQueue(tasksToRecategorize);
    setShowAdjustModal(true);
    
    // Clear selection
    setSelectedTasks(new Set());
  };

  const handleAddToCalendar = async (force = false) => {
    if (selectedTasks.size === 0) return;

    try {
      const selectedTaskIds = Array.from(selectedTasks);
      
      if (!force) {
        toast({
          title: "Checking Calendar...",
          description: `Checking ${selectedTaskIds.length} task${selectedTaskIds.length > 1 ? 's' : ''}`,
        });
      }

      const response = await apiRequest("POST", "/api/tasks/add-to-calendar", {
        taskIds: selectedTaskIds,
        force
      });
      const result = await response.json();

      // Check if duplicates were found
      if (result.duplicatesFound && !force) {
        setCalendarDuplicateCount(result.duplicateCount);
        setCalendarDuplicateTasks(result.duplicateTasks);
        setPendingCalendarTaskIds(selectedTaskIds);
        setShowCalendarDuplicateConfirm(true);
        return;
      }

      // Clear selection and refetch to show updated calendar times
      setSelectedTasks(new Set());
      refetchTasks();
      
      toast({
        title: "Added to Calendar",
        description: `${result.added} task${result.added !== 1 ? 's' : ''} added to calendar${result.skipped > 0 ? ` (${result.skipped} skipped - no due date or already completed)` : ''}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to add tasks to calendar. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCalendarDuplicateConfirm = async () => {
    setShowCalendarDuplicateConfirm(false);
    await handleAddToCalendar(true); // Force add even with duplicates
  };

  const handleCategorizeSkill = async () => {
    if (selectedTasks.size === 0) return;

    try {
      const selectedTaskIds = Array.from(selectedTasks);
      
      toast({
        title: "Categorizing...",
        description: `Analyzing ${selectedTaskIds.length} task${selectedTaskIds.length > 1 ? 's' : ''} with AI`,
      });

      const response = await apiRequest("POST", "/api/tasks/categorize", {
        taskIds: selectedTaskIds
      });
      const result = await response.json();

      // Clear selection
      setSelectedTasks(new Set());
      
      // Store categorized tasks for potential adjustment
      if (result.tasks && result.tasks.length > 0) {
        setLastCategorizedTasks(result.tasks);
      }
      
      // Refresh tasks to show new skill tags
      refetchTasks();

      // Show success toast - user can click "Adjust Skills" button separately
      toast({
        title: "✓ Categorized Successfully",
        description: (
          <div className="flex flex-col gap-2">
            <p>{result.categorizedCount} task{result.categorizedCount > 1 ? 's' : ''} categorized with AI</p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                setShowAdjustModal(true);
              }}
              className="w-fit"
            >
              Adjust Skills
            </Button>
          </div>
        ),
        duration: 10000, // Show for 10 seconds
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to categorize tasks. Check your OpenAI API key.",
        variant: "destructive",
      });
    }
  };

  const handleUndo = async () => {
    if (!lastAction.type) return;

    try {
      let response;
      let description = "";

      switch (lastAction.type) {
        case 'complete':
          response = await apiRequest("POST", "/api/tasks/undo-complete", {
            taskIds: lastAction.taskIds
          });
          description = `${lastAction.taskIds.length} task${lastAction.taskIds.length > 1 ? 's' : ''} restored. ${lastAction.goldEarned || 0} gold refunded.`;
          break;
        
        case 'append-notion':
          response = await apiRequest("POST", "/api/notion/undo-append", {
            taskIds: lastAction.taskIds
          });
          description = `${lastAction.taskIds.length} task${lastAction.taskIds.length > 1 ? 's' : ''} removed from Notion`;
          break;
        
        case 'delete-notion':
          response = await apiRequest("POST", "/api/notion/undo-delete", {
            taskIds: lastAction.taskIds
          });
          description = `${lastAction.taskIds.length} task${lastAction.taskIds.length > 1 ? 's' : ''} restored to Notion`;
          break;
        
        case 'import-notion':
          response = await apiRequest("POST", "/api/notion/undo-import", {
            taskIds: lastAction.taskIds
          });
          description = `Deleted ${lastAction.taskIds.length} imported task${lastAction.taskIds.length > 1 ? 's' : ''} from app`;
          break;
        
        case 'export-notion':
          response = await apiRequest("POST", "/api/notion/undo-export", {
            exportedTaskIds: lastAction.exportDetails?.exported || [],
            linkedTaskIds: lastAction.exportDetails?.linked || []
          });
          const result = await response.json();
          description = `Undid export: ${result.removed || 0} removed from Notion, ${result.unlinked || 0} unlinked`;
          break;
      }

      // Clear last action
      setLastAction({ type: null, taskIds: [] });

      // Refresh data
      refetchTasks();
      if (lastAction.type === 'complete') {
        refetchProgress();
      }

      toast({
        title: "Undo Successful",
        description,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to undo action",
        variant: "destructive",
      });
    }
  };

  // Undo date-based changes (reschedule, push days, move overdue)
  const undoDateChanges = async () => {
    const action = lastDateActionRef.current;
    if (!action) return;

    const { previousDates, label } = action;

    // Optimistic: restore previous dates in cache immediately
    queryClient.setQueryData(["/api/tasks"], (old: any[] | undefined) => {
      if (!old) return old;
      const dateMap = new Map(previousDates.map(d => [d.id, d.dueDate]));
      return old.map((t: any) =>
        dateMap.has(t.id) ? { ...t, dueDate: dateMap.get(t.id) } : t
      );
    });

    setLastDateAction(null);

    toast({
      title: "↩️ Undo Successful",
      description: `Reverted ${label}.`,
    });

    // Fire backend patches to restore original dates
    try {
      await Promise.all(
        previousDates.map(({ id, dueDate }) =>
          apiRequest("PATCH", `/api/tasks/${id}`, { dueDate })
        )
      );
      refetchTasks();
    } catch (error) {
      toast({
        title: "Error",
        description: "Some tasks failed to revert. Please refresh.",
        variant: "destructive",
      });
      refetchTasks();
    }
  };

  const handleCategorizeAll = async () => {
    try {
      // Get all tasks without skillTags
      const uncategorizedTasks = (tasks as any[]).filter(
        (task: any) => !task.skillTags || task.skillTags.length === 0
      );

      if (uncategorizedTasks.length === 0) {
        toast({
          title: "All Set!",
          description: "All tasks are already categorized with skills.",
        });
        return;
      }

      toast({
        title: "Categorizing Tasks...",
        description: `Categorizing ${uncategorizedTasks.length} tasks with AI. This may take a moment.`,
      });

      // Send request to categorize all tasks
      const response = await apiRequest("POST", "/api/tasks/categorize-all");
      const data = await response.json();

      toast({
        title: "Categorization Complete!",
        description: `Successfully categorized ${data.categorizedCount} tasks with skills.`,
      });

      // Refresh tasks to show updated skillTags
      refetchTasks();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to categorize tasks. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleMoveOverdueToToday = async () => {
    const allTasks = queryClient.getQueryData<any[]>(["/api/tasks"]) || [];
    const now = new Date();
    // Use start of today in UTC to match how dates are stored
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // Find all overdue, incomplete, non-recycled tasks (due date strictly before today's start UTC)
    const overdueTasks = allTasks.filter((t: any) => {
      if (t.completed || t.recycled || !t.dueDate) return false;
      const due = new Date(t.dueDate);
      // Compare full timestamps - task is overdue if its due date is before today's UTC midnight
      return due.getTime() < todayStart.getTime();
    });

    if (overdueTasks.length === 0) {
      toast({ title: "No Overdue Tasks", description: "There are no overdue tasks to move." });
      return;
    }

    // Save previous dates for undo
    const previousDates = overdueTasks.map((t: any) => ({ id: t.id, dueDate: t.dueDate }));

    // Optimistic cache update — set overdue tasks to today's date
    queryClient.setQueryData(["/api/tasks"], (old: any[] | undefined) => {
      if (!old) return old;
      const overdueIds = new Set(overdueTasks.map((t: any) => t.id));
      return old.map((t: any) =>
        overdueIds.has(t.id) ? { ...t, dueDate: todayStart.toISOString() } : t
      );
    });

    // Store undo data
    const undoLabel = `move of ${overdueTasks.length} overdue task${overdueTasks.length !== 1 ? 's' : ''} to today`;
    setLastDateAction({ label: undoLabel, previousDates });

    toast({
      title: "📅 Overdue Tasks Updated",
      description: `Moved ${overdueTasks.length} overdue task${overdueTasks.length !== 1 ? 's' : ''} to today.`,
      duration: 15000,
      action: (
        <ToastAction altText="Undo move overdue" onClick={() => undoDateChanges()}>
          Undo
        </ToastAction>
      ),
    });

    // Fire backend call with the specific task IDs to avoid timezone mismatches
    try {
      await Promise.all(
        overdueTasks.map((t: any) =>
          apiRequest("PATCH", `/api/tasks/${t.id}`, { dueDate: todayStart.toISOString() })
        )
      );
      refetchTasks();
    } catch (error) {
      // Revert optimistic update
      queryClient.setQueryData(["/api/tasks"], (old: any[] | undefined) => {
        if (!old) return old;
        const dateMap = new Map(previousDates.map(d => [d.id, d.dueDate]));
        return old.map((t: any) =>
          dateMap.has(t.id) ? { ...t, dueDate: dateMap.get(t.id) } : t
        );
      });
      toast({
        title: "Error",
        description: "Failed to move overdue tasks to today.",
        variant: "destructive",
      });
    }
  };

  const handleRescheduleSelected = async (newDate: Date) => {
    if (selectedTasks.size === 0) return;
    setShowReschedulePopover(false);

    const selectedTaskIds = Array.from(selectedTasks);
    const taskCount = selectedTaskIds.length;
    const dateLabel = newDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Save previous dates for undo
    const allTasks = queryClient.getQueryData<any[]>(["/api/tasks"]) || [];
    const previousDates = selectedTaskIds.map(id => {
      const task = allTasks.find((t: any) => t.id === id);
      return { id, dueDate: task?.dueDate || null };
    });

    // Optimistic: update cache immediately so tasks move/disappear from current view
    const previousTasksSnapshot = queryClient.getQueryData<any[]>(["/api/tasks"]);
    queryClient.setQueryData(["/api/tasks"], (old: any[] | undefined) => {
      if (!old) return old;
      return old.map((t: any) =>
        selectedTaskIds.includes(t.id)
          ? { ...t, dueDate: newDate.toISOString() }
          : t
      );
    });

    // Store undo data
    const undoLabel = `reschedule of ${taskCount} task${taskCount !== 1 ? 's' : ''}`;
    setLastDateAction({ label: undoLabel, previousDates });

    // Clear selection and show toast immediately
    setSelectedTasks(new Set());
    toast({
      title: "📅 Tasks Rescheduled",
      description: `Moved ${taskCount} task${taskCount !== 1 ? 's' : ''} to ${dateLabel}.`,
      duration: 15000,
      action: (
        <ToastAction altText="Undo reschedule" onClick={() => undoDateChanges()}>
          Undo
        </ToastAction>
      ),
    });

    // Fire backend updates in background
    try {
      await Promise.all(
        selectedTaskIds.map((taskId) =>
          apiRequest("PATCH", `/api/tasks/${taskId}`, {
            dueDate: newDate.toISOString(),
          })
        )
      );
      // Silently refetch to ensure full sync
      refetchTasks();
    } catch (error) {
      // Rollback optimistic update on failure
      if (previousTasksSnapshot) {
        queryClient.setQueryData(["/api/tasks"], previousTasksSnapshot);
      }
      toast({
        title: "Error",
        description: "Some tasks failed to reschedule. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Push selected tasks' due dates forward by N days from each task's current due date
  const handlePushDays = async (days: number) => {
    if (selectedTasks.size === 0) return;

    const selectedTaskIds = Array.from(selectedTasks);
    const allTasks = queryClient.getQueryData<any[]>(["/api/tasks"]) || [];

    // Save previous dates for undo & build updates
    const previousDates: { id: number; dueDate: string | null }[] = [];
    const updates: { id: number; newDate: string }[] = [];
    for (const taskId of selectedTaskIds) {
      const task = allTasks.find((t: any) => t.id === taskId);
      if (!task) continue;
      previousDates.push({ id: taskId, dueDate: task.dueDate || null });
      const currentDue = task.dueDate ? new Date(task.dueDate) : new Date();
      // Use UTC to avoid timezone shifting the date
      currentDue.setUTCDate(currentDue.getUTCDate() + days);
      updates.push({ id: taskId, newDate: currentDue.toISOString() });
    }

    if (updates.length === 0) return;

    // Optimistic cache update
    const previousTasksSnapshot = queryClient.getQueryData<any[]>(["/api/tasks"]);
    queryClient.setQueryData(["/api/tasks"], (old: any[] | undefined) => {
      if (!old) return old;
      const updateMap = new Map(updates.map(u => [u.id, u.newDate]));
      return old.map((t: any) =>
        updateMap.has(t.id) ? { ...t, dueDate: updateMap.get(t.id) } : t
      );
    });

    // Store undo data
    const dayLabel = days === 7 ? '1 week' : days === 14 ? '2 weeks' : days === 30 ? '1 month' : `${days} day${days !== 1 ? 's' : ''}`;
    const undoLabel = `push of ${updates.length} task${updates.length !== 1 ? 's' : ''} by ${dayLabel}`;
    setLastDateAction({ label: undoLabel, previousDates });

    setSelectedTasks(new Set());
    toast({
      title: `📅 Pushed ${updates.length} task${updates.length !== 1 ? 's' : ''} by ${dayLabel}`,
      description: `Due dates moved forward from each task's current date.`,
      duration: 15000,
      action: (
        <ToastAction altText="Undo push" onClick={() => undoDateChanges()}>
          Undo
        </ToastAction>
      ),
    });

    try {
      await Promise.all(
        updates.map(({ id, newDate }) =>
          apiRequest("PATCH", `/api/tasks/${id}`, { dueDate: newDate })
        )
      );
      refetchTasks();
    } catch (error) {
      if (previousTasksSnapshot) {
        queryClient.setQueryData(["/api/tasks"], previousTasksSnapshot);
      }
      toast({
        title: "Error",
        description: "Some tasks failed to update. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleImportPrepare = async () => {
    try {
      // Refetch tasks to get the latest count before showing the modal
      await refetchTasks();
      
      const response = await apiRequest("GET", "/api/notion/check-duplicates");
      const result = await response.json();
      setImportTaskCount(result.totalCount);
      setDuplicateCount(result.duplicateCount);
      
      if (result.duplicateCount > 0) {
        setShowDuplicateConfirm(true);
      } else {
        setShowImportConfirm(true);
      }
    } catch (error: any) {
      console.error('Notion check duplicates error:', error);
      toast({
        title: "Error Checking Notion Tasks",
        description: error.message || "Failed to get Notion task count. Check console for details.",
        variant: "destructive",
      });
    }
  };

  const handleExportPrepare = async () => {
    const currentTaskCount = tasks.length;
    setExportTaskCount(currentTaskCount);
    setShowExportConfirm(true);
  };

  const handleExportCSV = async () => {
    try {
      toast({
        title: "Exporting to CSV...",
        description: "Preparing your task export",
      });

      // Trigger file download by navigating to the endpoint
      window.location.href = '/api/tasks/export/csv';
      
      toast({
        title: "✓ Export Started",
        description: "Your CSV file should download shortly",
      });
    } catch (error) {
      console.error("CSV export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export tasks to CSV",
        variant: "destructive",
      });
    }
  };

  const handleImportConfirm = async () => {
    try {
      // When triggered from "Import ALL" modal (showImportConfirm), delete all existing tasks first
      // When triggered from duplicate confirm modal, just do normal import/update
      const isFullImport = showImportConfirm;
      const response = await apiRequest("POST", "/api/notion/import", {
        includeDuplicates,
        deleteAll: isFullImport,
      });
      const result = await response.json();
      
      setShowImportConfirm(false);
      setShowDuplicateConfirm(false);
      refetchTasks();
      
      // Track imported tasks for undo
      if (result.importedTaskIds && result.importedTaskIds.length > 0) {
        setLastAction({
          type: 'import-notion',
          taskIds: result.importedTaskIds
        });
      }
      
      // Build description showing both imported and updated counts
      let description = '';
      if (result.count > 0 && result.updatedCount > 0) {
        description = `Imported ${result.count} new tasks and updated ${result.updatedCount} existing tasks from Notion`;
      } else if (result.count > 0) {
        description = `Imported ${result.count} new tasks from Notion`;
      } else if (result.updatedCount > 0) {
        description = `Updated ${result.updatedCount} existing tasks from Notion`;
      } else {
        description = 'No changes detected from Notion';
      }
      
      toast({
        title: "Import Complete",
        description,
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
      
      // Track exported tasks for undo
      if (result.exportedTaskIds || result.linkedTaskIds) {
        setLastAction({
          type: 'export-notion',
          taskIds: [...(result.exportedTaskIds || []), ...(result.linkedTaskIds || [])],
          exportDetails: {
            exported: result.exportedTaskIds || [],
            linked: result.linkedTaskIds || []
          }
        });
      }
      
      toast({
        title: "Export Complete",
        description: `Exported ${result.exported} new, ${result.linked} linked, ${result.skipped} skipped`,
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

  const handleCalendarSync = () => {
    const selectedTaskIds = Array.from(selectedTasks);
    const taskCount = selectedTaskIds.length;
    
    // Close modal immediately for better UX
    setShowCalendarSync(false);
    setSelectedTasks(new Set()); // Clear selection
    
    // Show "in progress" toast
    toast({
      title: "Syncing to Google Calendar",
      description: `Adding ${taskCount} task${taskCount !== 1 ? 's' : ''} to your calendar. This may take a few seconds...`,
    });
    
    enqueueCalendarOp(async () => {
      try {
        const response = await apiRequest("POST", "/api/calendar/sync", {
          selectedTasks: selectedTaskIds
        });
        const result = await response.json();
        
        // Build descriptive message based on sync direction
        let description = '';
        if (result.exported > 0) {
          const parts = [];
          if (result.created > 0) {
            parts.push(`${result.created} new`);
          }
          if (result.updated > 0) {
            parts.push(`${result.updated} already in calendar`);
          }
          if (parts.length > 0) {
            description += `${result.exported} tasks synced (${parts.join(', ')})`;
          } else {
            description += `${result.exported} tasks exported to Google Calendar`;
          }
        }
        if (result.exportFailed > 0) {
          description += description ? `, ${result.exportFailed} failed` : `${result.exportFailed} exports failed`;
        }
        if (result.imported > 0) {
          description += description ? `, ${result.imported} tasks updated from calendar` : `${result.imported} tasks updated from calendar`;
        }
        if (!description) {
          description = 'Sync complete - no changes needed';
        }
        
        toast({
          title: "✓ Calendar Sync Complete",
          description,
        });
        
        // Refresh tasks to show updated times from import
        await queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      } catch (error: any) {
        const errorData = error.response?.data || {};
        
        if (errorData.needsAuth) {
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
    });
  };

  const pendingTasks = tasks.filter((task: any) => !task.completed && task.dueDate);

  // Get task counts for each filter
  const getFilterCounts = () => {
    const activeTasks = tasks.filter((task: any) => !task.completed);
    
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    
    return {
      all: activeTasks.length,
      dueToday: activeTasks.filter((task: any) => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        // Due today or overdue (before end of today in UTC)
        return taskDate.getTime() < tomorrowStart.getTime();
      }).length,
      overdue: activeTasks.filter((task: any) => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        // Strictly before today's start — truly past due
        return taskDate.getTime() < todayStart.getTime();
      }).length,
      highReward: activeTasks.filter((task: any) => task.goldValue >= 50).length,
      quickTasks: activeTasks.filter((task: any) => task.duration <= 30).length,
      highPriority: activeTasks.filter((task: any) => 
        task.importance === "Pareto" || 
        task.importance === "High" || 
        task.importance === "Med-High"
      ).length,
      routines: activeTasks.filter((task: any) => 
        task.recurType && 
        task.recurType !== "one-time" && 
        task.recurType.trim() !== ""
      ).length,
      businessApple: activeTasks.filter((task: any) => 
        task.apple === true || task.businessWorkFilter === "Apple"
      ).length,
      businessGeneral: activeTasks.filter((task: any) => 
        task.businessWorkFilter === "General"
      ).length,
      businessMW: activeTasks.filter((task: any) => 
        task.businessWorkFilter === "MW"
      ).length
    };
  };

  const filterCounts = getFilterCounts();

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
      case "due-today": {
        const nowDT = new Date();
        const tomorrowDT = new Date(Date.UTC(nowDT.getUTCFullYear(), nowDT.getUTCMonth(), nowDT.getUTCDate() + 1));
        
        return activeTasks.filter((task: any) => {
          if (!task.dueDate) return false;
          const taskDate = new Date(task.dueDate);
          return taskDate.getTime() < tomorrowDT.getTime(); // Include today and all overdue (UTC)
        });
      }
      
      case "high-reward":
        // Filter tasks with high gold value (50+) and sort by gold value descending
        const highRewardTasks = activeTasks.filter((task: any) => task.goldValue >= 50);
        return highRewardTasks.sort((a: any, b: any) => b.goldValue - a.goldValue);
      
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
      
      case "business-apple":
        return activeTasks.filter((task: any) => 
          task.apple === true || task.businessWorkFilter === "Apple"
        );
      
      case "business-general":
        return activeTasks.filter((task: any) => 
          task.businessWorkFilter === "General"
        );
      
      case "business-mw":
        return activeTasks.filter((task: any) => 
          task.businessWorkFilter === "MW"
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

  // Batch tasks for grid view
  const getBatchedTasks = (sortedTasks: any[]) => {
    if (sortBy === "due-date") {
      // When sorted by due date, batch by priority
      const batches: { title: string; tasks: any[]; priority: string }[] = [];
      
      const priorityGroups = {
        "Pareto": [] as any[],
        "High": [] as any[],
        "Med-High": [] as any[],
        "Medium": [] as any[],
        "Med-Low": [] as any[],
        "Low": [] as any[],
        "None": [] as any[]
      };
      
      sortedTasks.forEach(task => {
        const priority = task.importance || "None";
        if (priorityGroups[priority as keyof typeof priorityGroups]) {
          priorityGroups[priority as keyof typeof priorityGroups].push(task);
        } else {
          priorityGroups["None"].push(task);
        }
      });
      
      Object.entries(priorityGroups).forEach(([priority, tasks]) => {
        if (tasks.length > 0) {
          batches.push({ title: `${priority} Priority`, tasks, priority });
        }
      });
      
      return batches;
    } else {
      // When sorted by importance, batch by due date (using UTC to match stored dates)
      const now = new Date();
      const tomorrowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)); // start of tomorrow UTC
      const endOfWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      endOfWeek.setUTCDate(endOfWeek.getUTCDate() + (7 - endOfWeek.getUTCDay()));
      const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
      const endOfYear = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
      
      const batches: { title: string; tasks: any[]; period: string }[] = [];
      const groups = {
        "today": [] as any[],
        "week": [] as any[],
        "month": [] as any[],
        "year": [] as any[],
        "none": [] as any[]
      };
      
      sortedTasks.forEach(task => {
        if (!task.dueDate) {
          groups.none.push(task);
        } else {
          const dueDate = new Date(task.dueDate);
          if (dueDate.getTime() < tomorrowUTC.getTime()) {
            groups.today.push(task);
          } else if (dueDate <= endOfWeek) {
            groups.week.push(task);
          } else if (dueDate <= endOfMonth) {
            groups.month.push(task);
          } else if (dueDate <= endOfYear) {
            groups.year.push(task);
          } else {
            groups.none.push(task);
          }
        }
      });
      
      if (groups.today.length > 0) {
        batches.push({ title: "Due Today", tasks: groups.today, period: "today" });
      }
      if (groups.week.length > 0) {
        batches.push({ title: "Due This Week", tasks: groups.week, period: "week" });
      }
      if (groups.month.length > 0) {
        batches.push({ title: "Due This Month", tasks: groups.month, period: "month" });
      }
      if (groups.year.length > 0) {
        batches.push({ title: "Due This Year", tasks: groups.year, period: "year" });
      }
      if (groups.none.length > 0) {
        batches.push({ title: "No Due Date", tasks: groups.none, period: "none" });
      }
      
      return batches;
    }
  };

  // Get priority color styling for grid batches
  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case "Pareto":
        return {
          borderColor: "border-red-500/50",
          bgColor: "bg-red-500/5",
          textColor: "text-red-400",
          iconBg: "bg-red-500/20"
        };
      case "High":
        return {
          borderColor: "border-red-500/50",
          bgColor: "bg-red-500/5",
          textColor: "text-red-400",
          iconBg: "bg-red-500/20"
        };
      case "Med-High":
        return {
          borderColor: "border-orange-500/50",
          bgColor: "bg-orange-500/5",
          textColor: "text-orange-400",
          iconBg: "bg-orange-500/20"
        };
      case "Medium":
        return {
          borderColor: "border-yellow-500/50",
          bgColor: "bg-yellow-500/5",
          textColor: "text-yellow-400",
          iconBg: "bg-yellow-500/20"
        };
      case "Med-Low":
        return {
          borderColor: "border-blue-500/50",
          bgColor: "bg-blue-500/5",
          textColor: "text-blue-400",
          iconBg: "bg-blue-500/20"
        };
      case "Low":
        return {
          borderColor: "border-green-500/50",
          bgColor: "bg-green-500/5",
          textColor: "text-green-400",
          iconBg: "bg-green-500/20"
        };
      default:
        return {
          borderColor: "border-gray-500/30",
          bgColor: "bg-gray-500/5",
          textColor: "text-gray-400",
          iconBg: "bg-gray-500/20"
        };
    }
  };

  const filteredTasks = getFilteredTasks();
  const sortedTasks = getSortedTasks(filteredTasks);
  const batchedTasks = getBatchedTasks(sortedTasks);

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
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1.5 bg-gradient-to-r from-yellow-600/30 to-yellow-500/30 backdrop-blur-sm px-3 py-1.5 rounded-full border border-yellow-500/50">
                  <Coins className="text-yellow-400 w-4 h-4" />
                  <span className="font-semibold text-yellow-100 text-sm">{progress.goldTotal}</span>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-1.5 hover:bg-slate-700/50 text-yellow-100 px-2 py-1 h-auto">
                      <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center border-2 border-yellow-400/50">
                        <User className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-xs font-medium">
                        {(() => {
                          const email = (user as any)?.firstName || (user as any)?.email || "User";
                          return email.length > 5 ? email.slice(0, 5) + '...' : email;
                        })()}
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
                    <DropdownMenuItem asChild className="hover:bg-slate-700 focus:bg-slate-700">
                      <Link href="/recycling-bin" className="flex items-center">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Recycling Bin
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

      <div className={`max-w-7xl mx-auto ${isMobile ? 'px-3 py-4' : 'px-4 sm:px-6 lg:px-8 py-8'} relative`}>
        {/* Your Quests Header */}
        <div className={`flex flex-col ${isMobile ? 'gap-2 mb-2' : 'sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0'}`}>
          <div>
            <h2 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-serif font-bold text-yellow-100`}>
              Your Quests 
              <span className={`ml-2 ${isMobile ? 'text-sm' : 'text-lg'} font-normal text-yellow-300/80`}>({filterCounts.all})</span>
            </h2>
            {!isMobile && <p className="text-yellow-200/70">Complete tasks to earn gold and unlock rewards</p>}
          </div>
          {isMobile ? (
            /* Mobile: Compact button row — Add, File (dropdown), Undo */
            <div className="flex gap-1.5">
              <Button 
                onClick={() => setShowAddTask(true)}
                size="sm"
                className="flex items-center gap-1 h-9 px-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white border border-green-400/50 text-xs"
                title="Add Quest"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1 h-9 px-3 bg-slate-700/50 border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20 text-xs"
                    title="File Options"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    File
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-slate-800 border-yellow-600/30">
                  <DropdownMenuItem 
                    onClick={handleImportPrepare}
                    className="flex items-center gap-2 text-yellow-100 hover:bg-slate-700 focus:bg-slate-700"
                  >
                    <Download className="w-4 h-4" />
                    <span>Import from Notion</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleExportPrepare}
                    className="flex items-center gap-2 text-yellow-100 hover:bg-slate-700 focus:bg-slate-700"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Export to Notion</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 text-emerald-200 hover:bg-slate-700 focus:bg-slate-700"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Export as CSV</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {lastAction.type && (
                <Button 
                  onClick={handleUndo}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-1 h-9 px-3 bg-orange-900/30 border-orange-500/40 text-orange-200 hover:bg-orange-600/30 text-xs"
                  title="Undo"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7v6h6"/>
                    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
                  </svg>
                  Undo
                </Button>
              )}
            </div>
          ) : (
            /* Desktop: Original button layout */
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => setShowAddTask(true)}
                className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white border border-green-400/50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Add Quest</span>
              </Button>
              <Button 
                onClick={handleCategorizeAll}
                variant="outline"
                className="flex items-center space-x-2 bg-purple-900/30 border-purple-500/40 text-purple-200 hover:bg-purple-600/30 hover:text-purple-100 hover:border-purple-500/60"
              >
                <Tag className="w-4 h-4" />
                <span>Categorize All</span>
              </Button>
              {lastAction.type && (
                <Button 
                  onClick={handleUndo} 
                  variant="outline"
                  className="flex items-center space-x-2 bg-orange-900/30 border-orange-500/40 text-orange-200 hover:bg-orange-600/30 hover:text-orange-100 hover:border-orange-500/60"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M3 7v6h6"/>
                    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
                  </svg>
                  <span>Undo {
                    lastAction.type === 'complete' ? 'Complete' : 
                    lastAction.type === 'append-notion' ? 'Append' : 
                    lastAction.type === 'delete-notion' ? 'Delete' :
                    lastAction.type === 'import-notion' ? 'Import' :
                    lastAction.type === 'export-notion' ? 'Export' : ''
                  }</span>
                </Button>
              )}
              <Button onClick={handleImportPrepare} className="flex items-center space-x-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-slate-900 border border-yellow-400/50">
                <Download className="w-4 h-4" />
                <span>Import ALL from Notion</span>
              </Button>
              <Button onClick={handleExportPrepare} variant="outline" className="flex items-center space-x-2 bg-slate-700/50 border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20 hover:text-yellow-100 hover:border-yellow-500/60">
                <Upload className="w-4 h-4" />
                <span>Export ALL to Notion</span>
              </Button>
              <Button onClick={handleExportCSV} variant="outline" className="flex items-center space-x-2 bg-emerald-700/50 border-emerald-600/40 text-emerald-200 hover:bg-emerald-600/20 hover:text-emerald-100 hover:border-emerald-500/60">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export as CSV</span>
              </Button>
            </div>
          )}
        </div>

            {/* Search Bar */}
            <Card className={`${isMobile ? 'p-2 mb-2' : 'p-4 mb-4'} bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30`}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-400/60 w-4 h-4" />
                <Input
                  placeholder={isMobile ? "Search tasks..." : "Search tasks by title, description, category, or importance..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-10 pr-4 ${isMobile ? 'py-1 text-sm h-8' : 'py-2'} w-full bg-slate-700/50 border-yellow-600/20 text-yellow-100 placeholder:text-yellow-200/40 focus:border-yellow-500/50`}
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
            <Card className={`${isMobile ? 'p-2 mb-3' : 'p-4 mb-6'} bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30`}>
              <div className={`flex flex-wrap items-center ${isMobile ? 'gap-1' : 'gap-2'} justify-between`}>
                <div className={`flex flex-wrap ${isMobile ? 'gap-1.5' : 'gap-2'}`}>
                  <Badge 
                    variant={activeFilter === "all" ? "default" : "outline"}
                    className={`cursor-pointer ${isMobile ? 'text-[10px] px-2 py-1' : ''} ${
                      activeFilter === "all" 
                        ? "bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-900 border-yellow-400 hover:from-yellow-500 hover:to-yellow-400" 
                        : "border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20"
                    }`}
                    onClick={() => setActiveFilter("all")}
                  >
                    {isMobile ? `All (${filterCounts.all})` : `All Tasks (${filterCounts.all})`}
                  </Badge>
                  <Badge 
                    variant={activeFilter === "due-today" ? "default" : "outline"}
                    className={`cursor-pointer ${isMobile ? 'text-[10px] px-2 py-1' : ''} ${
                      activeFilter === "due-today" 
                        ? "bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-900 border-yellow-400 hover:from-yellow-500 hover:to-yellow-400" 
                        : "border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20"
                    }`}
                    onClick={() => setActiveFilter("due-today")}
                  >
                    {isMobile ? `Today (${filterCounts.dueToday})` : `Due Today (${filterCounts.dueToday})`}
                  </Badge>
                  {!isMobile && (
                    <>
                      <Badge 
                        variant={activeFilter === "high-reward" ? "default" : "outline"}
                        className={`cursor-pointer ${
                          activeFilter === "high-reward" 
                            ? "bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-900 border-yellow-400 hover:from-yellow-500 hover:to-yellow-400" 
                            : "border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20"
                        }`}
                        onClick={() => setActiveFilter("high-reward")}
                      >
                        High Reward ({filterCounts.highReward})
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
                        Quick Tasks ({filterCounts.quickTasks})
                      </Badge>
                    </>
                  )}
                  <Badge 
                    variant={activeFilter === "high-priority" ? "default" : "outline"}
                    className={`cursor-pointer ${isMobile ? 'text-[10px] px-2 py-1' : ''} ${
                      activeFilter === "high-priority" 
                        ? "bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-900 border-yellow-400 hover:from-yellow-500 hover:to-yellow-400" 
                        : "border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20"
                    }`}
                    onClick={() => setActiveFilter("high-priority")}
                  >
                    {isMobile ? `Priority (${filterCounts.highPriority})` : `High Priority (${filterCounts.highPriority})`}
                  </Badge>
                  {!isMobile && (
                    <Badge 
                      variant={activeFilter === "routines" ? "default" : "outline"}
                      className={`cursor-pointer ${
                        activeFilter === "routines" 
                          ? "bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-900 border-yellow-400 hover:from-yellow-500 hover:to-yellow-400" 
                          : "border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20"
                      }`}
                      onClick={() => setActiveFilter("routines")}
                    >
                      Routines ({filterCounts.routines})
                    </Badge>
                  )}
                  
                  {/* Mobile: Filter dropdown for Reward, Quick, Routines */}
                  {isMobile && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Badge 
                          variant={
                            (activeFilter === "high-reward" || activeFilter === "quick-tasks" || activeFilter === "routines") ? "default" : "outline"
                          }
                          className={`cursor-pointer text-[10px] px-2 py-1 inline-flex items-center gap-1 ${
                            (activeFilter === "high-reward" || activeFilter === "quick-tasks" || activeFilter === "routines")
                              ? "bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-900 border-yellow-400 hover:from-yellow-500 hover:to-yellow-400" 
                              : "border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20"
                          }`}
                        >
                          <Filter className="w-3 h-3" />
                          {activeFilter === "high-reward" ? `Reward (${filterCounts.highReward})`
                            : activeFilter === "quick-tasks" ? `Quick (${filterCounts.quickTasks})`
                            : activeFilter === "routines" ? `Routines (${filterCounts.routines})`
                            : "More"}
                        </Badge>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-slate-800/95 border-yellow-600/40">
                        <DropdownMenuItem 
                          onClick={() => setActiveFilter("high-reward")}
                          className={`cursor-pointer ${
                            activeFilter === "high-reward" 
                              ? "bg-yellow-600/20 text-yellow-200" 
                              : "text-slate-300 hover:bg-slate-700/80"
                          }`}
                        >
                          💰 Reward ({filterCounts.highReward})
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setActiveFilter("quick-tasks")}
                          className={`cursor-pointer ${
                            activeFilter === "quick-tasks" 
                              ? "bg-yellow-600/20 text-yellow-200" 
                              : "text-slate-300 hover:bg-slate-700/80"
                          }`}
                        >
                          ⚡ Quick ({filterCounts.quickTasks})
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setActiveFilter("routines")}
                          className={`cursor-pointer ${
                            activeFilter === "routines" 
                              ? "bg-yellow-600/20 text-yellow-200" 
                              : "text-slate-300 hover:bg-slate-700/80"
                          }`}
                        >
                          🔄 Routines ({filterCounts.routines})
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* Business/Work Filter Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Badge 
                        variant={
                          activeFilter.startsWith("business-") ? "default" : "outline"
                        }
                        className={`cursor-pointer ${isMobile ? 'text-[10px] px-2 py-1' : ''} ${
                          activeFilter.startsWith("business-")
                            ? "bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-900 border-yellow-400 hover:from-yellow-500 hover:to-yellow-400" 
                            : "border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20"
                        }`}
                      >
                        💼 Business ({
                          filterCounts.businessApple + 
                          filterCounts.businessGeneral + 
                          filterCounts.businessMW
                        })
                      </Badge>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-800/95 border-yellow-600/40">
                      <DropdownMenuItem 
                        onClick={() => setActiveFilter("business-apple")}
                        className={`cursor-pointer ${
                          activeFilter === "business-apple" 
                            ? "bg-yellow-600/20 text-yellow-200" 
                            : "text-slate-300 hover:bg-slate-700/80"
                        }`}
                      >
                        🍎 Apple ({filterCounts.businessApple})
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setActiveFilter("business-general")}
                        className={`cursor-pointer ${
                          activeFilter === "business-general" 
                            ? "bg-yellow-600/20 text-yellow-200" 
                            : "text-slate-300 hover:bg-slate-700/80"
                        }`}
                      >
                        General ({filterCounts.businessGeneral})
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setActiveFilter("business-mw")}
                        className={`cursor-pointer ${
                          activeFilter === "business-mw" 
                            ? "bg-yellow-600/20 text-yellow-200" 
                            : "text-slate-300 hover:bg-slate-700/80"
                        }`}
                      >
                        MW ({filterCounts.businessMW})
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className={`flex ${isMobile ? 'gap-1' : 'gap-2'} items-center`}>
                  {/* Select All / Deselect All Buttons */}
                  {sortedTasks.length > 0 && (
                    <>
                      {selectedTasks.size < sortedTasks.length ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleSelectAll(sortedTasks)}
                          className={`flex items-center ${isMobile ? 'gap-1 h-7 px-2 text-[10px]' : 'gap-2'} bg-slate-800/80 border-blue-500/40 text-blue-300 hover:bg-blue-600/20 hover:text-blue-100`}
                        >
                          <CheckSquare className={isMobile ? "w-3 h-3" : "w-4 h-4"} />
                          {isMobile ? `All` : `Select All (${sortedTasks.length})`}
                        </Button>
                      ) : selectedTasks.size > 0 ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleDeselectAll}
                          className={`flex items-center ${isMobile ? 'gap-1 h-7 px-2 text-[10px]' : 'gap-2'} bg-slate-800/80 border-red-500/40 text-red-300 hover:bg-red-600/20 hover:text-red-100`}
                        >
                          <XSquare className={isMobile ? "w-3 h-3" : "w-4 h-4"} />
                          {isMobile ? 'None' : 'Deselect All'}
                        </Button>
                      ) : null}
                    </>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewType(viewType === "list" ? "grid" : "list")}
                    className={`flex items-center ${isMobile ? 'gap-1 h-7 px-2 text-[10px]' : 'gap-2'} bg-slate-800/80 border-yellow-600/40 text-yellow-200 hover:bg-slate-700/80 hover:text-yellow-100`}
                  >
                    {viewType === "list" ? (
                      <>
                        <LayoutGrid className={isMobile ? "w-3 h-3" : "w-4 h-4"} />
                        {!isMobile && 'Grid'}
                      </>
                    ) : (
                      <>
                        <List className={isMobile ? "w-3 h-3" : "w-4 h-4"} />
                        {!isMobile && 'List'}
                      </>
                    )}
                  </Button>
                  
                  {!isMobile && (
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
                  )}
                </div>
              </div>
            </Card>

            {/* Bulk Actions for Selected Tasks - Sticky at bottom */}
            {selectedTasks.size > 0 && (
              <div className={`fixed ${isMobile ? 'bottom-[calc(4rem+env(safe-area-inset-bottom))]' : 'bottom-20'} left-0 right-0 z-40 ${isMobile ? 'px-2 pb-1' : 'px-4 pb-4'}`}>
                <Card className={`max-w-7xl mx-auto ${isMobile ? 'p-2' : 'p-4'} bg-blue-900/95 backdrop-blur-md border-2 border-blue-500/60 shadow-2xl`}>
                  {isMobile ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-blue-200 font-medium">
                          {selectedTasks.size} selected
                        </span>
                        <Button
                          onClick={() => setSelectedTasks(new Set())}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-blue-300 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        <Button 
                          onClick={handleCompleteSelected}
                          size="sm"
                          className="h-8 px-1 text-[10px] bg-blue-600 hover:bg-blue-500 text-white"
                        >
                          <CheckCircle className="w-3 h-3 mr-0.5" />
                          Complete
                        </Button>
                        <Button 
                          onClick={() => setShowCalendarSync(true)}
                          variant="outline"
                          size="sm"
                          className="h-8 px-1 text-[10px] border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/20"
                        >
                          <Calendar className="w-3 h-3 mr-0.5" />
                          Sync
                        </Button>
                        <Button 
                          onClick={handleRemoveFromCalendar}
                          variant="outline"
                          size="sm"
                          className="h-8 px-1 text-[10px] border-slate-500/40 text-slate-300 hover:bg-slate-600/20"
                        >
                          <CalendarDays className="w-3 h-3 mr-0.5" />
                          Unsync
                        </Button>
                        <Button 
                          onClick={handleRemoveAllFromCalendar}
                          variant="outline"
                          size="sm"
                          className="h-8 px-1 text-[10px] border-red-500/40 text-red-300 hover:bg-red-600/20"
                        >
                          <CalendarDays className="w-3 h-3 mr-0.5" />
                          Clear Cal
                        </Button>
                        <Button 
                          onClick={handleDeleteSelected}
                          variant="outline"
                          size="sm"
                          className="h-8 px-1 text-[10px] border-orange-500/40 text-orange-300 hover:bg-orange-600/20"
                        >
                          <Trash2 className="w-3 h-3 mr-0.5" />
                          Delete
                        </Button>
                        <Button 
                          onClick={handleAppendToNotion}
                          variant="outline"
                          size="sm"
                          className="h-8 px-1 text-[10px] border-green-500/40 text-green-300 hover:bg-green-600/20"
                        >
                          <Upload className="w-3 h-3 mr-0.5" />
                          Notion
                        </Button>
                        <Button 
                          onClick={handleDeleteFromNotion}
                          variant="outline"
                          size="sm"
                          className="h-8 px-1 text-[10px] border-red-500/40 text-red-300 hover:bg-red-600/20"
                        >
                          <Trash2 className="w-3 h-3 mr-0.5" />
                          Del Notion
                        </Button>
                        <Button 
                          onClick={handleCategorizeSkill}
                          variant="outline"
                          size="sm"
                          className="h-8 px-1 text-[10px] border-purple-500/40 text-purple-300 hover:bg-purple-600/20"
                          disabled={selectedTasks.size === 0}
                        >
                          <Tag className="w-3 h-3 mr-0.5" />
                          Skill
                        </Button>
                        <Button 
                          onClick={handleRecategorizeSelected}
                          variant="outline"
                          size="sm"
                          className="h-8 px-1 text-[10px] border-yellow-500/40 text-yellow-300 hover:bg-yellow-600/20"
                          disabled={selectedTasks.size === 0}
                        >
                          <Tag className="w-3 h-3 mr-0.5" />
                          Recat
                        </Button>
                        <Popover open={showReschedulePopover} onOpenChange={setShowReschedulePopover}>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline"
                              size="sm"
                              className="h-8 px-1 text-[10px] border-cyan-500/40 text-cyan-300 hover:bg-cyan-600/20"
                              disabled={selectedTasks.size === 0}
                            >
                              <CalendarDays className="w-3 h-3 mr-0.5" />
                              Resched
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-slate-900 border-yellow-600/30" align="end" side="top">
                            <CalendarPicker
                              mode="single"
                              selected={undefined}
                              onSelect={(date) => {
                                if (date) {
                                  handleRescheduleSelected(date);
                                }
                              }}
                              initialFocus
                              className="rounded-md border-0"
                            />
                          </PopoverContent>
                        </Popover>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="outline"
                              size="sm"
                              className="h-8 px-1 text-[10px] border-amber-500/40 text-amber-300 hover:bg-amber-600/20"
                              disabled={selectedTasks.size === 0}
                            >
                              <ArrowRight className="w-3 h-3 mr-0.5" />
                              Push
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-slate-800 border-yellow-600/30" side="top" align="end">
                            <DropdownMenuItem 
                              onClick={() => handlePushDays(1)}
                              className="text-yellow-100 hover:bg-slate-700 focus:bg-slate-700 cursor-pointer text-xs"
                            >
                              Push 1 Day
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handlePushDays(3)}
                              className="text-yellow-100 hover:bg-slate-700 focus:bg-slate-700 cursor-pointer text-xs"
                            >
                              Push 3 Days
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handlePushDays(5)}
                              className="text-yellow-100 hover:bg-slate-700 focus:bg-slate-700 cursor-pointer text-xs"
                            >
                              Push 5 Days
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handlePushDays(7)}
                              className="text-yellow-100 hover:bg-slate-700 focus:bg-slate-700 cursor-pointer text-xs"
                            >
                              Push 1 Week
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handlePushDays(14)}
                              className="text-yellow-100 hover:bg-slate-700 focus:bg-slate-700 cursor-pointer text-xs"
                            >
                              Push 2 Weeks
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handlePushDays(30)}
                              className="text-yellow-100 hover:bg-slate-700 focus:bg-slate-700 cursor-pointer text-xs"
                            >
                              Push 1 Month
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-200 font-medium">
                          {selectedTasks.size} task{selectedTasks.size > 1 ? 's' : ''} selected
                        </span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button 
                          onClick={handleCompleteSelected}
                          className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white border border-blue-400/50"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Complete Selected
                        </Button>
                        <Button 
                          onClick={() => setShowCalendarSync(true)}
                          variant="outline"
                          className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/20 hover:text-emerald-200"
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Sync to Calendar
                        </Button>
                        <Button 
                          onClick={handleRemoveFromCalendar}
                          variant="outline"
                          className="border-slate-500/40 text-slate-300 hover:bg-slate-600/20 hover:text-slate-200"
                        >
                          <CalendarDays className="w-4 h-4 mr-2" />
                          Remove from Calendar
                        </Button>
                        <Button 
                          onClick={handleRemoveAllFromCalendar}
                          variant="outline"
                          className="border-red-500/40 text-red-300 hover:bg-red-600/20 hover:text-red-200"
                        >
                          <CalendarDays className="w-4 h-4 mr-2" />
                          Clear ALL from Calendar
                        </Button>
                        <Button 
                          onClick={handleDeleteSelected}
                          variant="outline"
                          className="border-orange-500/40 text-orange-300 hover:bg-orange-600/20 hover:text-orange-200"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Selected
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
                        <Button 
                          onClick={handleCategorizeSkill}
                          variant="outline"
                          className="border-purple-500/40 text-purple-300 hover:bg-purple-600/20 hover:text-purple-200"
                          disabled={selectedTasks.size === 0}
                        >
                          <Tag className="w-4 h-4 mr-2" />
                          Categorize Skill
                        </Button>
                        <Button 
                          onClick={handleRecategorizeSelected}
                          variant="outline"
                          className="border-yellow-500/40 text-yellow-300 hover:bg-yellow-600/20 hover:text-yellow-200"
                          disabled={selectedTasks.size === 0}
                        >
                          <Tag className="w-4 h-4 mr-2" />
                          Recategorize
                        </Button>
                        <Popover open={showReschedulePopover} onOpenChange={setShowReschedulePopover}>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline"
                              className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-600/20 hover:text-cyan-200"
                              disabled={selectedTasks.size === 0}
                            >
                              <CalendarDays className="w-4 h-4 mr-2" />
                              Reschedule
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-slate-900 border-yellow-600/30" align="end" side="top">
                            <CalendarPicker
                              mode="single"
                              selected={undefined}
                              onSelect={(date) => {
                                if (date) {
                                  handleRescheduleSelected(date);
                                }
                              }}
                              initialFocus
                              className="rounded-md border-0"
                            />
                          </PopoverContent>
                        </Popover>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="outline"
                              className="border-amber-500/40 text-amber-300 hover:bg-amber-600/20 hover:text-amber-200"
                              disabled={selectedTasks.size === 0}
                            >
                              <ArrowRight className="w-4 h-4 mr-2" />
                              Push Days
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-slate-800 border-yellow-600/30" side="top" align="end">
                            <DropdownMenuItem 
                              onClick={() => handlePushDays(1)}
                              className="text-yellow-100 hover:bg-slate-700 focus:bg-slate-700 cursor-pointer"
                            >
                              Push 1 Day
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handlePushDays(3)}
                              className="text-yellow-100 hover:bg-slate-700 focus:bg-slate-700 cursor-pointer"
                            >
                              Push 3 Days
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handlePushDays(5)}
                              className="text-yellow-100 hover:bg-slate-700 focus:bg-slate-700 cursor-pointer"
                            >
                              Push 5 Days
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handlePushDays(7)}
                              className="text-yellow-100 hover:bg-slate-700 focus:bg-slate-700 cursor-pointer"
                            >
                              Push 1 Week
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handlePushDays(14)}
                              className="text-yellow-100 hover:bg-slate-700 focus:bg-slate-700 cursor-pointer"
                            >
                              Push 2 Weeks
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handlePushDays(30)}
                              className="text-yellow-100 hover:bg-slate-700 focus:bg-slate-700 cursor-pointer"
                            >
                              Push 1 Month
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {filterCounts.overdue > 0 && (
                          <Button 
                            onClick={handleMoveOverdueToToday}
                            variant="outline"
                            className="border-orange-500/40 text-orange-300 hover:bg-orange-600/20 hover:text-orange-200"
                          >
                            <Calendar className="w-4 h-4 mr-2" />
                            Move Overdue to Today ({filterCounts.overdue})
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* Task List */}
            <div className={isMobile ? "space-y-1.5" : "space-y-4"}>
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
              ) : viewType === "list" ? (
                sortedTasks.map((task: any) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onSelect={handleTaskSelect}
                    isSelected={selectedTasks.has(task.id)}
                  />
                ))
              ) : (
                // Grid View with Batches
                batchedTasks.map((batch, batchIndex) => {
                  const styles = sortBy === "due-date" && 'priority' in batch 
                    ? getPriorityStyles(batch.priority)
                    : {
                        borderColor: "border-yellow-600/30",
                        bgColor: "bg-slate-800/40",
                        textColor: "text-yellow-400",
                        iconBg: "bg-yellow-500/20"
                      };
                  
                  return (
                    <div 
                      key={batchIndex} 
                      className={`space-y-3 p-4 rounded-lg border-2 ${styles.borderColor} ${styles.bgColor} backdrop-blur-sm`}
                    >
                      <h3 className={`text-lg font-serif font-bold px-2 flex items-center gap-2 ${styles.textColor}`}>
                        <div className={`p-1.5 rounded-lg ${styles.iconBg}`}>
                          {sortBy === "due-date" ? (
                            <AlertTriangle className="w-5 h-5" />
                          ) : (
                            <CalendarDays className="w-5 h-5" />
                          )}
                        </div>
                        {batch.title}
                        <span className="text-sm font-normal text-gray-400">
                          ({batch.tasks.length})
                        </span>
                      </h3>
                      <div className={`grid ${isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3'}`}>
                        {batch.tasks.map((task: any) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            isCompact={viewType === "grid"}
                            onSelect={handleTaskSelect}
                            isSelected={selectedTasks.has(task.id)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
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
        onClose={() => {
          setShowCompletion(false);
          setCompletionSkillXPGains([]);
          // After completion modal closes, check if we should show level-up modal
          if (leveledUpSkills.length > 0) {
            setShowLevelUp(true);
          }
        }}
        task={completedTask}
        newGoldTotal={progress.goldTotal}
        skillXPGains={completionSkillXPGains}
        skills={skills as any}
      />

      <LevelUpModal
        isOpen={showLevelUp}
        onClose={() => {
          setShowLevelUp(false);
          setLeveledUpSkills([]);
        }}
        skills={leveledUpSkills}
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
              Skip {duplicateCount} Duplicates (add {importTaskCount - duplicateCount})
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

      {/* Calendar Duplicate Detection Dialog */}
      <Dialog open={showCalendarDuplicateConfirm} onOpenChange={setShowCalendarDuplicateConfirm}>
        <DialogContent className="bg-slate-800 border-2 border-cyan-600/40">
          <DialogHeader>
            <DialogTitle className="text-cyan-100 font-serif">Tasks Already on Calendar</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-cyan-200/70 mb-4">
              Found {calendarDuplicateCount} task(s) that are already scheduled on your calendar.
            </p>
            {calendarDuplicateTasks.length > 0 && (
              <div className="bg-cyan-900/20 border border-cyan-600/30 rounded-lg p-3 mb-4 max-h-40 overflow-y-auto">
                <div className="text-xs text-cyan-200/80 space-y-1">
                  {calendarDuplicateTasks.slice(0, 5).map((task: any) => (
                    <div key={task.id} className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-cyan-400" />
                      <span className="flex-1 truncate">{task.title}</span>
                    </div>
                  ))}
                  {calendarDuplicateTasks.length > 5 && (
                    <div className="text-cyan-400/60 italic">
                      ...and {calendarDuplicateTasks.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="bg-cyan-900/30 border border-cyan-600/50 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center mb-2">
                <AlertTriangle className="w-5 h-5 text-cyan-400 mr-2" />
                <span className="text-cyan-200 font-medium">Do you want to add them anyway?</span>
              </div>
              <p className="text-cyan-200/80 text-sm mt-1">
                This will update their scheduled times on the calendar.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCalendarDuplicateConfirm(false);
                setSelectedTasks(new Set()); // Clear selection
              }} 
              className="border-cyan-600/40 text-cyan-200 hover:bg-cyan-600/20 hover:text-cyan-100"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCalendarDuplicateConfirm} 
              className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white border border-cyan-400/50"
            >
              Add Anyway
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

      {/* Delete from Notion Confirmation Modal */}
      <Dialog open={showDeleteNotionConfirm} onOpenChange={setShowDeleteNotionConfirm}>
        <DialogContent className="bg-slate-800 border-2 border-red-600/40">
          <DialogHeader>
            <DialogTitle className="text-red-100 font-serif">Delete from Notion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-red-200/70 mb-4">
              This will delete {deleteNotionTaskCount} task{deleteNotionTaskCount !== 1 ? 's' : ''} from your Notion database.
            </p>
            <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
                <span className="text-red-200 font-medium">Warning:</span>
              </div>
              <p className="text-red-200/80 mt-1">
                The selected tasks will be permanently removed from Notion. The tasks will remain in ProductivityQuest but will no longer be linked to Notion.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteNotionConfirm(false)}
              className="border-slate-600/40 text-slate-200 hover:bg-slate-600/20 hover:text-slate-100"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteFromNotionConfirm} 
              className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white border border-red-400/50"
            >
              Delete {deleteNotionTaskCount} Task{deleteNotionTaskCount !== 1 ? 's' : ''} from Notion
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

      {/* Skill Adjustment Modal */}
      <SkillAdjustmentModal
        open={showAdjustModal}
        onOpenChange={(open) => {
          setShowAdjustModal(open);
          // Clear recategorize queue when modal closes
          if (!open) {
            setRecategorizeQueue([]);
          }
        }}
        tasks={recategorizeQueue.length > 0 ? recategorizeQueue : lastCategorizedTasks}
        onComplete={() => {
          refetchTasks();
          setRecategorizeQueue([]);
        }}
      />

      {/* Add Task Modal */}
      <AddTaskModal
        open={showAddTask}
        onOpenChange={setShowAddTask}
      />
    </div>
  );
}
