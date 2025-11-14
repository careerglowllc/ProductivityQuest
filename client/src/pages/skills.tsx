import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddSkillModal } from "@/components/add-skill-modal";
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
  Trash2
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
  Charisma: "The Influencer"
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
  Charisma: Users
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<UserSkill | null>(null);

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
          
          {/* Create Custom Skill Button */}
          <div className="flex items-center justify-center mt-4">
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white border-2 border-purple-400 shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Custom Skill
            </Button>
          </div>
        </div>
      </div>

      {/* Skills Constellation Grid or List */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {viewMode === 'grid' ? (
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
                      className="absolute -top-2 -right-2 z-10 h-8 w-8 p-0 bg-red-600/90 hover:bg-red-700 rounded-full border-2 border-red-400"
                    >
                      <Trash2 className="h-4 w-4 text-white" />
                    </Button>
                  )}
                  
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
                  className="bg-slate-800/40 backdrop-blur-md border-2 border-yellow-600/20 hover:border-yellow-500/60 transition-all cursor-pointer overflow-hidden"
                  onClick={() => setSelectedSkill(skill)}
                >
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
        <DialogContent className="bg-slate-800 border-2 border-yellow-600/40 text-yellow-100 max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-yellow-100 flex items-center gap-3">
              {selectedSkill && (
                <>
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-yellow-600/40 bg-slate-700/30">
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-600/40 to-slate-700/60"></div>
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-yellow-600 to-yellow-400"
                      style={{ 
                        height: `${(selectedSkill.xp / selectedSkill.maxXp) * 100}%`,
                      }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      {(() => {
                        const Icon = getSkillIconComponent(selectedSkill);
                        return <Icon className="h-10 w-10 text-slate-900/80" strokeWidth={2.5} />;
                      })()}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      {selectedSkill.skillName}
                      <Badge className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-900 border-yellow-400 font-bold">
                        Level {selectedSkill.level}
                      </Badge>
                    </div>
                    <p className="text-sm text-yellow-400/70 italic font-normal mt-1">{getConstellation(selectedSkill)}</p>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedSkill && skillDescriptions[selectedSkill.skillName as keyof typeof skillDescriptions] && (
            <div className="space-y-6 mt-4">
              {/* Description */}
              <div className="bg-slate-900/50 rounded-lg p-4 border border-yellow-600/20">
                <p className="text-yellow-200/90 font-serif leading-relaxed">
                  {skillDescriptions[selectedSkill.skillName as keyof typeof skillDescriptions].description}
                </p>
              </div>

              {/* Level Milestones */}
              <div className="space-y-4">
                <h3 className="text-lg font-serif font-bold text-yellow-400 flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Mastery Milestones
                </h3>

                {/* Level 10 */}
                <div className="bg-slate-900/30 rounded-lg p-4 border-l-4 border-blue-500/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-blue-900/40 text-blue-200 border border-blue-600/40">Level 10</Badge>
                    <span className="text-sm text-blue-200/70 font-serif italic">Novice</span>
                  </div>
                  <p className="text-yellow-200/80 text-sm leading-relaxed">
                    {skillDescriptions[selectedSkill.skillName as keyof typeof skillDescriptions].level10}
                  </p>
                </div>

                {/* Level 30 */}
                <div className="bg-slate-900/30 rounded-lg p-4 border-l-4 border-purple-500/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-purple-900/40 text-purple-200 border border-purple-600/40">Level 30</Badge>
                    <span className="text-sm text-purple-200/70 font-serif italic">Expert</span>
                  </div>
                  <p className="text-yellow-200/80 text-sm leading-relaxed">
                    {skillDescriptions[selectedSkill.skillName as keyof typeof skillDescriptions].level30}
                  </p>
                </div>

                {/* Level 50 */}
                <div className="bg-slate-900/30 rounded-lg p-4 border-l-4 border-yellow-500/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-yellow-900/40 text-yellow-200 border border-yellow-600/40">Level 50</Badge>
                    <span className="text-sm text-yellow-200/70 font-serif italic">Grandmaster</span>
                  </div>
                  <p className="text-yellow-200/80 text-sm leading-relaxed">
                    {skillDescriptions[selectedSkill.skillName as keyof typeof skillDescriptions].level50}
                  </p>
                </div>

                {/* Level 99 */}
                <div className="bg-slate-900/30 rounded-lg p-4 border-l-4 border-red-500/50 shadow-lg shadow-red-500/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-gradient-to-r from-red-900/60 to-orange-900/60 text-red-100 border border-red-500/60 shadow-md">Level 99</Badge>
                    <span className="text-sm text-red-200/90 font-serif italic font-bold">✨ Legendary ✨</span>
                  </div>
                  <p className="text-yellow-200/80 text-sm leading-relaxed">
                    {skillDescriptions[selectedSkill.skillName as keyof typeof skillDescriptions].level99}
                  </p>
                </div>
              </div>

              {/* Current Progress */}
              <div className="bg-gradient-to-r from-yellow-900/20 to-yellow-800/20 rounded-lg p-4 border border-yellow-600/30">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-yellow-100 font-semibold">Current Progress</span>
                  <span className="text-yellow-400">{selectedSkill.xp} / {selectedSkill.maxXp} XP</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all"
                    style={{ width: `${(selectedSkill.xp / selectedSkill.maxXp) * 100}%` }}
                  ></div>
                </div>
                <p className="text-yellow-300/60 text-xs mt-2 text-center font-serif italic">
                  {selectedSkill.level >= 99 
                    ? "⭐ Maximum Level Achieved! ⭐" 
                    : `${selectedSkill.maxXp - selectedSkill.xp} XP until Level ${selectedSkill.level + 1}`
                  }
                </p>
              </div>
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
    </div>
  );
}

