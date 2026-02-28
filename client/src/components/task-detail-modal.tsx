import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmojiPicker } from "./emoji-picker";
import { 
  Calendar, 
  Clock, 
  Coins, 
  AlertTriangle, 
  Briefcase, 
  Tag,
  CheckCircle2,
  BarChart3,
  Repeat,
  Heart,
  Crown,
  Flag,
  Edit2,
  Check,
  X
} from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface TaskDetailModalProps {
  task: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailModal({ task, open, onOpenChange }: TaskDetailModalProps) {
  const isMobile = useIsMobile();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [durationInput, setDurationInput] = useState(task?.duration?.toString() || "30");
  const [detailsValue, setDetailsValue] = useState(task?.details || "");
  const detailsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Sync local state when task prop changes (e.g. switching between tasks)
  useEffect(() => {
    setDetailsValue(task?.details || "");
    setDurationInput(task?.duration?.toString() || "30");
  }, [task?.id, task?.details, task?.duration]);

  const updateDueDateMutation = useMutation({
    mutationFn: async (newDate: Date) => {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ dueDate: newDate.toISOString() }),
      });
      if (!response.ok) throw new Error('Failed to update due date');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      // Invalidate all calendar event queries (matches any year/month params)
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0]?.toString().startsWith('/api/google-calendar/events') || false
      });
      setIsDatePickerOpen(false);
      toast({
        title: "📅 Due Date Updated",
        description: "Task due date has been changed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update due date",
        variant: "destructive",
      });
    },
  });

  const updateDurationMutation = useMutation({
    mutationFn: async (newDuration: number) => {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ duration: newDuration }),
      });
      if (!response.ok) throw new Error('Failed to update duration');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      // Invalidate all calendar event queries (matches any year/month params)
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0]?.toString().startsWith('/api/google-calendar/events') || false
      });
      setIsEditingDuration(false);
      toast({
        title: "⏱️ Duration Updated",
        description: "Task duration has been changed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update duration",
        variant: "destructive",
      });
    },
  });

  const handleDurationSave = () => {
    const duration = parseInt(durationInput);
    if (isNaN(duration) || duration <= 0) {
      toast({
        title: "Invalid Duration",
        description: "Duration must be a positive number.",
        variant: "destructive",
      });
      return;
    }
    updateDurationMutation.mutate(duration);
  };

  const handleDurationCancel = () => {
    setDurationInput(task?.duration?.toString() || "30");
    setIsEditingDuration(false);
  };

  const updateDetailsMutation = useMutation({
    mutationFn: async (newDetails: string) => {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ details: newDetails }),
      });
      if (!response.ok) throw new Error('Failed to update details');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
  });

  const handleDetailsChange = (value: string) => {
    setDetailsValue(value);
    if (detailsTimeoutRef.current) clearTimeout(detailsTimeoutRef.current);
    detailsTimeoutRef.current = setTimeout(() => {
      updateDetailsMutation.mutate(value);
    }, 800);
  };

  const updateFieldMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: string }) => {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ [field]: value }),
      });
      if (!response.ok) throw new Error(`Failed to update ${field}`);
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      const fieldLabels: Record<string, string> = {
        importance: '⚡ Importance',
        kanbanStage: '📊 Kanban Stage',
        recurType: '🔄 Recurrence',
        businessWorkFilter: '💼 Work Filter',
        campaign: '👑 Questline',
        emoji: '😀 Emoji',
      };
      toast({
        title: `${fieldLabels[variables.field] || variables.field} Updated`,
        description: variables.field === 'emoji' ? `Changed to ${variables.value}` : `Changed to "${variables.value}"`,
      });
    },
    onError: (_err, variables) => {
      toast({
        title: "Error",
        description: `Failed to update ${variables.field}`,
        variant: "destructive",
      });
    },
  });

  if (!task) return null;

  const getImportanceBadgeColor = (importance: string | null) => {
    switch (importance) {
      case 'Pareto': return 'bg-red-500 text-white';
      case 'High': return 'bg-orange-500 text-white';
      case 'Med-High': return 'bg-yellow-500 text-white';
      case 'Medium': return 'bg-blue-500 text-white';
      case 'Med-Low': return 'bg-green-500 text-white';
      case 'Low': return 'bg-gray-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  const getBusinessFilterBadgeColor = (filter: string | null) => {
    switch (filter) {
      case 'Apple': return 'bg-gray-800 text-white border-gray-600';
      case 'General': return 'bg-blue-600 text-white border-blue-500';
      case 'MW': return 'bg-rose-600 text-white border-rose-500';
      default: return 'bg-slate-600 text-white border-slate-500';
    }
  };

  const getCampaignBadgeColor = (campaign: string | null) => {
    switch (campaign) {
      case 'Main': return 'bg-purple-600 text-white border-purple-500';
      case 'Side': return 'bg-indigo-600 text-white border-indigo-500';
      case 'unassigned':
      default: return 'bg-slate-600 text-white border-slate-500';
    }
  };

  // Swipe-down-to-close for mobile
  const swipeRef = useRef<{ startY: number; startScrollTop: number; dragging: boolean }>({ startY: 0, startScrollTop: 0, dragging: false });
  const [dragOffset, setDragOffset] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    const scrollEl = contentRef.current;
    const scrollTop = scrollEl?.scrollTop ?? 0;
    swipeRef.current = { startY: e.touches[0].clientY, startScrollTop: scrollTop, dragging: false };
  }, [isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    const deltaY = e.touches[0].clientY - swipeRef.current.startY;
    // Only start dragging if we were at the top of scroll and pulling down
    if (swipeRef.current.startScrollTop <= 0 && deltaY > 0) {
      swipeRef.current.dragging = true;
      // Apply rubber-band effect (diminishing returns)
      setDragOffset(Math.pow(deltaY, 0.75));
      e.preventDefault();
    }
  }, [isMobile]);

  const handleTouchEnd = useCallback(() => {
    if (!isMobile || !swipeRef.current.dragging) {
      setDragOffset(0);
      return;
    }
    if (dragOffset > 120) {
      // Close the modal
      onOpenChange(false);
    }
    setDragOffset(0);
    swipeRef.current.dragging = false;
  }, [isMobile, dragOffset, onOpenChange]);

  // Reset drag when modal closes
  useEffect(() => {
    if (!open) setDragOffset(0);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        ref={contentRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={isMobile && dragOffset > 0 ? { transform: `translateY(${dragOffset}px)`, transition: 'none', opacity: Math.max(0.3, 1 - dragOffset / 400) } : isMobile ? { transform: 'translateY(0)', transition: 'transform 0.3s ease-out, opacity 0.3s ease-out' } : undefined}
        className={`${isMobile ? 'max-w-full w-full h-full max-h-full m-0 rounded-none !left-0 !top-0 !translate-x-0 !translate-y-0 pt-[max(1rem,env(safe-area-inset-top))] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] [&>button]:top-[max(0.75rem,env(safe-area-inset-top))]' : 'max-w-2xl max-h-[90vh] p-6'} overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 border-2 border-yellow-600/30 data-[state=open]:animate-in data-[state=open]:zoom-in-75 data-[state=open]:duration-300 data-[state=closed]:animate-out data-[state=closed]:zoom-out-75 data-[state=closed]:duration-200`}>
        {/* iOS-style pull-down handle for mobile */}
        {isMobile && (
          <div className="flex justify-center pt-1 pb-2 -mt-1">
            <div className="w-10 h-1 rounded-full bg-yellow-200/30" />
          </div>
        )}
        <DialogHeader>
          <DialogTitle className={`${isMobile ? 'text-lg pr-12' : 'text-2xl pr-8'} font-serif text-yellow-100 flex items-start gap-2`}>
            <EmojiPicker
              value={task.emoji || "📝"}
              onChange={(emoji) => updateFieldMutation.mutate({ field: 'emoji', value: emoji })}
              size="lg"
            />
            <span className="pt-1">{task.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className={`${isMobile ? 'space-y-3 mt-1' : 'space-y-6 mt-4'}`}>
          {/* Details - always show, editable */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-yellow-400">
              <BarChart3 className={`${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
              <h3 className={`font-semibold ${isMobile ? 'text-sm' : ''}`}>Details</h3>
              {updateDetailsMutation.isPending && (
                <span className="text-xs text-yellow-400/50">Saving...</span>
              )}
            </div>
            <Textarea
              value={detailsValue}
              onChange={(e) => handleDetailsChange(e.target.value)}
              placeholder="Add details..."
              className={`text-yellow-200/80 bg-slate-800/50 rounded-lg border border-yellow-600/20 placeholder:text-yellow-200/30 resize-none focus:border-yellow-500/50 focus:ring-yellow-500/20 ${isMobile ? 'p-2.5 min-h-[60px] text-sm' : 'p-3 min-h-[80px]'}`}
              rows={isMobile ? 2 : 3}
            />
          </div>

          {/* Key Information Grid */}
          <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-2 gap-4'}`}>
            {/* Due Date */}
            <div className={`bg-slate-800/50 rounded-lg ${isMobile ? 'p-3' : 'p-4'} border border-yellow-600/20`}>
              <div className="flex items-center gap-2 text-yellow-400 mb-2">
                <Calendar className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold`}>Due Date</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-yellow-100 flex-1">
                  {task.dueDate 
                    ? format(new Date(task.dueDate), 'MMM dd, yyyy')
                    : 'No due date'}
                </p>
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-yellow-600/20 text-yellow-400 hover:text-yellow-300"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-slate-900 border-yellow-600/30" align="end">
                    <CalendarComponent
                      mode="single"
                      selected={task.dueDate ? new Date(task.dueDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          updateDueDateMutation.mutate(date);
                        }
                      }}
                      initialFocus
                      className="rounded-md border-0"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Duration */}
            <div className={`bg-slate-800/50 rounded-lg ${isMobile ? 'p-3' : 'p-4'} border border-yellow-600/20`}>
              <div className="flex items-center gap-2 text-yellow-400 mb-2">
                <Clock className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold`}>Duration</span>
              </div>
              {isEditingDuration ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={durationInput}
                    onChange={(e) => setDurationInput(e.target.value)}
                    className="h-8 bg-slate-900/50 border-yellow-600/30 text-yellow-100 flex-1"
                    min="1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleDurationSave();
                      if (e.key === 'Escape') handleDurationCancel();
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-green-600/20 text-green-400 hover:text-green-300"
                    onClick={handleDurationSave}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-red-600/20 text-red-400 hover:text-red-300"
                    onClick={handleDurationCancel}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-yellow-100 flex-1">{task.duration} minutes</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-yellow-600/20 text-yellow-400 hover:text-yellow-300"
                    onClick={() => setIsEditingDuration(true)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Gold Value */}
            <div className={`bg-slate-800/50 rounded-lg ${isMobile ? 'p-3' : 'p-4'} border border-yellow-600/20`}>
              <div className="flex items-center gap-2 text-yellow-400 mb-2">
                <Coins className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold`}>Reward</span>
              </div>
              <p className={`text-yellow-100 font-bold ${isMobile ? 'text-sm' : ''}`}>{task.goldValue} Gold</p>
            </div>

            {/* Importance */}
            <div className={`bg-slate-800/50 rounded-lg ${isMobile ? 'p-3' : 'p-4'} border border-yellow-600/20`}>
              <div className="flex items-center gap-2 text-yellow-400 mb-2">
                <AlertTriangle className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold`}>Importance</span>
              </div>
              <Select
                value={task.importance || "Medium"}
                onValueChange={(value) => updateFieldMutation.mutate({ field: 'importance', value })}
              >
                <SelectTrigger className="bg-slate-900/50 border-yellow-600/30 text-yellow-100 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-yellow-600/40">
                  <SelectItem value="Pareto">🔥 Pareto (Critical)</SelectItem>
                  <SelectItem value="High">🚨 High</SelectItem>
                  <SelectItem value="Med-High">⚠️ Med-High</SelectItem>
                  <SelectItem value="Medium">📋 Medium</SelectItem>
                  <SelectItem value="Med-Low">📝 Med-Low</SelectItem>
                  <SelectItem value="Low">📄 Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Additional Properties */}
          <div className={isMobile ? 'grid grid-cols-2 gap-2' : 'space-y-3'}>
            {/* Questline */}
            <div className={`${isMobile ? 'flex flex-col gap-1.5' : 'flex items-center justify-between'} bg-slate-800/50 rounded-lg ${isMobile ? 'p-2.5' : 'p-3'} border border-yellow-600/20`}>
              <div className="flex items-center gap-2 text-yellow-400">
                <Crown className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold`}>Questline</span>
              </div>
              <Select
                value={task.campaign || "unassigned"}
                onValueChange={(value) => updateFieldMutation.mutate({ field: 'campaign', value })}
              >
                <SelectTrigger className={`${isMobile ? 'w-full' : 'w-[140px]'} bg-slate-900/50 border-yellow-600/30 text-yellow-100 h-8 text-xs`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-yellow-600/40">
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  <SelectItem value="Main">👑 Main</SelectItem>
                  <SelectItem value="Side">⚔️ Side</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Business/Work Filter */}
            <div className={`${isMobile ? 'flex flex-col gap-1.5' : 'flex items-center justify-between'} bg-slate-800/50 rounded-lg ${isMobile ? 'p-2.5' : 'p-3'} border border-yellow-600/20`}>
              <div className="flex items-center gap-2 text-yellow-400">
                <Briefcase className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold`}>{isMobile ? 'Work Filter' : 'Business/Work Filter'}</span>
              </div>
              <Select
                value={task.businessWorkFilter || "General"}
                onValueChange={(value) => updateFieldMutation.mutate({ field: 'businessWorkFilter', value })}
              >
                <SelectTrigger className={`${isMobile ? 'w-full' : 'w-[140px]'} bg-slate-900/50 border-yellow-600/30 text-yellow-100 h-8 text-xs`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-yellow-600/40">
                  <SelectItem value="General">💼 General</SelectItem>
                  <SelectItem value="Apple">🍎 Apple</SelectItem>
                  <SelectItem value="MW">🏢 MW</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Kanban Stage */}
            <div className={`${isMobile ? 'flex flex-col gap-1.5' : 'flex items-center justify-between'} bg-slate-800/50 rounded-lg ${isMobile ? 'p-2.5' : 'p-3'} border border-yellow-600/20`}>
              <div className="flex items-center gap-2 text-yellow-400">
                <BarChart3 className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold`}>Kanban Stage</span>
              </div>
              <Select
                value={task.kanbanStage || "Not Started"}
                onValueChange={(value) => updateFieldMutation.mutate({ field: 'kanbanStage', value })}
              >
                <SelectTrigger className={`${isMobile ? 'w-full' : 'w-[140px]'} bg-slate-900/50 border-yellow-600/30 text-yellow-100 h-8 text-xs`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-yellow-600/40">
                  <SelectItem value="Not Started">📋 Not Started</SelectItem>
                  <SelectItem value="In Progress">🔄 In Progress</SelectItem>
                  <SelectItem value="Incubate">💡 Incubate</SelectItem>
                  <SelectItem value="Review">👀 Review</SelectItem>
                  <SelectItem value="Done">✅ Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recurrence Type */}
            <div className={`${isMobile ? 'flex flex-col gap-1.5' : 'flex items-center justify-between'} bg-slate-800/50 rounded-lg ${isMobile ? 'p-2.5' : 'p-3'} border border-yellow-600/20`}>
              <div className="flex items-center gap-2 text-yellow-400">
                <Repeat className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold`}>Recurrence</span>
              </div>
              <Select
                value={task.recurType || "one-time"}
                onValueChange={(value) => updateFieldMutation.mutate({ field: 'recurType', value })}
              >
                <SelectTrigger className={`${isMobile ? 'w-full' : 'w-[160px]'} bg-slate-900/50 border-yellow-600/30 text-yellow-100 h-8 text-xs`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-yellow-600/40">
                  <SelectItem value="one-time">⏳ One-time</SelectItem>
                  <SelectItem value="daily">📅 Daily</SelectItem>
                  <SelectItem value="every other day">📆 Every Other Day</SelectItem>
                  <SelectItem value="2x week">2️⃣ 2x Week</SelectItem>
                  <SelectItem value="3x week">3️⃣ 3x Week</SelectItem>
                  <SelectItem value="weekly">📅 Weekly</SelectItem>
                  <SelectItem value="2x month">📅 2x Month</SelectItem>
                  <SelectItem value="monthly">📅 Monthly</SelectItem>
                  <SelectItem value="every 2 months">📅 Every 2 Months</SelectItem>
                  <SelectItem value="quarterly">📅 Quarterly</SelectItem>
                  <SelectItem value="every 6 months">📅 Every 6 Months</SelectItem>
                  <SelectItem value="yearly">📅 Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Special Flags */}
          {(task.apple || task.smartPrep || task.delegationTask || task.velin) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-yellow-400">
                <Tag className="w-4 h-4" />
                <h3 className="font-semibold">Tags</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {task.apple && (
                  <Badge className="bg-gray-700 text-white border-gray-600">
                    🍎 Apple
                  </Badge>
                )}
                {task.smartPrep && (
                  <Badge className="bg-blue-700 text-white border-blue-600">
                    🧠 Smart Prep
                  </Badge>
                )}
                {task.delegationTask && (
                  <Badge className="bg-green-700 text-white border-green-600">
                    👥 Delegation
                  </Badge>
                )}
                {task.velin && (
                  <Badge className="bg-orange-700 text-white border-orange-600">
                    ⚡ Velin
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Completion Status */}
          {task.completed && task.completedAt && (
            <div className="bg-green-900/30 rounded-lg p-4 border border-green-600/30">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">Completed</span>
              </div>
              <p className="text-green-200/80 text-sm mt-1">
                {format(new Date(task.completedAt), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
