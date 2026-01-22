import {
  Brain, Wrench, Palette, Briefcase, Sword, Book, Activity, Network, Users,
  Heart, Trophy, Target, Star, Zap, Sparkles, Crown, Mountain, Gem, Flame, Handshake,
  Hand, ThumbsUp, ThumbsDown, CircleDot, Waves, Coffee, Rocket, Lightbulb, Code,
  Music, Camera, Dumbbell, Leaf, Globe, Shield, Hammer, Compass
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
  Handshake,
  Compass,
  // Hand-related icons
  Hand,
  ThumbsUp,
  ThumbsDown,
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
  Flame,
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

export function getSkillIcon(iconName: string | null | undefined): LucideIcon {
  if (!iconName) return Star; // Default fallback
  return SKILL_ICON_MAP[iconName] || Star;
}
