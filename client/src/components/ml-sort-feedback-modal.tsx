import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown, GripVertical, Clock, Send } from "lucide-react";
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

interface MLSortFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  originalSchedule: ScheduledTask[];
  sortedSchedule: ScheduledTask[];
  taskMetadata: TaskMetadata[];
}

// Priority color helper
function getPriorityColor(priority: string): string {
  switch (priority?.toLowerCase()) {
    case 'high': return 'bg-red-500/20 text-red-300 border-red-500/30';
    case 'med-high': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    case 'med-low': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    case 'low': return 'bg-green-500/20 text-green-300 border-green-500/30';
    default: return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
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
}: MLSortFeedbackModalProps) {
  const { toast } = useToast();
  const [feedbackMode, setFeedbackMode] = useState<'initial' | 'correction'>('initial');
  const [correctedSchedule, setCorrectedSchedule] = useState<ScheduledTask[]>([]);
  const [feedbackReason, setFeedbackReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Initialize corrected schedule from ML sorted schedule
  const initCorrection = useCallback(() => {
    setCorrectedSchedule([...sortedSchedule]);
    setFeedbackMode('correction');
  }, [sortedSchedule]);

  // Handle drag start
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSchedule = [...correctedSchedule];
    const draggedItem = newSchedule[draggedIndex];
    
    // Remove from old position
    newSchedule.splice(draggedIndex, 1);
    // Insert at new position
    newSchedule.splice(index, 0, draggedItem);
    
    // Recalculate times based on new order
    const recalculatedSchedule = recalculateTimes(newSchedule, date);
    
    setCorrectedSchedule(recalculatedSchedule);
    setDraggedIndex(index);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Recalculate times based on order
  const recalculateTimes = (schedule: ScheduledTask[], targetDate: Date): ScheduledTask[] => {
    let currentTime = new Date(targetDate);
    currentTime.setHours(9, 0, 0, 0); // Start at 9 AM
    const breakDuration = 15; // 15 min break

    return schedule.map(item => {
      const metadata = taskMetadata.find(m => m.taskId === item.taskId);
      const duration = metadata?.duration || 60;

      const startTime = new Date(currentTime);
      const endTime = new Date(currentTime);
      endTime.setMinutes(endTime.getMinutes() + duration);

      // Move current time forward
      currentTime = new Date(endTime);
      currentTime.setMinutes(currentTime.getMinutes() + breakDuration);

      return {
        taskId: item.taskId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      };
    });
  };

  // Submit approval (thumbs up)
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
        title: "Thanks for the feedback! 👍",
        description: "Your schedule has been applied. The AI will remember this preference.",
      });

      // Refresh calendar data
      queryClient.invalidateQueries({ queryKey: ['/api/google-calendar/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit feedback",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit correction (thumbs down + corrected schedule)
  const handleSubmitCorrection = async () => {
    if (!feedbackReason.trim()) {
      toast({
        title: "Please explain",
        description: "Tell us why you made these changes so we can learn!",
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
        description: "Your corrections help the AI learn your preferences better.",
      });

      // Refresh calendar data
      queryClient.invalidateQueries({ queryKey: ['/api/google-calendar/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit correction",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset and close
  const handleClose = () => {
    setFeedbackMode('initial');
    setCorrectedSchedule([]);
    setFeedbackReason('');
    onClose();
  };

  // Get task metadata by ID
  const getTaskMetadata = (taskId: number) => taskMetadata.find(m => m.taskId === taskId);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-purple-500/30 max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            {feedbackMode === 'initial' ? (
              <>🤖 How did AI sort your day?</>
            ) : (
              <>📝 Drag to correct the schedule</>
            )}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {feedbackMode === 'initial' 
              ? "Review the AI-sorted schedule and let us know if it works for you."
              : "Drag tasks to reorder them, then explain why you made changes."
            }
          </DialogDescription>
        </DialogHeader>

        {feedbackMode === 'initial' ? (
          <>
            {/* Show the sorted schedule */}
            <div className="space-y-2 my-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Sorted Schedule:</h3>
              {sortedSchedule.map((item, index) => {
                const metadata = getTaskMetadata(item.taskId);
                return (
                  <div
                    key={item.taskId}
                    className={`p-3 rounded-lg border ${getPriorityColor(metadata?.priority || '')} flex items-center gap-3`}
                  >
                    <span className="text-xs font-mono text-gray-400 w-24">
                      {formatTime(item.startTime)} - {formatTime(item.endTime)}
                    </span>
                    <span className="flex-1 font-medium truncate">{metadata?.title}</span>
                    <span className="text-xs px-2 py-1 rounded bg-black/20">
                      {metadata?.duration}m
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Feedback buttons */}
            <DialogFooter className="flex gap-3 sm:gap-3">
              <Button
                variant="outline"
                onClick={initCorrection}
                className="flex-1 border-red-500/30 text-red-300 hover:bg-red-500/10"
                disabled={isSubmitting}
              >
                <ThumbsDown className="w-4 h-4 mr-2" />
                Needs Changes
              </Button>
              <Button
                onClick={handleApprove}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white"
                disabled={isSubmitting}
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                Looks Good!
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Correction mode - drag and drop */}
            <div className="space-y-2 my-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">
                Drag tasks to reorder:
              </h3>
              {correctedSchedule.map((item, index) => {
                const metadata = getTaskMetadata(item.taskId);
                return (
                  <div
                    key={item.taskId}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`p-3 rounded-lg border ${getPriorityColor(metadata?.priority || '')} 
                      flex items-center gap-3 cursor-move
                      ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
                      hover:border-purple-400 transition-all`}
                  >
                    <GripVertical className="w-4 h-4 text-gray-500" />
                    <span className="text-xs font-mono text-gray-400 w-24">
                      {formatTime(item.startTime)} - {formatTime(item.endTime)}
                    </span>
                    <span className="flex-1 font-medium truncate">{metadata?.title}</span>
                    <span className="text-xs px-2 py-1 rounded bg-black/20">
                      {metadata?.duration}m
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Explanation text area */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Why did you make these changes?
              </label>
              <Textarea
                placeholder="e.g., I prefer doing important tasks in the afternoon, need longer breaks between meetings..."
                value={feedbackReason}
                onChange={(e) => setFeedbackReason(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 min-h-[80px]"
              />
            </div>

            {/* Submit button */}
            <DialogFooter className="flex gap-3 sm:gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => setFeedbackMode('initial')}
                className="border-gray-500/30 text-gray-300"
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                onClick={handleSubmitCorrection}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white"
                disabled={isSubmitting || !feedbackReason.trim()}
              >
                <Send className="w-4 h-4 mr-2" />
                Submit Correction
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
