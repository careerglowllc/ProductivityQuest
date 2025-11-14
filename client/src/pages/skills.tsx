import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    </div>
  );
}

