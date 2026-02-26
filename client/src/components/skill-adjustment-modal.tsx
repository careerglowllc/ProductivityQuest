import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedSkills, setSelectedSkills] = useState<Record<number, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700">
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
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={handleNext}
              disabled={currentIndex === tasks.length - 1}
            >
              Next
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? "Saving..." : `Confirm ${Object.keys(selectedSkills).length > 0 ? '& Train AI' : ''}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
