import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { calculateGoldValue } from "@/lib/goldCalculation";

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTaskModal({ open, onOpenChange }: AddTaskModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [details, setDetails] = useState("");
  const [duration, setDuration] = useState<string>("30");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [importance, setImportance] = useState<string>("Medium");
  const [kanbanStage, setKanbanStage] = useState<string>("To Do");
  const [recurType, setRecurType] = useState<string>("⏳One-time");
  const [businessWorkFilter, setBusinessWorkFilter] = useState<string>("General");
  const [campaign, setCampaign] = useState<string>("unassigned");
  
  // Checkbox filters
  const [apple, setApple] = useState(false);
  const [smartPrep, setSmartPrep] = useState(false);
  const [delegationTask, setDelegationTask] = useState(false);
  const [velin, setVelin] = useState(false);

  // Auto-calculate gold value whenever duration or importance changes
  const goldValue = calculateGoldValue(importance, parseInt(duration) || 30);

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      return await apiRequest("POST", "/api/tasks", taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      // Invalidate all calendar event queries (matches any year/month params)
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0]?.toString().startsWith('/api/google-calendar/events') || false
      });
      toast({
        title: "✓ Quest Created!",
        description: "Your new quest has been added to the list.",
      });
      resetForm();
      onOpenChange(false);
      
      // Refetch tasks after delays to pick up auto-categorized skillTags
      // Try at 1s and 3s in case AI categorization takes longer
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      }, 1000);
      
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      }, 3000);
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Quest",
        description: error.message || "Failed to create quest. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDetails("");
    setDuration("30");
    // goldValue is auto-calculated, no need to reset
    setDueDate(undefined);
    setImportance("Medium");
    setKanbanStage("To Do");
    setRecurType("⏳One-time");
    setBusinessWorkFilter("General");
    setCampaign("unassigned");
    setApple(false);
    setSmartPrep(false);
    setDelegationTask(false);
    setVelin(false);
  };

  const handleSubmit = () => {
    // Validation
    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a quest title.",
        variant: "destructive",
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: "Description Required",
        description: "Please enter a quest description.",
        variant: "destructive",
      });
      return;
    }

    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      toast({
        title: "Invalid Duration",
        description: "Duration must be a positive number.",
        variant: "destructive",
      });
      return;
    }

    // goldValue is auto-calculated, no need to validate user input

    const taskData = {
      title: title.trim(),
      description: description.trim(),
      details: details.trim() || undefined,
      duration: durationNum,
      goldValue, // Use auto-calculated value
      dueDate: dueDate ? dueDate.toISOString() : null,
      importance,
      kanbanStage,
      recurType,
      businessWorkFilter,
      campaign,
      apple,
      smartPrep,
      delegationTask,
      velin,
      completed: false,
      skillTags: [], // Initialize with empty array
    };

    createTaskMutation.mutate(taskData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 border-2 border-yellow-600/40 text-yellow-100">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-yellow-100">
            Create New Quest
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-yellow-200">
              Quest Title <span className="text-red-400">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter quest title..."
              className="bg-slate-800/50 border-yellow-600/30 text-yellow-100 placeholder:text-yellow-400/40"
              maxLength={200}
            />
            <p className="text-xs text-yellow-400/60">{title.length}/200 characters</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-yellow-200">
              Description <span className="text-red-400">*</span>
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              className="bg-slate-800/50 border-yellow-600/30 text-yellow-100 placeholder:text-yellow-400/40"
              maxLength={500}
            />
            <p className="text-xs text-yellow-400/60">{description.length}/500 characters</p>
          </div>

          {/* Details */}
          <div className="space-y-2">
            <Label htmlFor="details" className="text-yellow-200">
              Additional Details
            </Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Enter detailed information (optional)..."
              className="bg-slate-800/50 border-yellow-600/30 text-yellow-100 placeholder:text-yellow-400/40 min-h-[100px]"
              maxLength={2000}
            />
            <p className="text-xs text-yellow-400/60">{details.length}/2000 characters</p>
          </div>

          {/* Duration and Gold Value */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration" className="text-yellow-200">
                Duration (minutes) <span className="text-red-400">*</span>
              </Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="30"
                min="1"
                className="bg-slate-800/50 border-yellow-600/30 text-yellow-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goldValue" className="text-yellow-200 flex items-center gap-2">
                Gold Reward
                <span className="text-xs text-yellow-400/60">(Auto-calculated)</span>
              </Label>
              <Input
                id="goldValue"
                type="number"
                value={goldValue}
                readOnly
                disabled
                className="bg-slate-800/30 border-yellow-600/20 text-yellow-300 cursor-not-allowed"
              />
              <p className="text-xs text-yellow-400/60">
                Based on duration ({duration} min) and importance ({importance})
              </p>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label className="text-yellow-200">Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-slate-800/50 border-yellow-600/30 text-yellow-100 hover:bg-slate-700/50 hover:text-yellow-100",
                    !dueDate && "text-yellow-400/60"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : <span>Pick a date (optional)</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-slate-800 border-yellow-600/40">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                  className="bg-slate-800 text-yellow-100"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Importance */}
          <div className="space-y-2">
            <Label htmlFor="importance" className="text-yellow-200">
              Importance
            </Label>
            <Select value={importance} onValueChange={setImportance}>
              <SelectTrigger className="bg-slate-800/50 border-yellow-600/30 text-yellow-100">
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

          {/* Kanban Stage */}
          <div className="space-y-2">
            <Label htmlFor="kanbanStage" className="text-yellow-200">
              Kanban Stage
            </Label>
            <Select value={kanbanStage} onValueChange={setKanbanStage}>
              <SelectTrigger className="bg-slate-800/50 border-yellow-600/30 text-yellow-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-yellow-600/40">
                <SelectItem value="To Do">To Do</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Review">Review</SelectItem>
                <SelectItem value="Done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Recurrence Type */}
          <div className="space-y-2">
            <Label htmlFor="recurType" className="text-yellow-200">
              Recurrence
            </Label>
            <Select value={recurType} onValueChange={setRecurType}>
              <SelectTrigger className="bg-slate-800/50 border-yellow-600/30 text-yellow-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-yellow-600/40">
                <SelectItem value="⏳One-time">⏳ One-time</SelectItem>
                <SelectItem value="🔄Recurring">🔄 Recurring</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Business/Work Filter */}
          <div className="space-y-2">
            <Label htmlFor="businessWorkFilter" className="text-yellow-200">
              Business/Work Filter
            </Label>
            <Select value={businessWorkFilter} onValueChange={setBusinessWorkFilter}>
              <SelectTrigger className="bg-slate-800/50 border-yellow-600/30 text-yellow-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-yellow-600/40">
                <SelectItem value="General">General</SelectItem>
                <SelectItem value="Apple">Apple</SelectItem>
                <SelectItem value="MW">MW</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campaign */}
          <div className="space-y-2">
            <Label htmlFor="campaign" className="text-yellow-200">
              Questline
            </Label>
            <Select value={campaign} onValueChange={setCampaign}>
              <SelectTrigger className="bg-slate-800/50 border-yellow-600/30 text-yellow-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-yellow-600/40">
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="Main">Main</SelectItem>
                <SelectItem value="Side">Side</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            className="border-yellow-600/40 text-yellow-200 hover:bg-slate-700/50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createTaskMutation.isPending}
            className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-slate-900 font-semibold"
          >
            {createTaskMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Quest"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
