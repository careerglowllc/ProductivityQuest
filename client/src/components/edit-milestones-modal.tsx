import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Milestone {
  id: string;
  title: string;
  level?: number; // Optional - milestones are not tied to skill levels
  x: number;
  y: number;
}

interface EditMilestonesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skillName: string;
  currentMilestones: Milestone[];
  onSubmit: (milestones: Milestone[]) => Promise<void>;
}

export function EditMilestonesModal({
  open,
  onOpenChange,
  skillName,
  currentMilestones,
  onSubmit,
}: EditMilestonesModalProps) {
  const [milestones, setMilestones] = useState<Milestone[]>(currentMilestones);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMilestones(currentMilestones);
  }, [currentMilestones, open]);

  const handleAddMilestone = () => {
    const newId = `milestone-${Date.now()}`;
    const newMilestone: Milestone = {
      id: newId,
      title: "New Milestone",
      x: 50,
      y: 50,
    };
    setMilestones([...milestones, newMilestone]);
  };

  const handleRemoveMilestone = (id: string) => {
    setMilestones(milestones.filter((m) => m.id !== id));
  };

  const handleUpdateMilestone = (
    id: string,
    field: keyof Milestone,
    value: string | number
  ) => {
    setMilestones(
      milestones.map((m) =>
        m.id === id
          ? {
              ...m,
              [field]:
                field === "level" || field === "x" || field === "y"
                  ? Number(value)
                  : value,
            }
          : m
      )
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Sort by y position (top to bottom) before submitting
      const sortedMilestones = [...milestones].sort((a, b) => a.y - b.y);
      await onSubmit(sortedMilestones);
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating milestones:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setMilestones(currentMilestones);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-2 border-yellow-600/40 text-yellow-100 max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-yellow-100">
            Edit {skillName} Milestones
          </DialogTitle>
          <DialogDescription className="text-yellow-200/70">
            Customize your constellation path. Each milestone represents a goal at a specific level.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {milestones.map((milestone, index) => (
            <div
              key={milestone.id}
              className="bg-slate-900/50 rounded-lg p-4 border border-yellow-600/20 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-yellow-400/50" />
                  <Badge className="bg-yellow-600/40 text-yellow-100 border-yellow-500/50">
                    Node {index + 1}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMilestone(milestone.id)}
                  className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/30"
                  disabled={milestones.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-yellow-200/80 text-sm">Milestone Title</Label>
                  <Input
                    value={milestone.title}
                    onChange={(e) =>
                      handleUpdateMilestone(milestone.id, "title", e.target.value)
                    }
                    className="bg-slate-700/50 border-yellow-600/30 text-yellow-100 mt-1"
                    placeholder="e.g., Visit 10 Countries"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-yellow-200/80 text-sm">X Position (%)</Label>
                    <Input
                      type="number"
                      min="10"
                      max="90"
                      value={milestone.x}
                      onChange={(e) =>
                        handleUpdateMilestone(milestone.id, "x", e.target.value)
                      }
                      className="bg-slate-700/50 border-yellow-600/30 text-yellow-100 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-yellow-200/80 text-sm">Y Position (%)</Label>
                    <Input
                      type="number"
                      min="5"
                      max="90"
                      value={milestone.y}
                      onChange={(e) =>
                        handleUpdateMilestone(milestone.id, "y", e.target.value)
                      }
                      className="bg-slate-700/50 border-yellow-600/30 text-yellow-100 mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Button
            onClick={handleAddMilestone}
            variant="outline"
            className="w-full bg-slate-800/50 hover:bg-slate-700/50 text-yellow-200 border-yellow-600/40 hover:border-yellow-500/60"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Milestone
          </Button>
        </div>

        <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3 text-xs text-blue-200/80">
          <p className="font-semibold mb-1">💡 Tips:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Milestones will be connected in order by level</li>
            <li>Lower Y values = higher on screen (start at bottom ~85, end at top ~5)</li>
            <li>X and Y are percentages of the constellation space</li>
            <li>You can create branching paths by placing nodes at similar Y levels</li>
          </ul>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleReset}
            className="bg-slate-700/50 hover:bg-slate-600/50 text-yellow-200 border-yellow-600/40"
          >
            Reset
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || milestones.length === 0}
            className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-slate-900 font-semibold"
          >
            {isSubmitting ? "Saving..." : "Save Milestones"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
