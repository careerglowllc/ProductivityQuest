import { Card } from "@/components/ui/card";
import { 
  Wrench, 
  Palette, 
  Brain, 
  Briefcase, 
  Sword, 
  Book, 
  Heart, 
  MessageCircle, 
  Handshake,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

// Hardcoded 9 skills at level 3
const SKILLS = [
  { name: "Craftsman", icon: Wrench, level: 3, color: "from-orange-600 to-orange-400" },
  { name: "Artist", icon: Palette, level: 3, color: "from-purple-600 to-purple-400" },
  { name: "Will", icon: Brain, level: 3, color: "from-blue-600 to-blue-400" },
  { name: "Merchant", icon: Briefcase, level: 3, color: "from-green-600 to-green-400" },
  { name: "Warrior", icon: Sword, level: 3, color: "from-red-600 to-red-400" },
  { name: "Scholar", icon: Book, level: 3, color: "from-indigo-600 to-indigo-400" },
  { name: "Connector", icon: Handshake, level: 3, color: "from-pink-600 to-pink-400" },
  { name: "Charisma", icon: MessageCircle, level: 3, color: "from-yellow-600 to-yellow-400" },
  { name: "Health", icon: Heart, level: 3, color: "from-rose-600 to-rose-400" },
];

const MAX_LEVEL = 10;

export default function Skills() {
  const isMobile = useIsMobile();

  return (
    <div className={`min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 ${!isMobile ? 'pt-16' : ''} pb-24`}>
      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-md shadow-lg border-b border-yellow-600/30 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">👑</span>
            <h1 className="text-3xl font-serif font-bold text-yellow-100">Celestial Skills</h1>
            <span className="text-4xl">👑</span>
          </div>
          <p className="text-yellow-200/70 italic">Ascend Through the Constellations</p>
        </div>
      </div>

      {/* Skills Grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {SKILLS.map((skill) => {
            const Icon = skill.icon;
            const fillPercent = (skill.level / MAX_LEVEL) * 100;

            return (
              <Card 
                key={skill.name}
                className="bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30 hover:border-yellow-500/50 transition-all overflow-hidden relative"
              >
                {/* Vertical fill from bottom */}
                <div 
                  className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${skill.color} opacity-20 transition-all duration-500`}
                  style={{ height: `${fillPercent}%` }}
                />

                {/* Content */}
                <div className="relative p-6 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mb-3 border-2 border-yellow-500/30">
                    <Icon className="w-8 h-8 text-yellow-400" />
                  </div>
                  <h3 className="text-lg font-serif font-bold text-yellow-100 mb-2">
                    {skill.name}
                  </h3>
                  <div className="text-3xl font-bold text-yellow-400 mb-1">
                    {skill.level}
                  </div>
                  <div className="text-xs text-yellow-200/60">
                    Level {skill.level} / {MAX_LEVEL}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Path of Ascension info box */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📜</span>
            <h2 className="text-xl font-serif font-bold text-yellow-100">The Path of Ascension</h2>
            <span className="text-2xl">📜</span>
          </div>
          <div className="space-y-2 text-yellow-200/80">
            <p className="flex items-start gap-2">
              <span className="text-yellow-400">⭐</span>
              <span>Complete quests to fill your constellation with celestial power</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-yellow-400">⭐</span>
              <span>Greater challenges yield more potent experience</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-yellow-400">⭐</span>
              <span>Maintain daily rituals to multiply thy gains</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-yellow-400">⭐</span>
              <span>Unlock divine blessings at milestone levels</span>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
