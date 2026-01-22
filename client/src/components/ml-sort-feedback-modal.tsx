import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown, GripVertical, Send, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ScheduledTask {
  taskId: number;
  startTime: string;
  endTime: string;
}

interface TaskMetadata {
  taskId: number;
  title: string;
  priority: string;
  duration: number;
}

interface MLSortFeedbackProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  originalSchedule: ScheduledTask[];
  sortedSchedule: ScheduledTask[];
  taskMetadata: TaskMetadata[];
  alreadyApplied?: boolean;
}

// Priority color helper
function getPriorityColor(priority: string): string {
  switch (priority?.toLowerCase()) {
    case 'high': return 'bg-red-500/30 border-red-500/50';
    case 'med-high': return 'bg-orange-500/30 border-orange-500/50';
    case 'medium': return 'bg-yellow-500/30 border-yellow-500/50';
    case 'med-low': return 'bg-blue-500/30 border-blue-500/50';
    case 'low': return 'bg-green-500/30 border-green-500/50';
    default: return 'bg-purple-500/30 border-purple-500/50';
  }
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function MLSortFeedbackModal({
  isOpen,
  onClose,
  date,
  originalSchedule,
  sortedSchedule,
  taskMetadata,
  alreadyApplied = true,
}: MLSortFeedbackProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<'feedback' | 'correction' | 'verbal'>('feedback');
  const [correctedSchedule, setCorrectedSchedule] = useState<ScheduledTask[]>([]);
  const [feedbackReason, setFeedbackReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Get task metadata by ID
  const getTaskMetadata = (taskId: number) => taskMetadata.find(m => m.taskId === taskId);

  // Initialize correction mode
  const startCorrection = useCallback(() => {
    setCorrectedSchedule([...sortedSchedule]);
    setMode('correction');
  }, [sortedSchedule]);

  // Recalculate times based on order
  const recalculateTimes = (schedule: ScheduledTask[], targetDate: Date): ScheduledTask[] => {
    let currentTime = new Date(targetDate);
    currentTime.setHours(9, 0, 0, 0);
    const breakDuration = 15;

    return schedule.map(item => {
      const metadata = taskMetadata.find(m => m.taskId === item.taskId);
      const duration = metadata?.duration || 60;

      const startTime = new Date(currentTime);
      const endTime = new Date(currentTime);
      endTime.setMinutes(endTime.getMinutes() + duration);

      currentTime = new Date(endTime);
      currentTime.setMinutes(currentTime.getMinutes() + breakDuration);

      return {
        taskId: item.taskId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      };
    });
  };

  // Handle drag
  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragEnd = () => setDraggedIndex(null);
  
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSchedule = [...correctedSchedule];
    const draggedItem = newSchedule[draggedIndex];
    newSchedule.splice(draggedIndex, 1);
    newSchedule.splice(index, 0, draggedItem);
    
    setCorrectedSchedule(recalculateTimes(newSchedule, date));
    setDraggedIndex(index);
  };

  // Submit thumbs up
  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await apiRequest('POST', '/api/ml/feedback', {
        date: date.toISOString(),
        originalSchedule,
        mlSortedSchedule: sortedSchedule,
        feedbackType: 'approved',
        taskMetadata,
      });

      toast({
        title: "Thanks! 👍",
        description: "AI will remember your preference.",
      });

      queryClient.invalidateQueries({ queryKey: ['/api/google-calendar/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      onClose();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit correction
  const handleSubmitCorrection = async () => {
    if (!feedbackReason.trim()) {
      toast({
        title: "Please explain",
        description: "Help us learn why you made these changes",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest('POST', '/api/ml/feedback', {
        date: date.toISOString(),
        originalSchedule,
        mlSortedSchedule: sortedSchedule,
        userCorrectedSchedule: correctedSchedule,
        feedbackType: 'corrected',
        feedbackReason,
        taskMetadata,
      });

      toast({
        title: "Thanks for teaching! 🧠",
        description: "Your schedule has been updated.",
      });

      queryClient.invalidateQueries({ queryKey: ['/api/google-calendar/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      onClose();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit verbal feedback only (no reordering)
  const handleSubmitVerbalFeedback = async () => {
    if (!feedbackReason.trim()) {
      toast({
        title: "Please provide feedback",
        description: "Tell us how you'd like sorting to work",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest('POST', '/api/ml/feedback', {
        date: date.toISOString(),
        originalSchedule,
        mlSortedSchedule: sortedSchedule,
        feedbackType: 'verbal',
        feedbackReason,
        taskMetadata,
      });

      toast({
        title: "Feedback received! 📝",
        description: "AI will consider this for future sorting.",
      });

      onClose();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset on close
  const handleClose = () => {
    setMode('feedback');
    setCorrectedSchedule([]);
    setFeedbackReason('');
    onClose();
  };

  // FEEDBACK MODE - Small prompt asking how AI did (bottom-right corner)
  if (mode === 'feedback') {
    return (
      <div 
        className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
      >
        <div className="bg-gray-900 border border-purple-500/30 rounded-lg shadow-xl p-4 w-72">
          {/* Close button */}
          <button 
            onClick={handleClose}
            className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="text-center mb-3">
            <div className="text-white text-sm font-medium flex items-center justify-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              Schedule Applied!
            </div>
            <div className="text-gray-400 text-xs mt-1">
              How did the AI sorting work for you?
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                onClick={startCorrection}
                variant="outline"
                size="sm"
                className="flex-1 h-10 border-red-500/30 hover:bg-red-500/10 text-red-300 text-xs"
                disabled={isSubmitting}
              >
                <ThumbsDown className="w-4 h-4 mr-1" />
                Reorder It
              </Button>
              <Button
                onClick={handleApprove}
                size="sm"
                className="flex-1 h-10 bg-green-600 hover:bg-green-500 text-white text-xs"
                disabled={isSubmitting}
              >
                <ThumbsUp className="w-4 h-4 mr-1" />
                Perfect!
              </Button>
            </div>
            <Button
              onClick={() => setMode('verbal')}
              variant="outline"
              size="sm"
              className="w-full h-8 border-purple-500/30 hover:bg-purple-500/10 text-purple-300 text-xs"
              disabled={isSubmitting}
            >
              💬 Just Give Feedback
            </Button>
          </div>

          <p className="text-[10px] text-gray-500 text-center mt-2">
            Your feedback trains the AI to sort better next time
          </p>
        </div>
      </div>
    );
  }

  // VERBAL FEEDBACK MODE - Just text input, no reordering
  if (mode === 'verbal') {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="bg-gray-900 border-purple-500/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              💬 Share Your Feedback
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Tell us how you'd like tasks sorted. No need to reorder.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Textarea
              placeholder="e.g., I prefer hard tasks in the morning, or schedule meetings after lunch..."
              value={feedbackReason}
              onChange={(e) => setFeedbackReason(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 min-h-[100px] resize-none"
              autoFocus
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setMode('feedback')}
              className="border-gray-600"
              disabled={isSubmitting}
            >
              Back
            </Button>
            <Button
              onClick={handleSubmitVerbalFeedback}
              className="flex-1 bg-purple-600 hover:bg-purple-500"
              disabled={isSubmitting || !feedbackReason.trim()}
            >
              <Send className="w-4 h-4 mr-2" />
              Submit Feedback
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // CORRECTION MODE - Full modal with drag-drop
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-purple-500/30 max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-white">
            📝 How should it be sorted?
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Drag tasks to reorder, then tell us why.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable task list */}
        <div className="flex-1 overflow-y-auto min-h-0 py-2 space-y-1.5">
          {correctedSchedule.map((item, index) => {
            const metadata = getTaskMetadata(item.taskId);
            return (
              <div
                key={item.taskId}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`p-2 rounded border ${getPriorityColor(metadata?.priority || '')} 
                  flex items-center gap-2 cursor-move select-none
                  ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
                  hover:border-purple-400 transition-all`}
              >
                <GripVertical className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="text-xs font-mono text-gray-400 w-20 shrink-0">
                  {formatTime(item.startTime)}
                </span>
                <span className="flex-1 text-sm font-medium text-white truncate">
                  {metadata?.title}
                </span>
                <span className="text-xs text-gray-500 shrink-0">
                  {metadata?.duration}m
                </span>
              </div>
            );
          })}
        </div>

        {/* Explanation input */}
        <div className="shrink-0 space-y-2 pt-2 border-t border-gray-800">
          <label className="text-sm font-medium text-gray-300">
            Why did you reorder? (helps AI learn)
          </label>
          <Textarea
            placeholder="e.g., I prefer hard tasks in the morning..."
            value={feedbackReason}
            onChange={(e) => setFeedbackReason(e.target.value)}
            className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 min-h-[60px] resize-none"
          />
        </div>

        {/* Actions */}
        <div className="shrink-0 flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => setMode('feedback')}
            className="border-gray-600"
            disabled={isSubmitting}
          >
            Back
          </Button>
          <Button
            onClick={handleSubmitCorrection}
            className="flex-1 bg-purple-600 hover:bg-purple-500"
            disabled={isSubmitting || !feedbackReason.trim()}
          >
            <Send className="w-4 h-4 mr-2" />
            Apply & Train AI
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
