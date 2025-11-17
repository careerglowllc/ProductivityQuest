import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddSkillModal } from "@/components/add-skill-modal";
import { EditSkillIconModal } from "@/components/edit-skill-icon-modal";
import { WhySkillsModal } from "@/components/why-skills-modal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { getSkillIcon } from "@/lib/skillIcons";
import type { UserProgress, UserSkill } from "@/../../shared/schema";
import { 
  Wrench, 
  Palette, 
  Brain, 
  Briefcase, 
  Sword, 
  Book, 
  Activity, 
  Network, 
  Users,
  Crown,
  Star,
  Grid3x3,
  List,
  Plus,
  Trash2,
  Edit,
  HelpCircle,
  Compass,
  Sparkles
} from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import type { LucideIcon } from "lucide-react";

const skillDescriptions = {
  Craftsman: {
    description: "The path of creation through hands and tools. This skill represents your ability to build, repair, and craft physical objects in the real world.",
    level10: "Amateur hobbyist who can handle basic DIY projects, simple repairs, and follows instructions for basic builds. Comfortable with common hand tools.",
    level30: "Skilled craftsperson with 5+ years experience. Can tackle complex projects, custom furniture, home renovations, and advanced woodworking or metalwork.",
    level50: "Master artisan - professional level expertise across multiple crafts. Creates custom pieces, teaches others, and can build virtually anything from raw materials.",
    level99: "Legendary master craftsman - world-renowned for exceptional work. Creates museum-quality pieces, innovates new techniques, and inspires generations of artisans."
  },
  Artist: {
    description: "Creative expression through visual arts, music, writing, or performance. This represents your artistic abilities and creative output in the real world.",
    level10: "Beginner artist exploring different mediums. Can create basic sketches, compositions, or performances with proper guidance and practice.",
    level30: "Accomplished artist with distinct style. Creates compelling work regularly, may sell pieces or perform publicly. 5+ years of dedicated practice.",
    level50: "Master artist with professional recognition. Exhibits/performs at high levels, has developed unique artistic voice, potentially makes living from art.",
    level99: "Legendary artist whose work transcends time. Creates masterpieces that define movements, inspires millions, and leaves an indelible mark on culture."
  },
  Mindset: {
    description: "The art of mental transformation - converting struggles and life circumstances into positive, enabling mindsets. This skill represents your ability to transmute challenges into growth, manage emotions, and maintain inner peace.",
    level10: "Beginner mindset shifter - learning to reframe negative thoughts, practicing gratitude, and developing awareness of mental patterns. Can catch and redirect some negative thinking.",
    level30: "Skilled mental alchemist - consistently transforms setbacks into opportunities. Has developed strong positive thinking habits, resilience practices, and helps others shift their perspectives. 5+ years of intentional mindset work.",
    level50: "Master of mental transformation - unshakeable positive mindset despite adversity. Expert at converting any struggle into fuel for growth, turning negative emotions into positive energy. Teaches others advanced mindset techniques and maintains peak mental state.",
    level99: "Transcendent master - legendary mental mastery that inspires worldwide transformation. Converts any darkness into light, maintains peaceful mind in any circumstance, radiates unwavering positivity, and elevates collective consciousness."
  },
  Merchant: {
    description: "Business acumen, negotiation, sales, and wealth building. Your ability to create value, close deals, and build financial success in the real world.",
    level10: "Learning business basics - can make small sales, understand simple negotiations, starting to build financial literacy.",
    level30: "Successful entrepreneur or sales professional. Closed significant deals, built profitable ventures, strong network. Consistent income growth over 5 years.",
    level50: "Business titan - multiple successful ventures, masterful negotiator, significant wealth built. Industry respected dealmaker and wealth creator.",
    level99: "Legendary magnate - reshapes industries, builds empires, creates generational wealth. Name recognized globally as a business icon and visionary."
  },
  Physical: {
    description: "Complete physical mastery - martial arts, strength training, firearm proficiency, and cardiovascular endurance. This represents your real-world combat ability, physical power, and tactical fitness.",
    level10: "Physical beginner - basic martial arts or self-defense training, starting strength program, learning firearm basics, building cardio base. Knows fundamental techniques across multiple domains.",
    level30: "Well-rounded physical practitioner - 5+ years training in martial arts, solid strength stats (intermediate lifting numbers), firearm proficiency, good cardio endurance. Competent across multiple physical disciplines.",
    level50: "Elite physical specimen - advanced martial arts skills, exceptional strength (advanced powerlifting/bodybuilding), expert marksman, and superior cardiovascular capacity. Military/LEO/pro athlete level across all domains.",
    level99: "Legendary warrior - peak human physical capability across all dimensions. World-class martial artist, exceptional strength athlete, expert tactical operator. A living weapon and inspiration."
  },
  Scholar: {
    description: "Academic knowledge, research ability, continuous learning, and intellectual mastery. Your real-world education and expertise in various fields.",
    level10: "Curious learner - reads regularly, takes courses, builds knowledge in areas of interest. Understands how to research and learn effectively.",
    level30: "Expert in multiple domains - advanced degrees or equivalent self-education. Published work, teaches others, recognized knowledge in specialized fields.",
    level50: "Polymath genius - PhD-level expertise in multiple fields, published researcher, or recognized thought leader. Lifetime dedication to learning and teaching.",
    level99: "Legendary polymath - world-renowned intellectual whose contributions advance human knowledge. Nobel-level achievements, revolutionary ideas, and timeless wisdom."
  },
  Health: {
    description: "Physical and biological health optimization - nutrition, sleep, recovery, longevity practices, and overall bodily wellness. This represents your commitment to maintaining optimal health.",
    level10: "Health-conscious beginner - learning nutrition basics, improving sleep hygiene, regular check-ups, building healthy daily habits. Understands fundamental health principles.",
    level30: "Health optimizer - 5+ years of consistent healthy practices. Excellent nutrition habits, quality sleep routine, preventive care, stress management. Tracks and optimizes key health metrics.",
    level50: "Health mastery - optimal biological health across all markers. Expert-level nutrition knowledge, perfect sleep, longevity protocols, potentially biohacks. Doctor-level understanding of personal health optimization.",
    level99: "Legendary vitality - peak biological optimization that defies aging. Perfect health markers, longevity mastery, biohacking pioneer. Living example of human health potential."
  },
  Athlete: {
    description: "Physical fitness, sports performance, endurance, and athletic ability. Your real-world strength, speed, agility, and physical conditioning.",
    level10: "Active beginner - exercises regularly, plays recreational sports, building fitness foundation and athletic skills.",
    level30: "Serious athlete - competes in sports/events, 5+ years consistent training, impressive physical stats, may coach others. Strong and capable.",
    level50: "Elite athlete - professional or Olympic-level performance. Peak physical condition, competition winner, or extreme athletic achievements.",
    level99: "Legendary champion - world record holder, Olympic gold medalist level. Name etched in sports history as one of the greatest athletes of all time."
  },
  Connector: {
    description: "Building and maintaining meaningful relationships - your network strength, deep friendships, and ability to foster genuine connections. This represents your social capital and relationship quality.",
    level10: "Relationship builder - actively nurturing friendships, expanding network, learning to maintain connections. Has 10-20 meaningful relationships and growing.",
    level30: "Master networker - extensive network of 50+ genuine connections, maintains deep friendships, regularly brings people together. 5+ years of intentional relationship building. Known as a connector in your circles.",
    level50: "Legendary connector - world-class network spanning hundreds of deep relationships. Effortlessly maintains connections, creates powerful introductions, and builds communities. Your network is your superpower.",
    level99: "Transcendent connector - legendary relationship mastery spanning thousands of genuine connections worldwide. Unites communities, changes lives through introductions, creates movements."
  },
  Charisma: {
    description: "The art of charm and connection - social influence, communication mastery, leadership presence, and the ability to connect deeply with others. This represents your interpersonal magnetism and social impact.",
    level10: "Socially developing - learning active listening, practicing confident communication, building genuine connections. Can engage in conversations and make people feel heard.",
    level30: "Charismatic communicator - 5+ years of intentional social skill development. Natural networker, compelling speaker, builds rapport easily. People are drawn to your presence and influence.",
    level50: "Master of influence - exceptional charisma and social mastery. Inspirational leader, captivating speaker, builds deep connections effortlessly. Professional-level influence (think Tony Robbins, world-class politicians, or master networkers).",
    level99: "Legendary influencer - transcendent charisma that moves millions. World-stage presence, unparalleled social mastery, and ability to inspire transformative change globally."
  },
  Explorer: {
    description: "The spirit of adventure and discovery - world travel, cultural immersion, trying new experiences, foods, and activities. This represents your commitment to exploring the world and embracing novel experiences.",
    level10: "Curious adventurer - starting to explore beyond comfort zone. Trying new restaurants, local travel, and occasional new experiences. Building courage to explore unfamiliar territory.",
    level30: "Seasoned explorer - 5+ years of intentional exploration. Traveled to 10+ countries/regions, regularly tries new cuisines and activities, embraces cultural differences. Comfortable navigating unfamiliar environments.",
    level50: "Master adventurer - extensive world travel across 30+ countries, deep cultural immersion, fluent in multiple languages, expert at adapting to new environments. Living embodiment of wanderlust and cultural appreciation.",
    level99: "Legendary explorer - visited all continents, mastered cultural navigation worldwide, speaks 5+ languages, and has transformative experiences that inspire others. A true citizen of the world whose adventures reshape perspectives."
  }
};

// Default skill constellation names
const skillConstellations: Record<string, string> = {
  Craftsman: "The Forge",
  Artist: "The Muse",
  Mindset: "The Transmuter",
  Merchant: "The Trader",
  Physical: "The Titan",
  Scholar: "The Sage",
  Health: "The Vitality",
  Connector: "The Bridge",
  Charisma: "The Influencer",
  Explorer: "The Wanderer"
};

// Milestone constellations for each skill
const skillMilestones: Record<string, Array<{ 
  id: string; 
  title: string; 
  level: number;
  x: number; 
  y: number; 
}>> = {
  Explorer: [
    { id: 'start', title: 'Begin Your Journey', level: 1, x: 50, y: 85 },
    { id: 'countries-10', title: 'Visit 10 Countries', level: 10, x: 35, y: 65 },
    { id: 'language-1', title: 'Learn a Second Language', level: 15, x: 65, y: 65 },
    { id: 'immersion-4months', title: 'Spend 4 Months Abroad', level: 20, x: 50, y: 50 },
    { id: 'countries-20', title: 'Visit 20 Countries', level: 30, x: 30, y: 35 },
    { id: 'language-2', title: 'Master Two Languages', level: 35, x: 70, y: 35 },
    { id: 'continents-5', title: 'Visit 5 Continents', level: 50, x: 50, y: 20 },
    { id: 'citizen-world', title: 'Become a Citizen of the World', level: 99, x: 50, y: 5 },
  ],
  Craftsman: [
    { id: 'start', title: 'Pick Up Your Tools', level: 1, x: 50, y: 85 },
    { id: 'project-1', title: 'Complete First Project', level: 5, x: 40, y: 70 },
    { id: 'tools-master', title: 'Master Basic Tools', level: 10, x: 60, y: 70 },
    { id: 'furniture', title: 'Build Custom Furniture', level: 20, x: 35, y: 55 },
    { id: 'workshop', title: 'Set Up Workshop', level: 25, x: 65, y: 55 },
    { id: 'apprentice', title: 'Teach an Apprentice', level: 40, x: 50, y: 40 },
    { id: 'masterwork', title: 'Create a Masterwork', level: 60, x: 40, y: 25 },
    { id: 'legacy', title: 'Leave a Lasting Legacy', level: 99, x: 50, y: 5 },
  ],
  Artist: [
    { id: 'start', title: 'First Creation', level: 1, x: 50, y: 85 },
    { id: 'medium', title: 'Choose Your Medium', level: 5, x: 45, y: 70 },
    { id: 'daily', title: 'Create Daily for 30 Days', level: 10, x: 55, y: 70 },
    { id: 'style', title: 'Develop Unique Style', level: 20, x: 35, y: 55 },
    { id: 'show', title: 'First Public Show', level: 25, x: 65, y: 55 },
    { id: 'sell', title: 'Sell Your Art', level: 35, x: 50, y: 40 },
    { id: 'commission', title: 'Work on Commission', level: 50, x: 40, y: 25 },
    { id: 'inspire', title: 'Inspire Generations', level: 99, x: 50, y: 5 },
  ],
  Mindset: [
    { id: 'start', title: 'Begin Transformation', level: 1, x: 50, y: 85 },
    { id: 'gratitude', title: 'Daily Gratitude Practice', level: 5, x: 40, y: 70 },
    { id: 'reframe', title: 'Master Reframing', level: 10, x: 60, y: 70 },
    { id: 'meditation', title: '100 Days of Meditation', level: 20, x: 35, y: 55 },
    { id: 'resilience', title: 'Unshakeable Resilience', level: 30, x: 65, y: 55 },
    { id: 'teach', title: 'Teach Others', level: 50, x: 50, y: 35 },
    { id: 'mastery', title: 'Peak Mental State', level: 75, x: 45, y: 20 },
    { id: 'transcend', title: 'Transcendent Mastery', level: 99, x: 50, y: 5 },
  ],
  Merchant: [
    { id: 'start', title: 'First Sale', level: 1, x: 50, y: 85 },
    { id: 'revenue-1k', title: '$1,000 in Revenue', level: 5, x: 40, y: 70 },
    { id: 'client-10', title: '10 Repeat Clients', level: 10, x: 60, y: 70 },
    { id: 'revenue-10k', title: '$10,000 Monthly', level: 25, x: 35, y: 55 },
    { id: 'venture', title: 'Launch a Venture', level: 30, x: 65, y: 55 },
    { id: 'revenue-100k', title: '$100,000 Yearly', level: 50, x: 50, y: 40 },
    { id: 'empire', title: 'Build Business Empire', level: 75, x: 45, y: 20 },
    { id: 'legend', title: 'Industry Legend', level: 99, x: 50, y: 5 },
  ],
  Physical: [
    { id: 'start', title: 'Begin Training', level: 1, x: 50, y: 85 },
    { id: 'basics', title: 'Master Basic Techniques', level: 10, x: 40, y: 70 },
    { id: 'strength', title: 'Intermediate Strength', level: 15, x: 60, y: 70 },
    { id: 'martial', title: '3 Years Martial Arts', level: 25, x: 35, y: 55 },
    { id: 'combat', title: 'Advanced Combat Skills', level: 35, x: 65, y: 55 },
    { id: 'elite', title: 'Elite Athlete Status', level: 50, x: 50, y: 40 },
    { id: 'compete', title: 'Competition Ready', level: 70, x: 45, y: 25 },
    { id: 'warrior', title: 'Legendary Warrior', level: 99, x: 50, y: 5 },
  ],
  Scholar: [
    { id: 'start', title: 'Curiosity Awakens', level: 1, x: 50, y: 85 },
    { id: 'read-12', title: 'Read 12 Books/Year', level: 5, x: 40, y: 70 },
    { id: 'domain', title: 'Master One Domain', level: 15, x: 60, y: 70 },
    { id: 'degree', title: 'Advanced Degree', level: 25, x: 35, y: 55 },
    { id: 'publish', title: 'Publish Research', level: 35, x: 65, y: 55 },
    { id: 'expert', title: 'Recognized Expert', level: 50, x: 50, y: 40 },
    { id: 'polymath', title: 'True Polymath', level: 75, x: 45, y: 25 },
    { id: 'wisdom', title: 'Timeless Wisdom', level: 99, x: 50, y: 5 },
  ],
  Health: [
    { id: 'start', title: 'Choose Wellness', level: 1, x: 50, y: 85 },
    { id: 'nutrition', title: 'Nutrition Basics', level: 5, x: 40, y: 70 },
    { id: 'sleep', title: 'Quality Sleep Routine', level: 10, x: 60, y: 70 },
    { id: 'markers', title: 'Optimal Health Markers', level: 25, x: 35, y: 55 },
    { id: 'habits', title: '5 Years Healthy Habits', level: 30, x: 65, y: 55 },
    { id: 'optimize', title: 'Peak Optimization', level: 50, x: 50, y: 40 },
    { id: 'longevity', title: 'Longevity Protocols', level: 75, x: 45, y: 25 },
    { id: 'vitality', title: 'Legendary Vitality', level: 99, x: 50, y: 5 },
  ],
  Connector: [
    { id: 'start', title: 'Build First Connection', level: 1, x: 50, y: 85 },
    { id: 'friends-10', title: '10 Deep Friendships', level: 10, x: 40, y: 70 },
    { id: 'network-50', title: 'Network of 50', level: 20, x: 60, y: 70 },
    { id: 'maintain', title: 'Master Maintaining Bonds', level: 30, x: 35, y: 55 },
    { id: 'introduce', title: 'Make 100 Introductions', level: 40, x: 65, y: 55 },
    { id: 'community', title: 'Build a Community', level: 60, x: 50, y: 35 },
    { id: 'network-500', title: 'Network of 500+', level: 80, x: 45, y: 20 },
    { id: 'connector', title: 'Master Connector', level: 99, x: 50, y: 5 },
  ],
  Charisma: [
    { id: 'start', title: 'First Impression', level: 1, x: 50, y: 85 },
    { id: 'listen', title: 'Active Listening', level: 5, x: 40, y: 70 },
    { id: 'presence', title: 'Confident Presence', level: 10, x: 60, y: 70 },
    { id: 'speak', title: 'Public Speaking', level: 20, x: 35, y: 55 },
    { id: 'influence', title: 'Influence Skills', level: 30, x: 65, y: 55 },
    { id: 'lead', title: 'Lead a Team', level: 50, x: 50, y: 40 },
    { id: 'inspire', title: 'Inspire Hundreds', level: 75, x: 45, y: 25 },
    { id: 'legend', title: 'Legendary Influencer', level: 99, x: 50, y: 5 },
  ],
};

// Default skill icon mapping
const defaultSkillIcons: Record<string, any> = {
  Craftsman: Wrench,
  Artist: Palette,
  Mindset: Brain,
  Merchant: Briefcase,
  Physical: Sword,
  Scholar: Book,
  Health: Activity,
  Connector: Network,
  Charisma: Users,
  Explorer: Compass
};

export default function Skills() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const { data: progress } = useQuery<UserProgress>({
    queryKey: ["/api/progress"],
  });
  
  const { data: skills = [], isLoading } = useQuery<UserSkill[]>({
    queryKey: ["/api/skills"],
  });

  const [selectedSkill, setSelectedSkill] = useState<UserSkill | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'constellation'>('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<UserSkill | null>(null);
  const [showEditIconModal, setShowEditIconModal] = useState(false);
  const [skillToEdit, setSkillToEdit] = useState<UserSkill | null>(null);
  const [showWhySkillsModal, setShowWhySkillsModal] = useState(false);

  const createSkillMutation = useMutation({
    mutationFn: async (skillData: any) => {
      return await apiRequest("POST", "/api/skills/custom", skillData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skills"] });
      toast({
        title: "✓ Custom Skill Created!",
        description: "Your new skill has been added to your constellation.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Skill",
        description: error.message || "Failed to create custom skill",
        variant: "destructive",
      });
    },
  });

  const deleteSkillMutation = useMutation({
    mutationFn: async (skillId: number) => {
      return await apiRequest("DELETE", `/api/skills/${skillId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skills"] });
      toast({
        title: "✓ Skill Deleted",
        description: "The custom skill has been removed from all tasks.",
      });
      setShowDeleteDialog(false);
      setSkillToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error Deleting Skill",
        description: error.message || "Failed to delete skill",
        variant: "destructive",
      });
    },
  });

  const updateSkillIconMutation = useMutation({
    mutationFn: async ({ 
      skillId, 
      icon, 
      level, 
      xp 
    }: { 
      skillId: number; 
      icon: string; 
      level?: number; 
      xp?: number; 
    }) => {
      return await apiRequest("PATCH", `/api/skills/${skillId}/icon`, { icon, level, xp });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "✓ Skill Updated!",
        description: "Skill has been updated successfully.",
      });
      setShowEditIconModal(false);
      setSkillToEdit(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error Updating Skill",
        description: error.message || "Failed to update skill",
        variant: "destructive",
      });
    },
  });

  const handleDeleteSkill = () => {
    if (skillToDelete) {
      deleteSkillMutation.mutate(skillToDelete.id);
    }
  };

  // Helper to get skill icon
  const getSkillIconComponent = (skill: UserSkill) => {
    if (skill.skillIcon) {
      return getSkillIcon(skill.skillIcon);
    }
    return defaultSkillIcons[skill.skillName] || Star;
  };

  // Helper to get constellation name
  const getConstellation = (skill: UserSkill) => {
    if (skill.isCustom) {
      return "Custom Skill";
    }
    return skillConstellations[skill.skillName] || "The Seeker";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center">
        <div className="text-yellow-200 text-xl">Loading skills...</div>
      </div>
    );
  }
  
  return (
    <div className={`min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 ${!isMobile ? 'pt-16' : ''} pb-24 relative overflow-hidden`}>
      {/* Starfield Background Effect */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-10 left-10 w-1 h-1 bg-yellow-200 rounded-full animate-pulse"></div>
        <div className="absolute top-20 right-20 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-40 left-1/4 w-1 h-1 bg-purple-200 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-60 right-1/3 w-1 h-1 bg-yellow-200 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute top-32 right-1/2 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
      </div>

      {/* Header */}
      <div className="relative pt-8 pb-12 px-4 border-b border-yellow-600/30">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Crown className="h-8 w-8 text-yellow-400" />
            <h1 className="text-4xl font-serif font-bold text-yellow-100 tracking-wide">Celestial Skills</h1>
            <Crown className="h-8 w-8 text-yellow-400" />
          </div>
          <p className="text-yellow-200/80 text-lg italic mb-6">Ascend Through the Constellations</p>
          
          {/* Stats and View Toggle */}
          <div className="flex items-center justify-center gap-6 mb-4">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg px-6 py-3 border border-yellow-600/30">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-400" />
                <span className="text-yellow-100 font-semibold">Total XP: {(progress?.tasksCompleted || 0) * 100}</span>
              </div>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-yellow-600/40 border-2 border-yellow-500/60 text-yellow-100'
                  : 'bg-slate-800/30 border-2 border-yellow-600/20 text-yellow-200/60 hover:border-yellow-500/40'
              }`}
            >
              <Grid3x3 className="h-4 w-4" />
              <span className="font-semibold">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('constellation')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                viewMode === 'constellation'
                  ? 'bg-yellow-600/40 border-2 border-yellow-500/60 text-yellow-100'
                  : 'bg-slate-800/30 border-2 border-yellow-600/20 text-yellow-200/60 hover:border-yellow-500/40'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span className="font-semibold">Constellation</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-yellow-600/40 border-2 border-yellow-500/60 text-yellow-100'
                  : 'bg-slate-800/30 border-2 border-yellow-600/20 text-yellow-200/60 hover:border-yellow-500/40'
              }`}
            >
              <List className="h-4 w-4" />
              <span className="font-semibold">List</span>
            </button>
          </div>
          
          {/* Create Custom Skill Button & Why Skills Button */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white border-2 border-purple-400 shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Custom Skill
            </Button>
            
            <Button
              onClick={() => setShowWhySkillsModal(true)}
              variant="outline"
              className="bg-slate-800/50 hover:bg-slate-700/50 text-yellow-200 border-2 border-yellow-600/40 hover:border-yellow-500/60 shadow-lg"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              Why these skills?
            </Button>
          </div>
        </div>
      </div>

      {/* Skills Constellation Grid or List */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {viewMode === 'constellation' ? (
          /* Constellation View */
          <div className="relative w-full h-[800px] bg-slate-900/30 rounded-3xl border-2 border-yellow-600/20 p-8 overflow-hidden">
            {/* Background stars */}
            <div className="absolute inset-0 opacity-20">
              {Array.from({ length: 50 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-yellow-100 rounded-full animate-pulse"
                  style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: `${2 + Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>

            {/* Calculate positions dynamically */}
            {(() => {
              const getNodePositions = (count: number) => {
                if (count === 0) return [];
                
                // Use a more organic constellation layout
                const positions: { x: number; y: number }[] = [];
                const padding = 12; // Percentage padding from edges
                const availableWidth = 100 - (padding * 2);
                const availableHeight = 100 - (padding * 2);
                
                if (count === 1) {
                  positions.push({ x: 50, y: 50 });
                } else if (count === 2) {
                  positions.push({ x: 30, y: 50 });
                  positions.push({ x: 70, y: 50 });
                } else if (count === 3) {
                  positions.push({ x: 50, y: 25 });
                  positions.push({ x: 30, y: 70 });
                  positions.push({ x: 70, y: 70 });
                } else if (count === 4) {
                  positions.push({ x: 30, y: 30 });
                  positions.push({ x: 70, y: 30 });
                  positions.push({ x: 70, y: 70 });
                  positions.push({ x: 30, y: 70 });
                } else if (count <= 6) {
                  // Pentagon/Hexagon arrangement
                  for (let i = 0; i < count; i++) {
                    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
                    const radius = 35;
                    positions.push({
                      x: 50 + radius * Math.cos(angle),
                      y: 50 + radius * Math.sin(angle),
                    });
                  }
                } else if (count <= 10) {
                  // Circular arrangement for 7-10 skills
                  for (let i = 0; i < count; i++) {
                    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
                    const radius = 38;
                    positions.push({
                      x: 50 + radius * Math.cos(angle),
                      y: 50 + radius * Math.sin(angle),
                    });
                  }
                } else {
                  // For more than 10, use a double circle pattern
                  const innerCount = Math.ceil(count / 2);
                  const outerCount = count - innerCount;
                  
                  // Inner circle
                  for (let i = 0; i < innerCount; i++) {
                    const angle = (i / innerCount) * 2 * Math.PI - Math.PI / 2;
                    const radius = 25;
                    positions.push({
                      x: 50 + radius * Math.cos(angle),
                      y: 50 + radius * Math.sin(angle),
                    });
                  }
                  
                  // Outer circle
                  for (let i = 0; i < outerCount; i++) {
                    const angle = (i / outerCount) * 2 * Math.PI - Math.PI / 2;
                    const radius = 40;
                    positions.push({
                      x: 50 + radius * Math.cos(angle),
                      y: 50 + radius * Math.sin(angle),
                    });
                  }
                }
                
                return positions;
              };

              const positions = getNodePositions(skills.length);

              return (
                <>
                  {/* Constellation connections - SVG lines */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
                    {/* Draw lines connecting each node to the next */}
                    {skills.map((skill, index) => {
                      if (index === skills.length - 1) return null; // Skip last one
                      
                      const pos1 = positions[index];
                      const pos2 = positions[index + 1];
                      
                      if (!pos1 || !pos2) return null;
                      
                      return (
                        <line
                          key={`line-${skill.id}`}
                          x1={`${pos1.x}%`}
                          y1={`${pos1.y}%`}
                          x2={`${pos2.x}%`}
                          y2={`${pos2.y}%`}
                          stroke="rgba(250, 204, 21, 0.3)"
                          strokeWidth="2"
                          className="transition-all duration-500"
                        />
                      );
                    })}
                  </svg>

                  {/* Skill nodes */}
                  <div className="relative w-full h-full" style={{ zIndex: 2 }}>
                    {skills.map((skill, index) => {
                      const Icon = getSkillIconComponent(skill);
                      const constellation = getConstellation(skill);
                      const progressPercent = (skill.xp / skill.maxXp) * 100;
                      const pos = positions[index];
                      
                      if (!pos) return null;
                      
                      return (
                        <div
                          key={skill.id}
                          className="absolute group cursor-pointer transition-all duration-500"
                          style={{
                            left: `${pos.x}%`,
                            top: `${pos.y}%`,
                            transform: 'translate(-50%, -50%)',
                          }}
                          onClick={() => setSelectedSkill(skill)}
                        >
                          {/* Glow effect on hover */}
                          <div className="absolute inset-0 -m-8 bg-yellow-400/0 group-hover:bg-yellow-400/20 rounded-full blur-2xl transition-all duration-500" />
                          
                          {/* Node circle */}
                          <div className="relative w-20 h-20 rounded-full border-4 border-yellow-600/40 group-hover:border-yellow-400 bg-slate-800/80 backdrop-blur-sm transition-all duration-300 group-hover:scale-125 overflow-hidden shadow-lg">
                            {/* Progress fill */}
                            <div 
                              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-yellow-600 to-yellow-400 transition-all duration-500"
                              style={{ height: `${progressPercent}%` }}
                            />
                            
                            {/* Icon */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Icon className="h-10 w-10 text-yellow-100 group-hover:text-white drop-shadow-lg transition-all group-hover:scale-110" strokeWidth={2} />
                            </div>
                            
                            {/* Level badge */}
                            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-500 border-2 border-yellow-400 flex items-center justify-center text-slate-900 font-bold text-xs shadow-lg">
                              {skill.level}
                            </div>
                          </div>
                          
                          {/* Skill name tooltip on hover */}
                          <div className="absolute top-24 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50">
                            <div className="bg-slate-900/95 backdrop-blur-md px-4 py-2 rounded-lg border-2 border-yellow-500/60 shadow-xl">
                              <p className="text-yellow-100 font-serif font-bold text-sm">{skill.skillName}</p>
                              <p className="text-yellow-400/70 text-xs italic">{constellation}</p>
                              <p className="text-yellow-300 text-xs mt-1">Level {skill.level} • {Math.round(progressPercent)}% XP</p>
                            </div>
                            {/* Arrow pointing up */}
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900 border-l-2 border-t-2 border-yellow-500/60 rotate-45" />
                          </div>

                          {/* Action buttons on hover */}
                          <div className="absolute -top-4 -right-16 opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-1 z-50">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSkillToEdit(skill);
                                setShowEditIconModal(true);
                              }}
                              className="h-7 w-7 p-0 bg-blue-600/90 hover:bg-blue-700 rounded-full border-2 border-blue-400"
                            >
                              <Edit className="h-3 w-3 text-white" />
                            </Button>
                            
                            {skill.isCustom && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSkillToDelete(skill);
                                  setShowDeleteDialog(true);
                                }}
                                className="h-7 w-7 p-0 bg-red-600/90 hover:bg-red-700 rounded-full border-2 border-red-400"
                              >
                                <Trash2 className="h-3 w-3 text-white" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Center decoration */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
                    <div className="w-16 h-16 rounded-full border-2 border-yellow-600/20 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center">
                      <Crown className="h-8 w-8 text-yellow-400/30" />
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-md px-4 py-3 rounded-lg border border-yellow-600/30 text-xs text-yellow-200/70 z-10">
                    <p className="font-serif italic">Hover over nodes to reveal details</p>
                    <p className="font-serif italic">Click to view full skill information</p>
                  </div>
                </>
              );
            })()}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-3 gap-8">
            {skills.map((skill) => {
              const Icon = getSkillIconComponent(skill);
              const constellation = getConstellation(skill);
              const progressPercent = (skill.xp / skill.maxXp) * 100;
              
              return (
                <div 
                  key={skill.id} 
                  className="relative group cursor-pointer"
                  onClick={() => setSelectedSkill(skill)}
                >
                  {/* Action Buttons */}
                  <div className="absolute -top-2 -right-2 z-10 flex gap-2">
                    {/* Edit Icon Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSkillToEdit(skill);
                        setShowEditIconModal(true);
                      }}
                      className="h-8 w-8 p-0 bg-blue-600/90 hover:bg-blue-700 rounded-full border-2 border-blue-400"
                    >
                      <Edit className="h-4 w-4 text-white" />
                    </Button>
                    
                    {/* Delete Button for Custom Skills */}
                    {skill.isCustom && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSkillToDelete(skill);
                          setShowDeleteDialog(true);
                        }}
                        className="h-8 w-8 p-0 bg-red-600/90 hover:bg-red-700 rounded-full border-2 border-red-400"
                      >
                        <Trash2 className="h-4 w-4 text-white" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Constellation Card */}
                  <Card className="bg-slate-800/40 backdrop-blur-md border-2 border-yellow-600/20 hover:border-yellow-500/60 transition-all duration-500 overflow-hidden">
                    <div className="p-6">
                      {/* Level Badge */}
                      <Badge className="absolute top-3 right-3 bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-900 border-yellow-400 font-bold text-sm px-3 py-1 shadow-lg">
                        Level {skill.level}
                      </Badge>
                      
                      {/* Custom Skill Badge */}
                      {skill.isCustom && (
                        <Badge className="absolute top-3 left-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white border-purple-400 font-bold text-xs px-2 py-1">
                          Custom
                        </Badge>
                      )}

                      {/* Rounded Square Icon with Bottom-to-Top Fill */}
                      <div className="relative w-28 h-28 mx-auto mb-4">
                        {/* Background glow */}
                        <div className="absolute inset-0 bg-yellow-400/10 rounded-2xl blur-xl group-hover:bg-yellow-400/20 transition-all"></div>
                        
                        {/* Icon container - rounded square */}
                        <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-yellow-600/40 group-hover:border-yellow-500/70 transition-all bg-slate-700/30">
                          {/* Gray base (unfilled background) */}
                          <div className="absolute inset-0 bg-gradient-to-b from-slate-600/40 to-slate-700/60"></div>
                          
                          {/* Yellow fill from bottom to top */}
                          <div 
                            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-yellow-600 to-yellow-400 transition-all duration-1000 ease-out"
                            style={{ 
                              height: `${progressPercent}%`,
                              boxShadow: '0 0 20px rgba(250, 204, 21, 0.4)'
                            }}
                          ></div>
                          
                          {/* Icon overlay - always centered and visible */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Icon 
                              className="h-16 w-16 text-slate-900/80 drop-shadow-lg" 
                              strokeWidth={2.5}
                              style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))' }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Constellation Name */}
                      <div className="text-center mb-3">
                        <h3 className="text-xl font-serif font-bold text-yellow-100 mb-1 tracking-wide">
                          {skill.skillName}
                        </h3>
                        <p className="text-xs text-yellow-400/70 italic font-serif">
                          {constellation}
                        </p>
                      </div>

                      {/* XP Display */}
                      <div className="bg-slate-900/50 rounded-lg p-3 border border-yellow-600/20">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-yellow-200/80 font-semibold">{skill.xp} / {skill.maxXp} XP</span>
                          <span className="text-sm text-yellow-400 font-bold">{Math.round(progressPercent)}%</span>
                        </div>
                        
                        <p className="text-center text-xs text-yellow-300/60 font-serif italic">
                          {skill.maxXp - skill.xp} XP to next level
                        </p>
                      </div>
                    </div>

                    {/* Hover glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-yellow-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  </Card>

                  {/* Connecting constellation lines (decorative) */}
                  {skill.id % 3 !== 0 && (
                    <div className="absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-yellow-600/30 to-transparent hidden lg:block"></div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* List View - Two Columns */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {skills.map((skill) => {
              const Icon = getSkillIconComponent(skill);
              const constellation = getConstellation(skill);
              const progressPercent = (skill.xp / skill.maxXp) * 100;
              
              return (
                <Card 
                  key={skill.id}
                  className="bg-slate-800/40 backdrop-blur-md border-2 border-yellow-600/20 hover:border-yellow-500/60 transition-all cursor-pointer overflow-hidden relative"
                  onClick={() => setSelectedSkill(skill)}
                >
                  {/* Action Buttons */}
                  <div className="absolute top-2 right-2 z-10 flex gap-2">
                    {/* Edit Icon Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSkillToEdit(skill);
                        setShowEditIconModal(true);
                      }}
                      className="h-8 w-8 p-0 bg-blue-600/90 hover:bg-blue-700 rounded-full border-2 border-blue-400"
                    >
                      <Edit className="h-4 w-4 text-white" />
                    </Button>
                    
                    {/* Delete Button for Custom Skills */}
                    {skill.isCustom && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSkillToDelete(skill);
                          setShowDeleteDialog(true);
                        }}
                        className="h-8 w-8 p-0 bg-red-600/90 hover:bg-red-700 rounded-full border-2 border-red-400"
                      >
                        <Trash2 className="h-4 w-4 text-white" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-center gap-6">
                      {/* Icon Section */}
                      <div className="relative w-20 h-20 flex-shrink-0">
                        <div className="absolute inset-0 bg-yellow-400/10 rounded-2xl blur-lg"></div>
                        <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-yellow-600/40 bg-slate-700/30">
                          <div className="absolute inset-0 bg-gradient-to-b from-slate-600/40 to-slate-700/60"></div>
                          <div 
                            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-yellow-600 to-yellow-400"
                            style={{ 
                              height: `${progressPercent}%`,
                              boxShadow: '0 0 20px rgba(250, 204, 21, 0.4)'
                            }}
                          ></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Icon 
                              className="h-12 w-12 text-slate-900/80 drop-shadow-lg" 
                              strokeWidth={2.5}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Info Section */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-serif font-bold text-yellow-100 tracking-wide">
                            {skill.skillName}
                          </h3>
                          <Badge className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-900 border-yellow-400 font-bold">
                            Level {skill.level}
                          </Badge>
                        </div>
                        <p className="text-sm text-yellow-400/70 italic font-serif mb-3">
                          {constellation}
                        </p>
                        
                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-yellow-200/80 font-semibold">{skill.xp} / {skill.maxXp} XP</span>
                            <span className="text-yellow-400 font-bold">{Math.round(progressPercent)}%</span>
                          </div>
                          <div className="h-3 bg-slate-900/50 rounded-full overflow-hidden border border-yellow-600/20">
                            <div 
                              className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-1000"
                              style={{ width: `${progressPercent}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-yellow-300/60 font-serif italic">
                            {skill.level >= 99 
                              ? "⭐ Maximum Level ⭐" 
                              : `${skill.maxXp - skill.xp} XP to next level`
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Ancient Tome Info Section */}
        <Card className="mt-12 bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30 overflow-hidden">
          <div className="p-8 relative">
            {/* Decorative corner ornaments */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-yellow-600/50"></div>
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-yellow-600/50"></div>
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-yellow-600/50"></div>
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-yellow-600/50"></div>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-serif font-bold text-yellow-100 mb-2 tracking-wide flex items-center justify-center gap-3">
                <Book className="h-6 w-6 text-yellow-400" />
                The Path of Ascension
                <Book className="h-6 w-6 text-yellow-400" />
              </h2>
              <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-yellow-600/50 to-transparent mx-auto"></div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 text-yellow-100/90 max-w-3xl mx-auto">
              <div className="space-y-3">
                <p className="flex items-start gap-3 font-serif">
                  <Star className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <span>Complete quests to fill your constellation with celestial power</span>
                </p>
                <p className="flex items-start gap-3 font-serif">
                  <Star className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <span>Greater challenges yield more potent experience</span>
                </p>
              </div>
              <div className="space-y-3">
                <p className="flex items-start gap-3 font-serif">
                  <Star className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <span>Maintain daily rituals to multiply thy gains</span>
                </p>
                <p className="flex items-start gap-3 font-serif">
                  <Star className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <span>Unlock divine blessings at milestone levels</span>
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Skill Detail Modal */}
      <Dialog open={!!selectedSkill} onOpenChange={(open) => !open && setSelectedSkill(null)}>
        <DialogContent className="bg-slate-900/95 border-2 border-yellow-600/40 text-yellow-100 max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-yellow-100 flex items-center gap-3">
              {selectedSkill && (
                <>
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-yellow-600/40 bg-slate-800/80">
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-yellow-600 to-yellow-400"
                      style={{ 
                        height: `${(selectedSkill.xp / selectedSkill.maxXp) * 100}%`,
                      }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      {(() => {
                        const Icon = getSkillIconComponent(selectedSkill);
                        return <Icon className="h-6 w-6 text-yellow-100" strokeWidth={2} />;
                      })()}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      {selectedSkill.skillName}
                      <Badge className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-900 border-yellow-400 font-bold text-sm">
                        Level {selectedSkill.level}
                      </Badge>
                    </div>
                    <p className="text-sm text-yellow-400/70 italic font-normal mt-1">{getConstellation(selectedSkill)}</p>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedSkill && (
            <div className="relative w-full h-[600px] bg-slate-900/50 rounded-xl border border-yellow-600/20 mt-4 overflow-hidden">
              {/* Background stars */}
              <div className="absolute inset-0 opacity-20">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-0.5 h-0.5 bg-yellow-100 rounded-full animate-pulse"
                    style={{
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 3}s`,
                      animationDuration: `${2 + Math.random() * 2}s`,
                    }}
                  />
                ))}
              </div>

              {/* Milestone constellation */}
              {(() => {
                const milestones = skillMilestones[selectedSkill.skillName] || skillMilestones.Explorer;
                
                return (
                  <>
                    {/* Connection lines */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
                      {milestones.map((milestone, index) => {
                        if (index === milestones.length - 1) return null;
                        
                        const nextMilestone = milestones[index + 1];
                        const isCompleted = selectedSkill.level >= milestone.level;
                        const isNextCompleted = selectedSkill.level >= nextMilestone.level;
                        
                        return (
                          <line
                            key={`line-${milestone.id}`}
                            x1={`${milestone.x}%`}
                            y1={`${milestone.y}%`}
                            x2={`${nextMilestone.x}%`}
                            y2={`${nextMilestone.y}%`}
                            stroke={isCompleted && isNextCompleted ? "rgba(250, 204, 21, 0.8)" : "rgba(250, 204, 21, 0.2)"}
                            strokeWidth={isCompleted && isNextCompleted ? "3" : "2"}
                            className="transition-all duration-500"
                            style={{
                              filter: isCompleted && isNextCompleted ? 'drop-shadow(0 0 8px rgba(250, 204, 21, 0.6))' : 'none',
                            }}
                          />
                        );
                      })}
                    </svg>

                    {/* Milestone nodes */}
                    <div className="relative w-full h-full" style={{ zIndex: 2 }}>
                      {milestones.map((milestone) => {
                        const isCompleted = selectedSkill.level >= milestone.level;
                        const isCurrentGoal = selectedSkill.level >= (milestone.level - 10) && selectedSkill.level < milestone.level;
                        
                        return (
                          <div
                            key={milestone.id}
                            className="absolute group transition-all duration-500"
                            style={{
                              left: `${milestone.x}%`,
                              top: `${milestone.y}%`,
                              transform: 'translate(-50%, -50%)',
                            }}
                          >
                            {/* Glow for current goal */}
                            {isCurrentGoal && (
                              <div className="absolute inset-0 -m-6 bg-blue-400/20 rounded-full blur-xl animate-pulse" />
                            )}
                            
                            {/* Node circle */}
                            <div className={`relative w-14 h-14 rounded-full border-4 transition-all duration-300 group-hover:scale-110 overflow-hidden ${
                              isCompleted 
                                ? 'border-yellow-400 bg-yellow-600 shadow-lg shadow-yellow-600/50' 
                                : isCurrentGoal
                                ? 'border-blue-400 bg-slate-800/80 shadow-lg shadow-blue-400/50 animate-pulse'
                                : 'border-yellow-600/30 bg-slate-800/60'
                            }`}>
                              {/* Filled background for completed */}
                              {isCompleted && (
                                <div className="absolute inset-0 bg-gradient-to-t from-yellow-600 to-yellow-400" />
                              )}
                              
                              {/* Level badge */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className={`font-bold text-xs ${
                                  isCompleted ? 'text-slate-900' : 'text-yellow-200/80'
                                }`}>
                                  {milestone.level}
                                </span>
                              </div>
                              
                              {/* Checkmark for completed */}
                              {isCompleted && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-slate-900 flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                                    <path d="M5 13l4 4L19 7"></path>
                                  </svg>
                                </div>
                              )}
                            </div>
                            
                            {/* Tooltip with milestone title */}
                            <div className="absolute top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-50">
                              <div className={`px-4 py-2 rounded-lg border-2 shadow-xl ${
                                isCompleted 
                                  ? 'bg-yellow-900/95 border-yellow-500/60 backdrop-blur-md'
                                  : isCurrentGoal
                                  ? 'bg-blue-900/95 border-blue-500/60 backdrop-blur-md'
                                  : 'bg-slate-900/95 border-yellow-600/40 backdrop-blur-md'
                              }`}>
                                <p className={`font-serif font-bold text-sm ${
                                  isCompleted ? 'text-yellow-100' : isCurrentGoal ? 'text-blue-100' : 'text-yellow-200/80'
                                }`}>
                                  {milestone.title}
                                </p>
                                <p className="text-xs text-yellow-400/70 mt-1">
                                  {isCompleted ? '✓ Achieved' : isCurrentGoal ? 'Next Goal' : `Level ${milestone.level}`}
                                </p>
                              </div>
                              {/* Arrow */}
                              <div className={`absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 ${
                                isCompleted 
                                  ? 'bg-yellow-900 border-l-2 border-t-2 border-yellow-500/60'
                                  : isCurrentGoal
                                  ? 'bg-blue-900 border-l-2 border-t-2 border-blue-500/60'
                                  : 'bg-slate-900 border-l-2 border-t-2 border-yellow-600/40'
                              }`} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-md px-4 py-3 rounded-lg border border-yellow-600/30 text-xs z-10">
                      <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-yellow-500 border-2 border-yellow-400"></div>
                          <span className="text-yellow-200/80">Completed</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-slate-700 border-2 border-blue-400 animate-pulse"></div>
                          <span className="text-yellow-200/80">Next Goal</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-slate-800 border-2 border-yellow-600/30"></div>
                          <span className="text-yellow-200/80">Locked</span>
                        </div>
                        <p className="text-yellow-400/60 italic">Hover over nodes for details</p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Add Custom Skill Modal */}
      <AddSkillModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSubmit={async (skillData) => {
          await createSkillMutation.mutateAsync(skillData);
        }}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Skill?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{skillToDelete?.skillName}" and remove it from all tasks.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSkill}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Skill
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Skill Icon Modal */}
      {skillToEdit && (
        <EditSkillIconModal
          open={showEditIconModal}
          onOpenChange={setShowEditIconModal}
          skillName={skillToEdit.skillName}
          currentIcon={skillToEdit.skillIcon || 'Star'}
          currentLevel={skillToEdit.level}
          currentXp={skillToEdit.xp}
          currentMaxXp={skillToEdit.maxXp}
          onSubmit={async (data) => {
            await updateSkillIconMutation.mutateAsync({ 
              skillId: skillToEdit.id, 
              icon: data.icon,
              level: data.level,
              xp: data.xp
            });
          }}
        />
      )}

      {/* Why Skills Modal */}
      <WhySkillsModal 
        open={showWhySkillsModal}
        onClose={() => setShowWhySkillsModal(false)}
      />
    </div>
  );
}

