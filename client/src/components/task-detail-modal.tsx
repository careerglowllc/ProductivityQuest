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
  X,
  Target
} from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
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
  const [detailsValue, setDetailsValue] = useState(task?.details || task?.description || "");
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task?.title || "");
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const detailsDisplayRef = useRef<HTMLDivElement>(null);
  const detailsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch questlines for the dropdown and stage resolution
  const { data: questlines = [] } = useQuery<{
    id: number;
    title: string;
    icon: string | null;
    tasks: { id: number; title: string; parentTaskId: number | null }[];
  }[]>({
    queryKey: ["/api/questlines"],
    enabled: open,
  });

  // Resolve the parent stage name for this task (if it belongs to a questline and has a parent)
  const parentStageName = (() => {
    if (!task?.questlineId || !task?.parentTaskId) return null;
    const ql = questlines.find((q) => q.id === task.questlineId);
    if (!ql?.tasks) return null;
    const parent = ql.tasks.find((t) => t.id === task.parentTaskId);
    return parent?.title ?? null;
  })();

  // Sync local state when task prop changes (e.g. switching between tasks)
  // But DON'T overwrite while user is actively editing details/title
  useEffect(() => {
    if (!isEditingDetails) {
      setDetailsValue(task?.details || task?.description || "");
    }
    if (!isEditingTitle) {
      setTitleValue(task?.title || "");
    }
    setDurationInput(task?.duration?.toString() || "30");
    // Only reset editing state when switching to a different task
  }, [task?.id]);

  // When modal closes, reset editing state
  useEffect(() => {
    if (!open) {
      setIsEditingDetails(false);
      setIsEditingTitle(false);
    }
  }, [open]);

  // Detect if description text is truncated (overflows the display area)
  useLayoutEffect(() => {
    const el = detailsDisplayRef.current;
    if (el && !isEditingDetails) {
      setIsTruncated(el.scrollHeight > el.clientHeight + 2);
    }
  }, [detailsValue, isEditingDetails, open]);

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
        body: JSON.stringify({ details: newDetails, description: newDetails }),
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

  const updateTitleMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: newTitle }),
      });
      if (!response.ok) throw new Error('Failed to update title');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
  });

  const handleTitleChange = (value: string) => {
    setTitleValue(value);
    if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
    titleTimeoutRef.current = setTimeout(() => {
      updateTitleMutation.mutate(value);
    }, 800);
  };

  const handleTitleBlur = () => {
    // Save immediately on blur if there's a pending debounce
    if (titleTimeoutRef.current) {
      clearTimeout(titleTimeoutRef.current);
      titleTimeoutRef.current = null;
    }
    if (titleValue.trim() && titleValue !== task?.title) {
      updateTitleMutation.mutate(titleValue.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setTitleValue(task?.title || "");
      setIsEditingTitle(false);
    }
  };

  const updateFieldMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: string | number | null }) => {
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
      queryClient.invalidateQueries({ queryKey: ['/api/questlines'] });
      const fieldLabels: Record<string, string> = {
        importance: '⚡ Importance',
        kanbanStage: '📊 Kanban Stage',
        recurType: '🔄 Recurrence',
        businessWorkFilter: '💼 Work Filter',
        campaign: '👑 Campaign',
        questlineId: '⚔️ Questline',
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

  // ── iOS-style swipe-down-to-close ──
  // Matches native iOS sheet dismiss: works from anywhere when scrolled to top,
  // velocity-based closing, scale+opacity animation, low threshold for quick flicks.
  const swipeRef = useRef<{
    startY: number;
    startTime: number;
    startScrollTop: number;
    dragging: boolean;
    scrollEl: HTMLElement | null;
    lastY: number;
    lastTime: number;
    velocityY: number;
  }>({
    startY: 0, startTime: 0, startScrollTop: 0, dragging: false,
    scrollEl: null, lastY: 0, lastTime: 0, velocityY: 0,
  });
  const [dragOffset, setDragOffset] = useState(0);
  const dragOffsetRef = useRef(0);
  const touchElRef = useRef<HTMLDivElement | null>(null);
  const listenersAttachedRef = useRef(false);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => { dragOffsetRef.current = dragOffset; }, [dragOffset]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const el = touchElRef.current;
    if (!el) return;
    // Walk up to find the scrollable container
    let scrollEl: HTMLElement | null = el.parentElement;
    while (scrollEl && scrollEl.scrollHeight <= scrollEl.clientHeight + 1) {
      scrollEl = scrollEl.parentElement;
    }
    if (!scrollEl) scrollEl = el.parentElement;
    const scrollTop = scrollEl?.scrollTop ?? 0;
    const now = Date.now();
    swipeRef.current = {
      startY: e.touches[0].clientY,
      startTime: now,
      startScrollTop: scrollTop,
      dragging: false,
      scrollEl,
      lastY: e.touches[0].clientY,
      lastTime: now,
      velocityY: 0,
    };
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const s = swipeRef.current;
    const touchY = e.touches[0].clientY;
    const deltaY = touchY - s.startY;
    const currentScrollTop = s.scrollEl?.scrollTop ?? 0;
    const now = Date.now();

    // Track velocity (smoothed over last frame)
    const dt = now - s.lastTime;
    if (dt > 0) {
      const instantVelocity = (touchY - s.lastY) / dt; // px/ms, positive = downward
      s.velocityY = 0.7 * instantVelocity + 0.3 * s.velocityY; // smoothed
    }
    s.lastY = touchY;
    s.lastTime = now;

    // Start dragging: content at/near top AND pulling down
    if (!s.dragging && s.startScrollTop <= 5 && currentScrollTop <= 5 && deltaY > 3) {
      s.dragging = true;
    }

    if (s.dragging && deltaY > 0) {
      // Slight rubber-band resistance — feels natural but follows finger closely
      const offset = deltaY * 0.85;
      dragOffsetRef.current = offset;
      setDragOffset(offset);
      e.preventDefault();
    } else if (s.dragging && deltaY <= 0) {
      // User swiped back up past origin — snap to 0
      dragOffsetRef.current = 0;
      setDragOffset(0);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    const s = swipeRef.current;
    if (!s.dragging) {
      setDragOffset(0);
      dragOffsetRef.current = 0;
      return;
    }

    const offset = dragOffsetRef.current;
    const velocity = s.velocityY; // px/ms, positive = downward

    // iOS-style dismiss logic:
    // 1. Quick flick (velocity > 0.3 px/ms) closes regardless of distance
    // 2. Dragged past 25% of screen height closes
    // 3. Dragged past 80px with mild downward velocity closes
    const screenH = window.innerHeight;
    const shouldClose =
      velocity > 0.3 ||                           // fast flick
      offset > screenH * 0.25 ||                   // dragged far enough
      (offset > 80 && velocity > 0.05);            // moderate drag + mild velocity

    if (shouldClose) {
      // Animate out: scale down + slide down + fade
      dragOffsetRef.current = screenH;
      setDragOffset(screenH);
      // Let the CSS transition play, then close
      setTimeout(() => {
        onOpenChangeRef.current(false);
        setDragOffset(0);
        dragOffsetRef.current = 0;
      }, 250);
    } else {
      // Snap back
      setDragOffset(0);
      dragOffsetRef.current = 0;
    }
    s.dragging = false;
  }, []);

  // Callback ref — attaches native touch listeners when the DOM node mounts
  const swipeCallbackRef = useCallback((node: HTMLDivElement | null) => {
    if (touchElRef.current && listenersAttachedRef.current) {
      touchElRef.current.removeEventListener('touchstart', handleTouchStart as any);
      touchElRef.current.removeEventListener('touchmove', handleTouchMove as any);
      touchElRef.current.removeEventListener('touchend', handleTouchEnd as any);
      listenersAttachedRef.current = false;
    }
    touchElRef.current = node;
    if (node && isMobile) {
      node.addEventListener('touchstart', handleTouchStart as any, { passive: true });
      node.addEventListener('touchmove', handleTouchMove as any, { passive: false });
      node.addEventListener('touchend', handleTouchEnd as any, { passive: true });
      listenersAttachedRef.current = true;
    }
  }, [isMobile, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Cleanup on modal close / unmount
  useEffect(() => {
    if (!open) {
      setDragOffset(0);
      dragOffsetRef.current = 0;
    }
    return () => {
      if (touchElRef.current && listenersAttachedRef.current) {
        touchElRef.current.removeEventListener('touchstart', handleTouchStart as any);
        touchElRef.current.removeEventListener('touchmove', handleTouchMove as any);
        touchElRef.current.removeEventListener('touchend', handleTouchEnd as any);
        listenersAttachedRef.current = false;
      }
    };
  }, [open, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Compute iOS-style transform: translateY + scale down + rounded corners + opacity
  const getMobileStyle = (): React.CSSProperties | undefined => {
    if (!isMobile) return undefined;
    const screenH = window.innerHeight;
    if (dragOffset > 0) {
      // During drag: scale shrinks from 1 → 0.88 as offset → screenH*0.4
      const progress = Math.min(dragOffset / (screenH * 0.4), 1);
      const scale = 1 - progress * 0.12; // 1 → 0.88
      const opacity = 1 - progress * 0.5; // 1 → 0.5
      const radius = progress * 20; // 0 → 20px
      // Check if this is the close animation (offset >= screenH means we're animating out)
      const isClosing = dragOffset >= screenH;
      return {
        transform: `translateY(${dragOffset}px) scale(${isClosing ? 0.85 : scale})`,
        transformOrigin: 'top center',
        borderRadius: `${isClosing ? 20 : radius}px`,
        opacity: isClosing ? 0 : opacity,
        transition: isClosing ? 'transform 0.25s ease-out, opacity 0.25s ease-out, border-radius 0.25s ease-out' : 'none',
        willChange: 'transform, opacity',
      };
    }
    // Resting state — smooth snap-back
    return {
      transform: 'translateY(0) scale(1)',
      transformOrigin: 'top center',
      borderRadius: '0px',
      opacity: 1,
      transition: 'transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.3s ease-out, border-radius 0.3s ease-out',
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        style={getMobileStyle()}
        className={`${isMobile ? 'max-w-full w-full h-full max-h-full m-0 rounded-none !left-0 !top-0 !translate-x-0 !translate-y-0 pt-[max(1rem,env(safe-area-inset-top))] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] [&>button]:top-[max(0.75rem,env(safe-area-inset-top))] !animate-none' : 'max-w-2xl max-h-[90vh] p-6'} overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 border-2 border-yellow-600/30 ${isMobile ? '' : 'data-[state=open]:animate-in data-[state=open]:zoom-in-75 data-[state=open]:duration-300 data-[state=closed]:animate-out data-[state=closed]:zoom-out-75 data-[state=closed]:duration-200'}`}>
        {/* Inner touch wrapper for swipe-down-to-close on mobile */}
        <div ref={isMobile ? swipeCallbackRef : undefined} className="min-h-full">
        {/* iOS-style pull-down handle for mobile */}
        {isMobile && (
          <div className="flex justify-center pt-2 pb-3 -mt-1">
            <div className="w-12 h-1.5 rounded-full bg-yellow-200/40" />
          </div>
        )}
        <DialogHeader>
          <DialogTitle className={`${isMobile ? 'text-lg pr-12' : 'text-2xl pr-8'} font-serif text-yellow-100 flex items-start gap-2`}>
            <EmojiPicker
              value={task.emoji || "📝"}
              onChange={(emoji) => updateFieldMutation.mutate({ field: 'emoji', value: emoji })}
              size="lg"
            />
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={titleValue}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                className={`pt-1 flex-1 min-w-0 bg-transparent border-b-2 border-yellow-500/50 focus:border-yellow-400 outline-none text-yellow-100 font-serif ${isMobile ? 'text-lg' : 'text-2xl'}`}
                autoFocus
              />
            ) : (
              <span 
                className="pt-1 cursor-text hover:text-yellow-200 transition-colors border-b-2 border-transparent"
                onClick={() => {
                  setIsEditingTitle(true);
                  setTimeout(() => titleInputRef.current?.focus(), 0);
                }}
              >
                {titleValue || task.title}
                {updateTitleMutation.isPending && (
                  <span className="ml-2 text-xs text-yellow-400/50 font-sans">Saving...</span>
                )}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className={`${isMobile ? 'space-y-3 mt-1' : 'space-y-6 mt-4'}`}>
          {/* Details - dynamic display with edit mode */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-yellow-400">
              <BarChart3 className={`${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
              <h3 className={`font-semibold ${isMobile ? 'text-sm' : ''}`}>Details</h3>
              {updateDetailsMutation.isPending && (
                <span className="text-xs text-yellow-400/50">Saving...</span>
              )}
              <div className="ml-auto">
                {!isEditingDetails ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-yellow-600/20 text-yellow-400 hover:text-yellow-300"
                    onClick={() => setIsEditingDetails(true)}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-green-600/20 text-green-400 hover:text-green-300"
                    onClick={() => setIsEditingDetails(false)}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {isEditingDetails ? (
              <Textarea
                value={detailsValue}
                onChange={(e) => handleDetailsChange(e.target.value)}
                placeholder="Add details..."
                className={`text-yellow-200/80 bg-slate-800/50 rounded-lg border border-yellow-600/20 placeholder:text-yellow-200/30 resize-none focus:border-yellow-500/50 focus:ring-yellow-500/20 ${isMobile ? 'p-2.5 min-h-[200px] text-sm' : 'p-3 min-h-[260px]'}`}
                rows={isMobile ? 8 : 10}
                autoFocus
              />
            ) : (
              <div className="relative">
                <div
                  ref={detailsDisplayRef}
                  onClick={() => {
                    if (!detailsValue) setIsEditingDetails(true);
                  }}
                  className={`text-yellow-200/80 bg-slate-800/50 rounded-lg border border-yellow-600/20 whitespace-pre-wrap break-words overflow-hidden ${
                    isMobile ? 'p-2.5 text-sm' : 'p-3'
                  } ${!detailsValue ? 'text-yellow-200/30 cursor-text' : ''}`}
                  style={{
                    maxHeight: isMobile ? '200px' : '260px',
                    minHeight: detailsValue ? undefined : (isMobile ? '48px' : '56px'),
                  }}
                >
                  {detailsValue || 'Add details...'}
                </div>
                {isTruncated && detailsValue && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-800/95 via-slate-800/80 to-transparent rounded-b-lg pt-8 pb-2 px-2.5 flex justify-center">
                    <button
                      onClick={() => setShowFullDetails(true)}
                      className="text-yellow-400 text-xs font-semibold hover:text-yellow-300 transition-colors bg-slate-800/90 px-3 py-1 rounded-full border border-yellow-600/30"
                    >
                      View full message…
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Full Details Popup Modal */}
          <Dialog open={showFullDetails} onOpenChange={setShowFullDetails}>
            <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[80vh]' : 'max-w-2xl max-h-[80vh]'} bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 border-2 border-yellow-600/30 flex flex-col`}>
              <DialogHeader>
                <DialogTitle className="text-yellow-100 font-serif flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-yellow-400" />
                  Full Details
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                <p className={`text-yellow-200/80 whitespace-pre-wrap break-words ${isMobile ? 'text-sm' : ''}`}>
                  {detailsValue}
                </p>
              </div>
            </DialogContent>
          </Dialog>

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
                value={task.questlineId ? String(task.questlineId) : "none"}
                onValueChange={(value) => {
                  const numVal = value === "none" ? null : parseInt(value);
                  updateFieldMutation.mutate({ field: 'questlineId', value: numVal });
                }}
              >
                <SelectTrigger className={`${isMobile ? 'w-full' : 'w-[180px]'} bg-slate-900/50 border-yellow-600/30 text-yellow-100 h-8 text-xs`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-yellow-600/40">
                  <SelectItem value="none">No Questline</SelectItem>
                  {questlines.map((ql) => (
                    <SelectItem key={ql.id} value={String(ql.id)}>
                      {ql.icon || "⚔️"} {ql.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stage (shown when task belongs to a questline and has a parent stage) */}
            {parentStageName && (
              <div className={`${isMobile ? 'flex flex-col gap-1.5' : 'flex items-center justify-between'} bg-slate-800/50 rounded-lg ${isMobile ? 'p-2.5' : 'p-3'} border border-purple-600/20`}>
                <div className="flex items-center gap-2 text-purple-400">
                  <Target className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                  <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold`}>Stage</span>
                </div>
                <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-purple-200/80 truncate ${isMobile ? '' : 'max-w-[180px]'}`}>
                  {parentStageName}
                </span>
              </div>
            )}

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
        </div>
      </DialogContent>
    </Dialog>
  );
}
