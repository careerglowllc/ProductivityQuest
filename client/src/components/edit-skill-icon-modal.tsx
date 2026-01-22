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
import { Input } from "@/components/ui/input";
import { 
  Brain, Wrench, Palette, Briefcase, Sword, Book, Activity, Network, Users,
  Heart, Trophy, Target, Star, Zap, Sparkles, Crown, Mountain, Gem, Flame,
  Handshake, Hand, ThumbsUp, ThumbsDown, CircleDot, Waves, Coffee, Rocket,
  Lightbulb, Code, Music, Camera, Dumbbell, Leaf, Globe, Shield, Hammer, Compass
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface EditSkillIconModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skillName: string;
  currentIcon: string;
  currentLevel: number;
  currentXp: number;
  currentMaxXp: number;
  onSubmit: (data: { icon: string; level: number; xp: number }) => Promise<void>;
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

export function EditSkillIconModal({ 
  open, 
  onOpenChange, 
  skillName, 
  currentIcon, 
  currentLevel,
  currentXp,
  currentMaxXp,
  onSubmit 
}: EditSkillIconModalProps) {
  const [selectedIcon, setSelectedIcon] = useState(currentIcon);
  const [level, setLevel] = useState(currentLevel);
  const [xp, setXp] = useState(currentXp);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({ icon: selectedIcon, level, xp });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating skill:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 border-2 border-yellow-600/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-yellow-100">
            Edit {skillName}
          </DialogTitle>
          <DialogDescription className="text-yellow-200/70">
            Customize the icon, level, and XP for this skill.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-yellow-200">Choose Icon*</Label>
            <div className="grid grid-cols-8 gap-2 p-4 bg-slate-800/30 rounded-lg border border-yellow-600/20 max-h-64 overflow-y-auto">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level" className="text-yellow-200">Level*</Label>
              <Input
                id="level"
                type="number"
                min="1"
                max="100"
                value={level}
                onChange={(e) => setLevel(parseInt(e.target.value) || 1)}
                className="bg-slate-800/50 border-yellow-600/30 text-yellow-100 focus:border-purple-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="xp" className="text-yellow-200">
                XP (max: {currentMaxXp})
              </Label>
              <Input
                id="xp"
                type="number"
                min="0"
                max={currentMaxXp}
                value={xp}
                onChange={(e) => setXp(parseInt(e.target.value) || 0)}
                className="bg-slate-800/50 border-yellow-600/30 text-yellow-100 focus:border-purple-500"
              />
            </div>
          </div>

          <div className="text-sm text-yellow-200/60 bg-slate-800/30 p-3 rounded-lg border border-yellow-600/20">
            💡 <strong>Tip:</strong> Adjust the level and XP to match your real-world progress. 
            XP fills up to maxXp ({currentMaxXp}) before leveling up.
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
            {isSubmitting ? "Updating..." : "Update Skill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
