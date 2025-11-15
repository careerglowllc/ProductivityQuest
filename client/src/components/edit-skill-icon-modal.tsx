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
import { Label } from "@/components/ui/label";
import { 
  Brain, Wrench, Palette, Briefcase, Sword, Book, Activity, Network, Users,
  Heart, Trophy, Target, Star, Zap, Sparkles, Crown, Mountain, Gem, Flame,
  Handshake, Hand, ThumbsUp, ThumbsDown, CircleDot, Waves, Coffee, Rocket,
  Lightbulb, Code, Music, Camera, Dumbbell, Leaf, Globe, Shield, Hammer
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface EditSkillIconModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skillName: string;
  currentIcon: string;
  onSubmit: (newIcon: string) => Promise<void>;
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
  Hammer
};

export function EditSkillIconModal({ open, onOpenChange, skillName, currentIcon, onSubmit }: EditSkillIconModalProps) {
  const [selectedIcon, setSelectedIcon] = useState(currentIcon);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(selectedIcon);
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating skill icon:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 border-2 border-yellow-600/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-yellow-100">
            Change Icon for {skillName}
          </DialogTitle>
          <DialogDescription className="text-yellow-200/70">
            Select a new icon for this skill. It will update everywhere including the spider chart.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-yellow-200">Choose Icon*</Label>
            <div className="grid grid-cols-8 gap-2 p-4 bg-slate-800/30 rounded-lg border border-yellow-600/20">
              {Object.entries(ICON_OPTIONS).map(([iconName, IconComponent]) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setSelectedIcon(iconName)}
                  className={`
                    p-3 rounded-lg border-2 transition-all hover:scale-110
                    ${selectedIcon === iconName
                      ? 'border-purple-500 bg-purple-600/30 shadow-lg shadow-purple-500/50'
                      : 'border-yellow-600/20 bg-slate-700/30 hover:border-yellow-500/40'
                    }
                  `}
                >
                  <IconComponent className="h-6 w-6 text-yellow-100" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-yellow-600/30 text-yellow-200 hover:bg-slate-700/50"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white border-2 border-purple-400"
          >
            {isSubmitting ? "Updating..." : "Update Icon"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
