import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export interface TaskWithSuggestion {
  id: number;
  title: string;
  details?: string;
  skillTags: string[] | null;
  aiSuggestion?: {
    skills: string[];
    reasoning: string;
  };
}

interface CategorizationFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: TaskWithSuggestion[];
  onFeedbackComplete: () => void;
}

const AVAILABLE_SKILLS = [
  "Craftsman",
  "Artist",
  "Mindset",
  "Merchant",
  "Physical",
  "Scholar",
  "Health",
  "Connector",
  "Charisma",
];

export function CategorizationFeedbackModal({
  open,
  onOpenChange,
  tasks,
  onFeedbackComplete,
}: CategorizationFeedbackModalProps) {
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [showSkillSelector, setShowSkillSelector] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<Set<number>>(new Set());

  const currentTask = tasks[currentIndex];

  const handleApprove = async () => {
    if (!currentTask?.aiSuggestion) return;

    try {
      await apiRequest("POST", "/api/tasks/categorize-feedback", {
        taskId: currentTask.id,
        approvedSkills: currentTask.aiSuggestion.skills,
        aiSuggestedSkills: currentTask.aiSuggestion.skills,
        isApproved: true,
      });

      setFeedbackSubmitted(prev => new Set(prev).add(currentTask.id));
      
      toast({
        title: "✓ Feedback saved",
        description: "AI will learn from this approval",
      });

      moveToNext();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save feedback",
        variant: "destructive",
      });
    }
  };

  const handleReject = () => {
    setSelectedSkills(currentTask?.aiSuggestion?.skills || []);
    setShowSkillSelector(true);
  };

  const handleCorrect = async () => {
    if (!currentTask?.aiSuggestion || selectedSkills.length === 0) {
      toast({
        title: "No skills selected",
        description: "Please select at least one skill",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest("POST", "/api/tasks/categorize-feedback", {
        taskId: currentTask.id,
        approvedSkills: selectedSkills,
        aiSuggestedSkills: currentTask.aiSuggestion.skills,
        isApproved: false,
      });

      setFeedbackSubmitted(prev => new Set(prev).add(currentTask.id));
      
      toast({
        title: "✓ Correction saved",
        description: "AI will learn from this correction",
      });

      setShowSkillSelector(false);
      setSelectedSkills([]);
      moveToNext();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save correction",
        variant: "destructive",
      });
    }
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const moveToNext = () => {
    if (currentIndex < tasks.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowSkillSelector(false);
      setSelectedSkills([]);
    } else {
      // All done
      onFeedbackComplete();
      handleClose();
    }
  };

  const handleSkip = () => {
    moveToNext();
  };

  const handleClose = () => {
    setCurrentIndex(0);
    setShowSkillSelector(false);
    setSelectedSkills([]);
    setFeedbackSubmitted(new Set());
    onOpenChange(false);
  };

  if (!currentTask) return null;

  const tasksWithSuggestions = tasks.filter(t => t.aiSuggestion);
  const progressText = `${currentIndex + 1} of ${tasksWithSuggestions.length}`;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-yellow-400">
            🤖 Review AI Categorization
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Help train the AI by approving or correcting these suggestions ({progressText})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Task Info */}
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <h3 className="font-semibold text-white mb-1">{currentTask.title}</h3>
            {currentTask.details && (
              <p className="text-sm text-gray-400 mb-3">{currentTask.details}</p>
            )}
          </div>

          {/* AI Suggestion */}
          {currentTask.aiSuggestion && !showSkillSelector && (
            <div className="bg-blue-950 rounded-lg p-4 border border-blue-800">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-200 mb-2">
                    AI Suggested Skills:
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {currentTask.aiSuggestion.skills.map((skill) => (
                      <Badge
                        key={skill}
                        className="bg-blue-600 text-white border-blue-500"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-blue-300 italic">
                    "{currentTask.aiSuggestion.reasoning}"
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Skill Selector (when correcting) */}
          {showSkillSelector && (
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <p className="text-sm font-medium text-white mb-3">
                Select the correct skills:
              </p>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {AVAILABLE_SKILLS.map((skill) => (
                    <div key={skill} className="flex items-center space-x-2">
                      <Checkbox
                        id={skill}
                        checked={selectedSkills.includes(skill)}
                        onCheckedChange={() => toggleSkill(skill)}
                      />
                      <label
                        htmlFor={skill}
                        className="text-sm text-gray-300 cursor-pointer"
                      >
                        {skill}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!showSkillSelector ? (
              <>
                <Button
                  onClick={handleApprove}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Correct
                </Button>
                <Button
                  onClick={handleReject}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Needs Correction
                </Button>
                <Button
                  onClick={handleSkip}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Skip
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleCorrect}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={selectedSkills.length === 0}
                >
                  Save Correction
                </Button>
                <Button
                  onClick={() => {
                    setShowSkillSelector(false);
                    setSelectedSkills([]);
                  }}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>

          {/* Progress indicator */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              {feedbackSubmitted.size} feedback{feedbackSubmitted.size !== 1 ? 's' : ''} submitted this session
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
