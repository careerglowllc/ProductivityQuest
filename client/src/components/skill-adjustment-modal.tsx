import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle2, XCircle, Brain, Wrench, Palette, Briefcase, Sword, Book, Activity, Network, Users } from "lucide-react";
import { getSkillIcon } from "@/lib/skillIcons";
import type { UserSkill } from "@/../../shared/schema";

// Fallback icons for default skills
const SKILL_ICONS: Record<string, any> = {
  Craftsman: Wrench,
  Artist: Palette,
  Mindset: Brain,
  Merchant: Briefcase,
  Physical: Sword,
  Scholar: Book,
  Health: Activity,
  Connector: Network,
  Charisma: Users,
};

interface SkillAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: any[];
  onComplete: () => void;
}

export function SkillAdjustmentModal({
  open,
  onOpenChange,
  tasks,
  onComplete,
}: SkillAdjustmentModalProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedSkills, setSelectedSkills] = useState<Record<number, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Swipe-down-to-close (mobile) ──
  const swipeRef = useRef<{
    startY: number;
    lastY: number;
    lastTime: number;
    velocity: number;
    dragging: boolean;
  } | null>(null);
  const [swipeOffsetY, setSwipeOffsetY] = useState(0);
  const [swipeDismissing, setSwipeDismissing] = useState(false);
  const [swipeTouching, setSwipeTouching] = useState(false);
  const touchElRef = useRef<HTMLDivElement | null>(null);
  const listenersAttachedRef = useRef(false);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const findScrollableParent = (el: HTMLElement | null): HTMLElement | null => {
    let node = el;
    while (node) {
      if (node.scrollHeight > node.clientHeight + 2) {
        const style = window.getComputedStyle(node);
        const overflow = style.overflowY;
        if (overflow === 'auto' || overflow === 'scroll') return node;
      }
      node = node.parentElement;
    }
    return null;
  };

  const handleSwipeTouchStart = useCallback((e: TouchEvent) => {
    const scrollable = findScrollableParent(e.target as HTMLElement);
    if (scrollable && scrollable.scrollTop > 5) return; // content is scrolled down — don't intercept
    swipeRef.current = {
      startY: e.touches[0].clientY,
      lastY: e.touches[0].clientY,
      lastTime: Date.now(),
      velocity: 0,
      dragging: false,
    };
    setSwipeTouching(true);
  }, []);

  const handleSwipeTouchMove = useCallback((e: TouchEvent) => {
    const s = swipeRef.current;
    if (!s) return;
    const touchY = e.touches[0].clientY;
    const deltaY = touchY - s.startY;

    // Start tracking after 3px movement
    if (!s.dragging && deltaY > 3) {
      s.dragging = true;
    }
    if (!s.dragging) return;

    e.preventDefault(); // prevent scroll while swiping modal

    // Velocity tracking
    const now = Date.now();
    const dt = now - s.lastTime;
    if (dt > 0) {
      const instantV = (touchY - s.lastY) / dt;
      s.velocity = s.velocity * 0.7 + instantV * 0.3;
    }
    s.lastY = touchY;
    s.lastTime = now;

    // Drag resistance: 0.85x
    const offset = Math.max(0, deltaY * 0.85);
    setSwipeOffsetY(offset);
  }, []);

  const handleSwipeTouchEnd = useCallback(() => {
    const s = swipeRef.current;
    if (!s) return;
    setSwipeTouching(false);

    if (!s.dragging) {
      swipeRef.current = null;
      return;
    }

    const offset = swipeOffsetY;
    const velocity = s.velocity; // px/ms, positive = downward
    const screenH = window.innerHeight;
    swipeRef.current = null;

    // Close thresholds: velocity flick OR distance
    const shouldClose =
      velocity > 0.3 || // fast flick
      offset > screenH * 0.25 || // dragged >25% of screen
      (offset > 80 && velocity > 0.05); // moderate drag + mild velocity

    if (shouldClose) {
      setSwipeDismissing(true);
      setSwipeOffsetY(screenH);
      setTimeout(() => {
        onOpenChangeRef.current(false);
        // Reset after close animation
        setTimeout(() => {
          setSwipeOffsetY(0);
          setSwipeDismissing(false);
        }, 100);
      }, 250);
    } else {
      // Snap back
      setSwipeOffsetY(0);
    }
  }, [swipeOffsetY]);

  // Callback ref for native touch listeners (iOS Capacitor needs { passive: false })
  const swipeCallbackRef = useCallback((node: HTMLDivElement | null) => {
    if (touchElRef.current && listenersAttachedRef.current) {
      touchElRef.current.removeEventListener('touchstart', handleSwipeTouchStart);
      touchElRef.current.removeEventListener('touchmove', handleSwipeTouchMove);
      touchElRef.current.removeEventListener('touchend', handleSwipeTouchEnd);
      listenersAttachedRef.current = false;
    }
    touchElRef.current = node;
    if (node) {
      node.addEventListener('touchstart', handleSwipeTouchStart, { passive: true });
      node.addEventListener('touchmove', handleSwipeTouchMove, { passive: false });
      node.addEventListener('touchend', handleSwipeTouchEnd, { passive: true });
      listenersAttachedRef.current = true;
    }
  }, [handleSwipeTouchStart, handleSwipeTouchMove, handleSwipeTouchEnd]);

  // Fetch all user skills dynamically
  const { data: allSkills = [], isLoading: skillsLoading } = useQuery<UserSkill[]>({
    queryKey: ["/api/skills"],
  });

  const currentTask = tasks[currentIndex];
  const currentSelectedSkills = selectedSkills[currentTask?.id] || currentTask?.skillTags || [];

  // Helper to get skill icon component
  const getSkillIconComponent = (skill: UserSkill) => {
    if (skill.skillIcon) {
      return getSkillIcon(skill.skillIcon);
    }
    return SKILL_ICONS[skill.skillName] || Brain;
  };

  const toggleSkill = (skill: string) => {
    const newSkills = currentSelectedSkills.includes(skill)
      ? currentSelectedSkills.filter((s: string) => s !== skill)
      : [...currentSelectedSkills, skill];
    
    setSelectedSkills(prev => ({
      ...prev,
      [currentTask.id]: newSkills,
    }));
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    
    try {
      // Submit all adjustments as training data
      for (const task of tasks) {
        const adjustedSkills = selectedSkills[task.id] || task.skillTags || [];
        const aiSuggestedSkills = task.aiSuggestion?.skills || task.skillTags || [];
        
        // Only submit if there was a change
        const hasChanged = JSON.stringify(adjustedSkills.sort()) !== JSON.stringify(aiSuggestedSkills.sort());
        
        if (hasChanged || adjustedSkills.length > 0) {
          // Update the task
          await apiRequest("PATCH", `/api/tasks/${task.id}`, {
            skillTags: adjustedSkills,
          });

          // Record as training data
          await apiRequest("POST", "/api/tasks/categorize-feedback", {
            taskId: task.id,
            approvedSkills: adjustedSkills,
            aiSuggestedSkills: aiSuggestedSkills,
            isApproved: !hasChanged, // If no changes, it was approved
          });
        }
      }

      toast({
        title: "✓ Skills Updated",
        description: "AI has learned from your adjustments",
      });

      onComplete();
      onOpenChange(false);
      setSelectedSkills({});
      setCurrentIndex(0);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update skills",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedSkills({});
    setCurrentIndex(0);
    onOpenChange(false);
  };

  const handleNext = () => {
    if (currentIndex < tasks.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (!currentTask) return null;

  const aiSuggested = currentTask.aiSuggestion?.skills || currentTask.skillTags || [];
  const hasChanges = JSON.stringify(currentSelectedSkills.sort()) !== JSON.stringify(aiSuggested.sort());

  // Reset swipe state when dialog closes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setSwipeOffsetY(0);
      setSwipeDismissing(false);
      setSwipeTouching(false);
      swipeRef.current = null;
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);

  const swipeStyle: React.CSSProperties = isMobile && (swipeOffsetY > 0 || swipeDismissing)
    ? {
        transform: `translateY(${swipeOffsetY}px)`,
        opacity: swipeDismissing ? 0 : Math.max(0.3, 1 - swipeOffsetY / (window.innerHeight * 0.6)),
        transition: swipeTouching ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0, 0, 1), opacity 0.3s ease',
      }
    : {};

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700"
        style={swipeStyle}
      >
        {/* Mobile grab handle */}
        {isMobile && (
          <div ref={swipeCallbackRef} className="flex justify-center pt-1 pb-2 -mt-2 cursor-grab">
            <div className="w-10 h-1 rounded-full bg-slate-500/60" />
          </div>
        )}

        <DialogHeader>
          <DialogTitle className="text-2xl text-yellow-100 flex items-center justify-between">
            <span>Adjust Skill Tags</span>
            {tasks.length > 1 && (
              <span className="text-base text-yellow-400/80 font-normal">
                Task {currentIndex + 1} of {tasks.length}
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Review and adjust the AI's categorization. Your changes will help train the AI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress */}
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>Task {currentIndex + 1} of {tasks.length}</span>
            {hasChanges && (
              <Badge variant="outline" className="bg-yellow-900/30 text-yellow-200 border-yellow-600/40">
                Modified
              </Badge>
            )}
          </div>

          {/* Task Info - condensed with fixed height */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-1">
              {currentTask.title}
            </h3>
            {currentTask.details && (
              <p className="text-sm text-slate-400 max-h-[60px] overflow-hidden line-clamp-3">{currentTask.details}</p>
            )}
          </div>

          {/* AI Suggestion */}
          {currentTask.aiSuggestion && (
            <div className="bg-blue-900/20 border border-blue-700/40 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Brain className="w-4 h-4 text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-blue-300 font-medium mb-1">AI Suggested:</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {aiSuggested.map((skill: string) => {
                      const Icon = SKILL_ICONS[skill];
                      return (
                        <Badge key={skill} variant="outline" className="bg-blue-900/40 text-blue-200 border-blue-600/40">
                          {Icon && <Icon className="w-3 h-3 mr-1" />}
                          {skill}
                        </Badge>
                      );
                    })}
                  </div>
                  {currentTask.aiSuggestion.reasoning && (
                    <p className="text-xs text-slate-400 italic max-h-[40px] overflow-hidden line-clamp-2">
                      "{currentTask.aiSuggestion.reasoning}"
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Skill Selection */}
          <div>
            <p className="text-sm font-medium text-slate-300 mb-3">
              Select the correct skills for this task:
            </p>
            {skillsLoading ? (
              <div className="h-[200px] flex items-center justify-center text-slate-400">
                Loading skills...
              </div>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="grid grid-cols-2 gap-2">
                  {allSkills.map((skill) => {
                    const Icon = getSkillIconComponent(skill);
                    const isSelected = currentSelectedSkills.includes(skill.skillName);
                    
                    return (
                      <div
                        key={skill.id}
                        onClick={() => toggleSkill(skill.skillName)}
                        className={`
                          flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all
                          ${isSelected
                            ? 'bg-emerald-900/30 border-emerald-600/40 text-emerald-200'
                            : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50'
                          }
                        `}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSkill(skill.skillName)}
                          className="pointer-events-none"
                        />
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium flex-1">{skill.skillName}</span>
                        {skill.isCustom && (
                          <Badge variant="outline" className="text-[10px] bg-purple-900/30 border-purple-600/40 text-purple-300">
                            Custom
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="border-slate-500 text-slate-200 hover:bg-slate-700 hover:text-white disabled:opacity-40"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={handleNext}
              disabled={currentIndex === tasks.length - 1}
              className="border-slate-500 text-slate-200 hover:bg-slate-700 hover:text-white disabled:opacity-40"
            >
              Next
            </Button>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              className="border-yellow-600/50 text-yellow-200 hover:bg-yellow-600/20 hover:text-yellow-100"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isSubmitting ? "Saving..." : `Confirm ${Object.keys(selectedSkills).length > 0 ? '& Train AI' : ''}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
