import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { UserProgress } from "@/../../shared/schema";
import { 
  Wrench, 
  Palette, 
  TestTube, 
  Briefcase, 
  Sword, 
  Book, 
  Heart, 
  Zap, 
  Target,
  Crown,
  Star
} from "lucide-react";
import { useState } from "react";

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
  Alchemist: {
    description: "The science of transformation - cooking, chemistry, brewing, mixology, and experimental creation. Turning raw ingredients into something magnificent.",
    level10: "Kitchen novice who can follow recipes and make basic meals. Understands fundamental cooking techniques and food safety.",
    level30: "Skilled chef or mixologist. Creates original recipes, understands flavor chemistry, cooks/crafts without recipes. 5 years of regular practice.",
    level50: "Culinary master or expert chemist. Professional-level expertise in gastronomy, brewing, or laboratory work. Innovates new techniques and combinations."
  },
  Merchant: {
    description: "Business acumen, negotiation, sales, and wealth building. Your ability to create value, close deals, and build financial success in the real world.",
    level10: "Learning business basics - can make small sales, understand simple negotiations, starting to build financial literacy.",
    level30: "Successful entrepreneur or sales professional. Closed significant deals, built profitable ventures, strong network. Consistent income growth over 5 years.",
    level50: "Business titan - multiple successful ventures, masterful negotiator, significant wealth built. Industry respected dealmaker and wealth creator."
  },
  Warrior: {
    description: "Physical combat prowess - martial arts, weapons training, self-defense, and fighting skills. Your real-world ability to protect and compete in combat.",
    level10: "Amateur beginner - basic self-defense knowledge, some martial arts training, or recreational shooting practice. Knows fundamental techniques.",
    level30: "Serious martial artist with 5+ years training. Competent in multiple fighting styles, weapons proficiency, or competitive combat sports experience.",
    level50: "Elite fighter - MMA level skills, multiple black belts, expert marksman, or special forces caliber. John Wick level combat mastery."
  },
  Scholar: {
    description: "Academic knowledge, research ability, continuous learning, and intellectual mastery. Your real-world education and expertise in various fields.",
    level10: "Curious learner - reads regularly, takes courses, builds knowledge in areas of interest. Understands how to research and learn effectively.",
    level30: "Expert in multiple domains - advanced degrees or equivalent self-education. Published work, teaches others, recognized knowledge in specialized fields.",
    level50: "Polymath genius - PhD-level expertise in multiple fields, published researcher, or recognized thought leader. Lifetime dedication to learning and teaching."
  },
  Healer: {
    description: "Medical knowledge, caregiving, therapy, and wellness expertise. Your ability to help others heal physically, mentally, or emotionally.",
    level10: "Basic first aid and wellness knowledge. Can provide basic care, emotional support, and understands fundamental health principles.",
    level30: "Healthcare professional or experienced caregiver - nurse, therapist, trainer, or 5+ years serious health/wellness practice. Helps others heal regularly.",
    level50: "Master healer - doctor, psychologist, or equivalent expertise. Saves lives, transforms health outcomes, expert in multiple healing modalities."
  },
  Athlete: {
    description: "Physical fitness, sports performance, endurance, and athletic ability. Your real-world strength, speed, agility, and physical conditioning.",
    level10: "Active beginner - exercises regularly, plays recreational sports, building fitness foundation and athletic skills.",
    level30: "Serious athlete - competes in sports/events, 5+ years consistent training, impressive physical stats, may coach others. Strong and capable.",
    level50: "Elite athlete - professional or Olympic-level performance. Peak physical condition, competition winner, or extreme athletic achievements."
  },
  Tactician: {
    description: "Strategic thinking, planning, leadership, and tactical execution. Your ability to devise winning strategies and lead others to victory.",
    level10: "Learning strategy - can plan projects, think ahead, and make basic tactical decisions. Studies strategy games or military tactics.",
    level30: "Strategic leader - 5+ years leading teams/projects successfully. Proven track record of strategic wins in business, gaming, or real-world scenarios.",
    level50: "Master strategist - leads large organizations, wins at highest levels of competition, or military/executive strategic genius. Grandmaster-level planning."
  }
};

const skills = [
  { id: 1, name: "Craftsman", icon: Wrench, level: 5, xp: 750, maxXp: 1000, constellation: "The Forge" },
  { id: 2, name: "Artist", icon: Palette, level: 3, xp: 1200, maxXp: 1500, constellation: "The Muse" },
  { id: 3, name: "Alchemist", icon: TestTube, level: 2, xp: 400, maxXp: 800, constellation: "The Catalyst" },
  { id: 4, name: "Merchant", icon: Briefcase, level: 12, xp: 900, maxXp: 1200, constellation: "The Trader" },
  { id: 5, name: "Warrior", icon: Sword, level: 5, xp: 1800, maxXp: 2000, constellation: "The Blade" },
  { id: 6, name: "Scholar", icon: Book, level: 14, xp: 600, maxXp: 1000, constellation: "The Sage" },
  { id: 7, name: "Healer", icon: Heart, level: 3, xp: 350, maxXp: 800, constellation: "The Guardian" },
  { id: 8, name: "Athlete", icon: Zap, level: 7, xp: 1100, maxXp: 1200, constellation: "The Swift" },
  { id: 9, name: "Tactician", icon: Target, level: 8, xp: 700, maxXp: 1000, constellation: "The Strategist" },
];

export default function Skills() {
  const { data: progress } = useQuery<UserProgress>({
    queryKey: ["/api/progress"],
  });

  const [selectedSkill, setSelectedSkill] = useState<typeof skills[0] | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 pb-24 relative overflow-hidden">
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
        </div>
      </div>

      {/* Skills Constellation Grid */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-3 gap-8">
          {skills.map((skill) => {
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
                        {skill.name}
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
          })}
        </div>

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
                        const Icon = selectedSkill.icon;
                        return <Icon className="h-10 w-10 text-slate-900/80" strokeWidth={2.5} />;
                      })()}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      {selectedSkill.name}
                      <Badge className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-slate-900 border-yellow-400 font-bold">
                        Level {selectedSkill.level}
                      </Badge>
                    </div>
                    <p className="text-sm text-yellow-400/70 italic font-normal mt-1">{selectedSkill.constellation}</p>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedSkill && skillDescriptions[selectedSkill.name as keyof typeof skillDescriptions] && (
            <div className="space-y-6 mt-4">
              {/* Description */}
              <div className="bg-slate-900/50 rounded-lg p-4 border border-yellow-600/20">
                <p className="text-yellow-200/90 font-serif leading-relaxed">
                  {skillDescriptions[selectedSkill.name as keyof typeof skillDescriptions].description}
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
                    {skillDescriptions[selectedSkill.name as keyof typeof skillDescriptions].level10}
                  </p>
                </div>

                {/* Level 30 */}
                <div className="bg-slate-900/30 rounded-lg p-4 border-l-4 border-purple-500/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-purple-900/40 text-purple-200 border border-purple-600/40">Level 30</Badge>
                    <span className="text-sm text-purple-200/70 font-serif italic">Expert</span>
                  </div>
                  <p className="text-yellow-200/80 text-sm leading-relaxed">
                    {skillDescriptions[selectedSkill.name as keyof typeof skillDescriptions].level30}
                  </p>
                </div>

                {/* Level 50 */}
                <div className="bg-slate-900/30 rounded-lg p-4 border-l-4 border-yellow-500/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-yellow-900/40 text-yellow-200 border border-yellow-600/40">Level 50</Badge>
                    <span className="text-sm text-yellow-200/70 font-serif italic">Grandmaster</span>
                  </div>
                  <p className="text-yellow-200/80 text-sm leading-relaxed">
                    {skillDescriptions[selectedSkill.name as keyof typeof skillDescriptions].level50}
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
    </div>
  );
}

