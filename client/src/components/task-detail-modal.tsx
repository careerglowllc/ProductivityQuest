import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { 
  Calendar, 
  Clock, 
  Coins, 
  AlertTriangle, 
  Briefcase, 
  Tag,
  CheckCircle2,
  FileText,
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
import { useState } from "react";
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
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isMobile ? 'max-w-full w-full h-full max-h-full m-0 rounded-none p-4' : 'max-w-2xl max-h-[90vh] p-6'} overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 border-2 border-yellow-600/30`}>
        <DialogHeader>
          <DialogTitle className={`${isMobile ? 'text-xl pr-10' : 'text-2xl pr-8'} font-serif text-yellow-100`}>
            {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className={`${isMobile ? 'space-y-4 mt-2' : 'space-y-6 mt-4'}`}>
          {/* Description - only show if not empty */}
          {task.description && task.description.trim() && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-yellow-400">
                <FileText className="w-4 h-4" />
                <h3 className="font-semibold">Description</h3>
              </div>
              <p className="text-yellow-200/80 bg-slate-800/50 rounded-lg p-3 border border-yellow-600/20 whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          {/* Details - show if exists and not empty */}
          {task.details && task.details.trim() && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-yellow-400">
                <BarChart3 className="w-4 h-4" />
                <h3 className="font-semibold">Details</h3>
              </div>
              <p className="text-yellow-200/80 bg-slate-800/50 rounded-lg p-3 border border-yellow-600/20 whitespace-pre-wrap">
                {task.details}
              </p>
            </div>
          )}

          {/* Key Information Grid */}
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-4'}`}>
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
              {task.importance && (
                <Badge className={getImportanceBadgeColor(task.importance)}>
                  {task.importance}
                </Badge>
              )}
            </div>
          </div>

          {/* Additional Properties */}
          <div className={isMobile ? 'space-y-2' : 'space-y-3'}>
            {/* Questline */}
            <div className={`flex items-center justify-between bg-slate-800/50 rounded-lg ${isMobile ? 'p-2' : 'p-3'} border border-yellow-600/20`}>
              <div className="flex items-center gap-2 text-yellow-400">
                <Crown className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold`}>Questline</span>
              </div>
              <Badge className={getCampaignBadgeColor(task.campaign || 'unassigned')}>
                {task.campaign || 'unassigned'}
              </Badge>
            </div>

            {/* Business/Work Filter */}
            {task.businessWorkFilter && (
              <div className={`flex items-center justify-between bg-slate-800/50 rounded-lg ${isMobile ? 'p-2' : 'p-3'} border border-yellow-600/20`}>
                <div className="flex items-center gap-2 text-yellow-400">
                  <Briefcase className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                  <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold`}>Business/Work Filter</span>
                </div>
                <Badge className={getBusinessFilterBadgeColor(task.businessWorkFilter)}>
                  {task.businessWorkFilter}
                </Badge>
              </div>
            )}

            {/* Kanban Stage */}
            {task.kanbanStage && (
              <div className={`flex items-center justify-between bg-slate-800/50 rounded-lg ${isMobile ? 'p-2' : 'p-3'} border border-yellow-600/20`}>
                <div className="flex items-center gap-2 text-yellow-400">
                  <BarChart3 className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                  <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold`}>Kanban Stage</span>
                </div>
                <Badge className="bg-indigo-600 text-white border-indigo-500">
                  {task.kanbanStage}
                </Badge>
              </div>
            )}

            {/* Recurrence Type */}
            {task.recurType && (
              <div className={`flex items-center justify-between bg-slate-800/50 rounded-lg ${isMobile ? 'p-2' : 'p-3'} border border-yellow-600/20`}>
                <div className="flex items-center gap-2 text-yellow-400">
                  <Repeat className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                  <span className="text-sm font-semibold">Recurrence</span>
                </div>
                <Badge className="bg-purple-600 text-white border-purple-500">
                  {task.recurType}
                </Badge>
              </div>
            )}
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
