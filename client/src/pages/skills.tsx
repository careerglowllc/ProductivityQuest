import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { UserProgress, UserSkill } from "@/../../shared/schema";
import { 
  Wrench, 
  Palette, 
  Brain, 
  Briefcase, 
  Sword, 
  Book, 
  Heart, 
  MessageCircle, 
  Target,
  Crown,
  Star,
  Grid3x3,
  List,
  Settings,
  Handshake,
  Activity,
  type LucideIcon
} from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

const skillDescriptions = {
  Craftsman: {
    description: "The path of creation through hands and tools. This skill represents your ability to build, repair, and craft physical objects in the real world.",
    level10: "Amateur hobbyist who can handle basic DIY projects, simple repairs, and follows instructions for basic builds. Comfortable with common hand tools.",
    level30: "Skilled craftsperson with 5+ years experience. Can tackle complex projects, custom furniture, home renovations, and advanced woodworking or metalwork.",
    level50: "Master artisan - professional level expertise across multiple crafts. Creates custom pieces, teaches others, and can build virtually anything from raw materials."
  },
  Artist: {
    description: "Creative expression through visual arts, music, writing, or performance. This represents your artistic abilities and creative output in the real world.",
    level10: "Beginner artist exploring different mediums. Can create basic sketches, compositions, or performances with proper guidance and practice.",
    level30: "Accomplished artist with distinct style. Creates compelling work regularly, may sell pieces or perform publicly. 5+ years of dedicated practice.",
    level50: "Master artist with professional recognition. Exhibits/performs at high levels, has developed unique artistic voice, potentially makes living from art."
  },
  Will: {
    description: "Mental fortitude, willpower, positive mindset, and psychological resilience. This represents your ability to maintain effective mindset, overcome obstacles, and master your thoughts.",
    level10: "Developing mental discipline - practicing positive thinking, building basic meditation or mindfulness habits. Beginning to control negative self-talk.",
    level30: "Strong mental resilience - consistent positive mindset, 5+ years of mindset work. Overcomes setbacks effectively, practices daily mental training, influences others positively.",
    level50: "Master of mind - unshakeable willpower, stoic discipline, peak mental performance. Inspires others through mental strength, complete control over thoughts and emotions."
  },
  Merchant: {
    description: "Business acumen, negotiation, sales, and wealth building. Your ability to create value, close deals, and build financial success in the real world.",
    level10: "Learning business basics - can make small sales, understand simple negotiations, starting to build financial literacy.",
    level30: "Successful entrepreneur or sales professional. Closed significant deals, built profitable ventures, strong network. Consistent income growth over 5 years.",
    level50: "Business titan - multiple successful ventures, masterful negotiator, significant wealth built. Industry respected dealmaker and wealth creator."
  },
  Warrior: {
    description: "Physical prowess combining combat skills and athletic performance. Martial arts, weapons training, sports excellence, strength, speed, and endurance.",
    level10: "Active beginner - basic self-defense, regular exercise, recreational sports. Building foundation in fitness and fighting techniques.",
    level30: "Serious warrior-athlete - 5+ years training in martial arts or competitive sports. Strong combat skills or athletic performance, impressive physical conditioning.",
    level50: "Elite warrior - MMA fighter level combat skills combined with peak athletic performance. Special forces caliber or professional athlete. Complete physical mastery."
  },
  Scholar: {
    description: "Academic knowledge, research ability, continuous learning, and intellectual mastery. Your real-world education and expertise in various fields.",
    level10: "Curious learner - reads regularly, takes courses, builds knowledge in areas of interest. Understands how to research and learn effectively.",
    level30: "Expert in multiple domains - advanced degrees or equivalent self-education. Published work, teaches others, recognized knowledge in specialized fields.",
    level50: "Polymath genius - PhD-level expertise in multiple fields, published researcher, or recognized thought leader. Lifetime dedication to learning and teaching."
  },
  Connector: {
    description: "Building deep relationships, forming meaningful bonds, and creating lasting connections. Your ability to connect with others on a genuine level and maintain strong relationships.",
    level10: "Developing connection skills - actively listening, reaching out to friends and family, learning to be vulnerable and authentic in relationships.",
    level30: "Strong connector - maintains deep friendships, nurtures meaningful relationships, 5+ years building authentic bonds. People feel truly seen and heard by you.",
    level50: "Master connector - creates profound bonds, maintains vast network of deep relationships, brings people together. Expert at building community and lasting connections."
  },
  Charisma: {
    description: "Social influence, charm, persuasion, and interpersonal magnetism. Your ability to captivate, inspire, and influence people through personality and communication.",
    level10: "Developing social skills - can hold conversations, making connections. Learning to read people and communicate effectively.",
    level30: "Naturally charismatic - commands attention in rooms, persuasive communicator, 5+ years developing social influence. People gravitate toward you.",
    level50: "Magnetic presence - celebrity-level charisma, master persuader, inspires masses. Tony Stark or Obama-level charm and influence."
  },
  Health: {
    description: "Physical health, vitality, fitness, and overall wellness. Your body's strength, endurance, flexibility, and how well you take care of your physical vessel.",
    level10: "Building healthy habits - regular exercise routine, eating relatively healthy, getting decent sleep. Foundation of physical wellness established.",
    level30: "Strong physical health - 5+ years of consistent fitness, excellent energy levels, strong immune system. Athletic performance or body composition goals achieved.",
    level50: "Peak physical condition - elite athlete level fitness, optimal health markers, incredible vitality and longevity practices. Complete mastery of physical wellness."
  }
};

// Skill metadata (icons and constellations)
const skillMetadata: Record<string, { icon: LucideIcon; constellation: string }> = {
  Craftsman: { icon: Wrench, constellation: "The Forge" },
  Artist: { icon: Palette, constellation: "The Muse" },
  Will: { icon: Brain, constellation: "The Mind" },
  Merchant: { icon: Briefcase, constellation: "The Trader" },
  Warrior: { icon: Sword, constellation: "The Blade" },
  Scholar: { icon: Book, constellation: "The Sage" },
  Connector: { icon: Handshake, constellation: "The Bond" },
  Charisma: { icon: MessageCircle, constellation: "The Charmer" },
  Health: { icon: Heart, constellation: "The Vitality" },
};

export default function Skills() {
  const { data: progress } = useQuery<UserProgress>({
    queryKey: ["/api/progress"],
  });
  
  const { data: userSkills = [] } = useQuery<UserSkill[]>({
    queryKey: ["/api/skills"],
  });
  
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedSkill, setSelectedSkill] = useState<UserSkill | null>(null);
  const [viewMode, setViewMode] = useState<"icons" | "lists">("icons");
  const [showManualModify, setShowManualModify] = useState(false);
  const [editingSkill, setEditingSkill] = useState<UserSkill | null>(null);
  const [editForm, setEditForm] = useState({
    skillName: "",
    skillIcon: "",
    level: 1,
  });

  // Available icons for skills
  const availableIcons = [
    { name: "Wrench", emoji: "🔧", icon: Wrench },
    { name: "Palette", emoji: "🎨", icon: Palette },
    { name: "Brain", emoji: "🧠", icon: Brain },
    { name: "Briefcase", emoji: "💼", icon: Briefcase },
    { name: "Sword", emoji: "⚔️", icon: Sword },
    { name: "Book", emoji: "📚", icon: Book },
    { name: "Heart", emoji: "❤️", icon: Heart },
    { name: "MessageCircle", emoji: "💬", icon: MessageCircle },
    { name: "Target", emoji: "🎯", icon: Target },
    { name: "Crown", emoji: "👑", icon: Crown },
    { name: "Star", emoji: "⭐", icon: Star },
    { name: "Hammer", emoji: "🔨" },
    { name: "Shield", emoji: "🛡️" },
    { name: "Scroll", emoji: "📜" },
    { name: "Crystal", emoji: "💎" },
    { name: "Flame", emoji: "🔥" },
    { name: "Lightning", emoji: "⚡" },
    { name: "Moon", emoji: "🌙" },
    { name: "Sun", emoji: "☀️" },
    { name: "Mountain", emoji: "⛰️" },
  ];

  // Update skill mutation
  const updateSkillMutation = useMutation({
    mutationFn: async ({ skillId, updates }: { skillId: number; updates: Partial<UserSkill> }) => {
      const response = await fetch(`/api/skills/id/${skillId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update skill");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skills"] });
      toast({
        title: "Skill Updated",
        description: "Your skill has been successfully modified.",
      });
      setShowManualModify(false);
      setEditingSkill(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update skill. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEditSkill = (skill: UserSkill) => {
    setEditingSkill(skill);
    setEditForm({
      skillName: skill.skillName,
      skillIcon: skill.skillIcon || "",
      level: skill.level,
    });
    setShowManualModify(true);
  };

  const handleSaveSkill = () => {
    if (!editingSkill) return;
    
    updateSkillMutation.mutate({
      skillId: editingSkill.id,
      updates: {
        skillName: editForm.skillName,
        skillIcon: editForm.skillIcon,
        level: editForm.level,
        xp: 0,
        maxXp: editForm.level === 1 ? 100 : Math.floor(100 * Math.pow(1.5, editForm.level - 1)),
      },
    });
  };

  // Merge user skills with metadata
  const skills = userSkills.map(skill => {
    const defaultIcon = skillMetadata[skill.skillName]?.icon || Target;
    return {
      ...skill,
      icon: skill.skillIcon ? null : defaultIcon, // null if custom emoji, otherwise use default icon
      emoji: skill.skillIcon || null, // custom emoji if set
      constellation: skillMetadata[skill.skillName]?.constellation || "Unknown",
    };
  });

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
          <div className="flex items-center justify-center gap-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg px-6 py-3 border border-yellow-600/30">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-400" />
                <span className="text-yellow-100 font-semibold">Total XP: {(progress?.tasksCompleted || 0) * 100}</span>
              </div>
            </div>
            <div className="bg-yellow-600/20 backdrop-blur-sm rounded-lg px-6 py-3 border border-yellow-500/50">
              <span className="text-yellow-100 font-bold text-lg">{progress?.goldTotal || 0} 🪙 Gold</span>
            </div>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant={viewMode === "icons" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("icons")}
              className={`flex items-center gap-2 ${
                viewMode === "icons"
                  ? "bg-yellow-600 hover:bg-yellow-500 text-slate-900 border-yellow-500"
                  : "bg-slate-800/50 border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20 hover:text-yellow-100"
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
              Icons
            </Button>
            <Button
              variant={viewMode === "lists" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("lists")}
              className={`flex items-center gap-2 ${
                viewMode === "lists"
                  ? "bg-yellow-600 hover:bg-yellow-500 text-slate-900 border-yellow-500"
                  : "bg-slate-800/50 border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20 hover:text-yellow-100"
              }`}
            >
              <List className="w-4 h-4" />
              Lists
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowManualModify(true)}
              className="flex items-center gap-2 bg-slate-800/50 border-purple-600/40 text-purple-200 hover:bg-purple-600/20 hover:text-purple-100 hover:border-purple-500/50 ml-2"
            >
              <Settings className="w-4 h-4" />
              Manual Modify
            </Button>
          </div>
        </div>
      </div>

      {/* Skills Display - Icons or Lists */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {viewMode === "icons" ? (
          /* Icons View - Constellation Grid */
          <div className="grid grid-cols-3 gap-8">{skills.map((skill) => {
            const Icon = skill.icon;
            const progressPercent = (skill.xp / skill.maxXp) * 100;
            
            return (
              <div 
                key={skill.id} 
                className="relative group cursor-pointer"
                onClick={() => setSelectedSkill(skill)}
              >
                {/* Constellation Card */}
                <Card className="bg-slate-800/40 backdrop-blur-md border-2 border-yellow-600/20 hover:border-yellow-500/60 transition-all duration-500 overflow-hidden">
                  <div className="p-6">
                    {/* Level Badge */}
                    <Badge className="absolute top-3 right-3 bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-900 border-yellow-400 font-bold text-sm px-3 py-1 shadow-lg">
                      Level {skill.level}
                    </Badge>

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
                          {skill.emoji ? (
                            <span className="text-6xl">{skill.emoji}</span>
                          ) : skill.icon ? (
                            <skill.icon 
                              className="h-16 w-16 text-slate-900/80 drop-shadow-lg" 
                              strokeWidth={2.5}
                              style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))' }}
                            />
                          ) : (
                            <Target 
                              className="h-16 w-16 text-slate-900/80 drop-shadow-lg" 
                              strokeWidth={2.5}
                              style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))' }}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Constellation Name */}
                    <div className="text-center mb-3">
                      <h3 className="text-xl font-serif font-bold text-yellow-100 mb-1 tracking-wide">
                        {skill.skillName}
                      </h3>
                      <p className="text-xs text-yellow-400/70 italic font-serif">
                        {skill.constellation}
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
          })}</div>
        ) : (
          /* Lists View - Horizontal Progress Bars */
          <div className="space-y-4">
            {skills.map((skill) => {
              const progressPercent = (skill.xp / skill.maxXp) * 100;
              
              return (
                <Card 
                  key={skill.id}
                  className="bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30 hover:border-yellow-500/50 transition-all cursor-pointer overflow-hidden"
                  onClick={() => setSelectedSkill(skill)}
                >
                  <div className="p-6">
                    <div className="flex items-center gap-6">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-yellow-600 to-yellow-400 flex items-center justify-center border-2 border-yellow-500 shadow-lg">
                          {skill.emoji ? (
                            <span className="text-3xl">{skill.emoji}</span>
                          ) : skill.icon ? (
                            <skill.icon className="w-8 h-8 text-slate-900" strokeWidth={2.5} />
                          ) : (
                            <Target className="w-8 h-8 text-slate-900" strokeWidth={2.5} />
                          )}
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1">
                        {/* Title Row */}
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="text-xl font-serif font-bold text-yellow-100 mb-1">
                              {skill.skillName}
                            </h3>
                            <p className="text-sm text-yellow-400/70 italic">
                              {skill.constellation}
                            </p>
                          </div>
                          <Badge className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-900 border-yellow-400 font-bold text-base px-4 py-1.5 shadow-lg">
                            Level {skill.level}
                          </Badge>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-yellow-200/80 font-semibold">{skill.xp} / {skill.maxXp} XP</span>
                            <span className="text-yellow-400 font-bold">{Math.round(progressPercent)}%</span>
                          </div>
                          <Progress 
                            value={progressPercent} 
                            className="h-3 bg-slate-700/50 border border-yellow-600/30"
                          />
                          <p className="text-xs text-yellow-300/60 italic text-right">
                            {skill.maxXp - skill.xp} XP to next level
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
                        const Icon = skillMetadata[selectedSkill.skillName]?.icon || Target;
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
                    <p className="text-sm text-yellow-400/70 italic font-normal mt-1">{skillMetadata[selectedSkill.skillName]?.constellation || "Unknown"}</p>
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
                  {selectedSkill.maxXp - selectedSkill.xp} XP until Level {selectedSkill.level + 1}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual Modify Modal */}
      <Dialog open={showManualModify} onOpenChange={setShowManualModify}>
        <DialogContent className="bg-slate-800 border-2 border-purple-600/40 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-purple-100 flex items-center gap-2">
              <Settings className="h-6 w-6 text-purple-400" />
              Manual Skill Modification
            </DialogTitle>
          </DialogHeader>

          {editingSkill ? (
            /* Edit Form */
            <div className="space-y-6 py-4">
              <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-4">
                <p className="text-purple-200/80 text-sm">
                  Customize your skill's name, icon, and level. Changes are specific to your account.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="skillName" className="text-purple-100">Skill Name</Label>
                  <Input
                    id="skillName"
                    value={editForm.skillName}
                    onChange={(e) => setEditForm({ ...editForm, skillName: e.target.value })}
                    className="bg-slate-700/50 border-purple-600/30 text-purple-100 mt-2"
                    placeholder="Enter skill name"
                  />
                </div>

                <div>
                  <Label className="text-purple-100 mb-2 block">Skill Icon</Label>
                  <div className="grid grid-cols-10 gap-2 p-4 bg-slate-700/30 rounded-lg border border-purple-600/20 max-h-60 overflow-y-auto">
                    {availableIcons.map((iconOption) => (
                      <button
                        key={iconOption.name}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, skillIcon: iconOption.emoji })}
                        className={`w-12 h-12 flex items-center justify-center text-2xl rounded-lg transition-all ${
                          editForm.skillIcon === iconOption.emoji
                            ? 'bg-purple-600 ring-2 ring-purple-400 scale-110'
                            : 'bg-slate-600/50 hover:bg-slate-600 hover:scale-105'
                        }`}
                      >
                        {iconOption.emoji}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-purple-300/60 mt-2">Selected: {editForm.skillIcon || "None"}</p>
                </div>

                <div>
                  <Label htmlFor="level" className="text-purple-100">Level (1-99)</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Input
                      id="level"
                      type="number"
                      min={1}
                      max={99}
                      value={editForm.level}
                      onChange={(e) => setEditForm({ ...editForm, level: parseInt(e.target.value) || 1 })}
                      className="bg-slate-700/50 border-purple-600/30 text-purple-100 flex-1"
                    />
                    <Badge className="bg-gradient-to-r from-purple-600 to-purple-500 text-white border-purple-400 font-bold px-4 py-2">
                      Level {editForm.level}
                    </Badge>
                  </div>
                  <p className="text-xs text-purple-300/60 mt-2">
                    XP will be reset to 0. Max XP: {editForm.level === 1 ? 100 : Math.floor(100 * Math.pow(1.5, editForm.level - 1))}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSaveSkill}
                  disabled={updateSkillMutation.isPending || !editForm.skillName}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white"
                >
                  {updateSkillMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  onClick={() => {
                    setShowManualModify(false);
                    setEditingSkill(null);
                  }}
                  variant="outline"
                  className="flex-1 border-purple-600/40 text-purple-200 hover:bg-purple-600/20"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            /* Skill Selection */
            <div className="space-y-4 py-4">
              <p className="text-purple-200/80 text-center mb-4">
                Select a skill to modify:
              </p>
              <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {skills.map((skill) => (
                  <Card
                    key={skill.id}
                    onClick={() => handleEditSkill(skill)}
                    className="bg-slate-700/50 border-2 border-purple-600/30 hover:border-purple-500/60 cursor-pointer transition-all hover:scale-105"
                  >
                    <div className="p-4 text-center">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-lg bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center">
                        {skill.emoji ? (
                          <span className="text-3xl">{skill.emoji}</span>
                        ) : skill.icon ? (
                          <skill.icon className="w-8 h-8 text-white" strokeWidth={2.5} />
                        ) : (
                          <Target className="w-8 h-8 text-white" strokeWidth={2.5} />
                        )}
                      </div>
                      <h4 className="text-purple-100 font-serif font-bold">{skill.skillName}</h4>
                      <Badge className="mt-2 bg-purple-900/40 text-purple-200 border-purple-600/40">
                        Level {skill.level}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

