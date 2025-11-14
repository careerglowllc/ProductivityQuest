import {
  Brain, Wrench, Palette, Briefcase, Sword, Book, Activity, Network, Users,
  Heart, Trophy, Target, Star, Zap, Sparkles, Crown, Mountain, Gem, Flame
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const SKILL_ICON_MAP: Record<string, LucideIcon> = {
  // Default skill icons
  Brain,
  Wrench,
  Palette,
  Briefcase,
  Sword,
  Book,
  Activity,
  Network,
  Users,
  // Additional custom skill icons
  Heart,
  Trophy,
  Target,
  Star,
  Zap,
  Sparkles,
  Crown,
  Mountain,
  Gem,
  Flame
};

export function getSkillIcon(iconName: string | null | undefined): LucideIcon {
  if (!iconName) return Star; // Default fallback
  return SKILL_ICON_MAP[iconName] || Star;
}
