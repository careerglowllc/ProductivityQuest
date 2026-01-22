import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { 
  Brain, Wrench, Palette, Briefcase, Sword, Book, Activity, Network, Users,
  Heart, Trophy, Target, Star, Zap, Sparkles, Crown, Mountain, Gem, Flame,
  Handshake, Hand, ThumbsUp, ThumbsDown, CircleDot, Waves, Coffee, Rocket,
  Lightbulb, Code, Music, Camera, Dumbbell, Leaf, Globe, Shield, Hammer, Compass
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface AddSkillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (skillData: {
    skillName: string;
    skillIcon: string;
    skillDescription: string;
    skillMilestones: string[];
    level: number;
  }) => Promise<void>;
}

// Available icon options with their components
const ICON_OPTIONS: Record<string, LucideIcon> = {
  Brain,
  Wrench,
  Palette,
  Briefcase,
  Sword,
  Book,
  Activity,
  Network,
  Users,
  Heart,
  Trophy,
  Target,
  Star,
  Zap,
  Sparkles,
  Crown,
  Mountain,
  Gem,
  Flame,
  Handshake,
  Hand,
  ThumbsUp,
  ThumbsDown,
  CircleDot,
  Waves,
  Coffee,
  Rocket,
  Lightbulb,
  Code,
  Music,
  Camera,
  Dumbbell,
  Leaf,
  Globe,
  Shield,
  Hammer,
  Compass
};

export function AddSkillModal({ open, onOpenChange, onSubmit }: AddSkillModalProps) {
  const [skillName, setSkillName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("Star");
  const [skillDescription, setSkillDescription] = useState("");
  const [milestone1, setMilestone1] = useState("");
  const [milestone2, setMilestone2] = useState("");
  const [milestone3, setMilestone3] = useState("");
  const [level, setLevel] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!skillName.trim()) {
      alert("Please enter a skill name");
      return;
    }

    if (!skillDescription.trim()) {
      alert("Please enter a skill description");
      return;
    }

    const milestones = [milestone1, milestone2, milestone3].filter(m => m.trim());

    setIsSubmitting(true);
    try {
      await onSubmit({
        skillName: skillName.trim(),
        skillIcon: selectedIcon,
        skillDescription: skillDescription.trim(),
        skillMilestones: milestones,
        level
      });

      // Reset form
      setSkillName("");
      setSelectedIcon("Star");
      setSkillDescription("");
      setMilestone1("");
      setMilestone2("");
      setMilestone3("");
      setLevel(1);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating skill:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Custom Skill</DialogTitle>
          <DialogDescription>
            Design your own skill to track and level up. Custom skills will appear in your spider chart,
            skill menu, and can be used with AI task categorization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Skill Name */}
          <div className="space-y-2">
            <Label htmlFor="skillName">Skill Name*</Label>
            <Input
              id="skillName"
              placeholder="e.g., Cooking, Photography, Leadership"
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              maxLength={30}
            />
          </div>

          {/* Icon Picker */}
          <div className="space-y-2">
            <Label>Choose Icon*</Label>
            <div className="grid grid-cols-10 gap-2">
              {Object.entries(ICON_OPTIONS).map(([name, Icon]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedIcon(name)}
                  className={`p-3 rounded-lg border-2 transition-all hover:scale-110 ${
                    selectedIcon === name
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-purple-300"
                  }`}
                >
                  <Icon className={`w-6 h-6 ${selectedIcon === name ? "text-purple-600" : "text-gray-600"}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description*</Label>
            <Textarea
              id="description"
              placeholder="Explain what this skill represents, when to use it, and what activities develop it. This helps the AI categorize tasks correctly."
              value={skillDescription}
              onChange={(e) => setSkillDescription(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-gray-500">
              {skillDescription.length}/500 characters
            </p>
          </div>

          {/* Starting Level */}
          <div className="space-y-2">
            <Label htmlFor="level">Starting Level</Label>
            <Input
              id="level"
              type="number"
              min={1}
              max={99}
              value={level}
              onChange={(e) => setLevel(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
            />
          </div>

          {/* Milestones (Optional) */}
          <div className="space-y-2">
            <Label>Milestones (Optional)</Label>
            <p className="text-sm text-gray-500 mb-2">
              Define what mastery looks like at different levels
            </p>
            <Input
              placeholder="Level 10 milestone (e.g., 'Beginner: Can cook 5 meals')"
              value={milestone1}
              onChange={(e) => setMilestone1(e.target.value)}
              maxLength={100}
              className="mb-2"
            />
            <Input
              placeholder="Level 25 milestone (e.g., 'Intermediate: Can improvise recipes')"
              value={milestone2}
              onChange={(e) => setMilestone2(e.target.value)}
              maxLength={100}
              className="mb-2"
            />
            <Input
              placeholder="Level 99 milestone (e.g., 'Master Chef: Professional level')"
              value={milestone3}
              onChange={(e) => setMilestone3(e.target.value)}
              maxLength={100}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Skill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
