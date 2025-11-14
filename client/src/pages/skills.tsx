import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

// Skill descriptions and milestones
const SKILL_INFO = {
  Craftsman: {
    description: "The path of creation through hands and tools. This skill represents your ability to build, repair, and craft physical objects in the real world.",
    milestones: {
      1: "Novice - Learning basic tools and simple projects",
      3: "Apprentice - Can handle basic DIY and repairs",
      5: "Journeyman - Skilled in multiple crafts",
      7: "Expert - Advanced projects and custom work",
      10: "Master Artisan - Professional level across all crafts"
    }
  },
  Artist: {
    description: "Creative expression through visual arts, music, writing, or performance. This represents your artistic abilities and creative output.",
    milestones: {
      1: "Novice - Exploring different mediums",
      3: "Apprentice - Developing your style",
      5: "Journeyman - Creating compelling work regularly",
      7: "Expert - Recognized talent and exhibitions",
      10: "Master Artist - Professional recognition and influence"
    }
  },
  Will: {
    description: "Mental fortitude, willpower, positive mindset, and psychological resilience. Master your thoughts and overcome any obstacle.",
    milestones: {
      1: "Novice - Building mental awareness",
      3: "Apprentice - Practicing positive thinking",
      5: "Journeyman - Strong mental discipline",
      7: "Expert - Unshakeable resilience",
      10: "Master of Mind - Complete mental mastery"
    }
  },
  Merchant: {
    description: "Business acumen, negotiation, sales, and wealth building. Your ability to create value and build financial success.",
    milestones: {
      1: "Novice - Learning business basics",
      3: "Apprentice - Making small deals",
      5: "Journeyman - Successful entrepreneur",
      7: "Expert - Significant ventures and wealth",
      10: "Business Titan - Industry leader"
    }
  },
  Warrior: {
    description: "Physical prowess combining combat skills and athletic performance. Martial arts, strength, speed, and endurance.",
    milestones: {
      1: "Novice - Building foundation",
      3: "Apprentice - Regular training and fitness",
      5: "Journeyman - Serious martial artist/athlete",
      7: "Expert - Elite combat skills",
      10: "Master Warrior - Peak physical mastery"
    }
  },
  Scholar: {
    description: "Academic knowledge, research ability, continuous learning, and intellectual mastery across various fields.",
    milestones: {
      1: "Novice - Curious learner",
      3: "Apprentice - Regular study habits",
      5: "Journeyman - Expert in multiple domains",
      7: "Expert - Published work and teaching",
      10: "Polymath Genius - Lifetime dedication to learning"
    }
  },
  Connector: {
    description: "Building deep relationships, forming meaningful bonds, and creating lasting connections with others.",
    milestones: {
      1: "Novice - Learning to connect",
      3: "Apprentice - Building authentic relationships",
      5: "Journeyman - Strong network of deep bonds",
      7: "Expert - Master of meaningful connections",
      10: "Community Builder - Vast network of profound relationships"
    }
  },
  Charisma: {
    description: "Social influence, charm, persuasion, and interpersonal magnetism. Captivate and inspire people.",
    milestones: {
      1: "Novice - Developing social skills",
      3: "Apprentice - Comfortable in conversations",
      5: "Journeyman - Naturally charismatic",
      7: "Expert - Commands attention in rooms",
      10: "Magnetic Presence - Celebrity-level charisma"
    }
  },
  Health: {
    description: "Physical health, vitality, fitness, and overall wellness. Take care of your body and achieve peak condition.",
    milestones: {
      1: "Novice - Building healthy habits",
      3: "Apprentice - Regular exercise routine",
      5: "Journeyman - Strong physical health",
      7: "Expert - Excellent fitness and energy",
      10: "Peak Condition - Elite athlete level"
    }
  }
};

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

// Spider Chart Component
function SpiderChart({ skills }: { skills: typeof SKILLS }) {
  const chartMax = 10;
  const size = 400;
  const center = size / 2;
  const radius = size / 2 - 60;
  const numSkills = skills.length;

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / numSkills - Math.PI / 2;
    const distance = (value / chartMax) * radius;
    return {
      x: center + distance * Math.cos(angle),
      y: center + distance * Math.sin(angle),
    };
  };

  const gridLevels = [chartMax * 0.25, chartMax * 0.5, chartMax * 0.75, chartMax];
  
  const skillPoints = skills.map((skill, i) => getPoint(i, skill.level));
  const skillPath = skillPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <div className="flex items-center justify-center overflow-hidden">
      <svg width={size} height={size} className="overflow-hidden">
        {/* Background circles */}
        {gridLevels.map((level, i) => (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={(level / chartMax) * radius}
            fill="none"
            stroke="#475569"
            strokeWidth="1"
            opacity={0.3}
          />
        ))}

        {/* Axis lines */}
        {skills.map((skill, i) => {
          const endPoint = getPoint(i, chartMax);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={endPoint.x}
              y2={endPoint.y}
              stroke="#64748b"
              strokeWidth="1"
              opacity={0.4}
            />
          );
        })}

        {/* Skill polygon */}
        <path
          d={skillPath}
          fill="rgba(234, 179, 8, 0.15)"
          stroke="rgb(234, 179, 8)"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Skill points and labels */}
        {skills.map((skill, i) => {
          const point = skillPoints[i];
          const labelPoint = getPoint(i, chartMax + 2);
          const Icon = skill.icon;
          
          return (
            <g key={i}>
              <circle cx={point.x} cy={point.y} r="5" fill="rgb(234, 179, 8)" />
              <foreignObject
                x={labelPoint.x - 20}
                y={labelPoint.y - 20}
                width="40"
                height="40"
              >
                <div className="flex flex-col items-center">
                  <Icon className="w-5 h-5 text-yellow-400" />
                  <text className="text-[8px] fill-yellow-400 font-bold text-center">
                    Lv {skill.level}
                  </text>
                </div>
              </foreignObject>
            </g>
          );
        })}

        <circle cx={center} cy={center} r="4" fill="rgb(234, 179, 8)" />
      </svg>
    </div>
  );
}

export default function Skills() {
  const isMobile = useIsMobile();
  const [selectedSkill, setSelectedSkill] = useState<typeof SKILLS[0] | null>(null);

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

      {/* Spider Chart */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30 p-6 mb-8">
          <h2 className="text-2xl font-serif font-bold text-yellow-100 text-center mb-4">
            Skill Constellation
          </h2>
          <SpiderChart skills={SKILLS} />
        </Card>
      </div>

      {/* Skills Grid */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {SKILLS.map((skill) => {
            const Icon = skill.icon;
            const fillPercent = (skill.level / MAX_LEVEL) * 100;

            return (
              <Card 
                key={skill.name}
                className="bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30 hover:border-yellow-500/50 transition-all overflow-hidden relative cursor-pointer"
                onClick={() => setSelectedSkill(skill)}
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

      {/* Skill Detail Modal */}
      {selectedSkill && (
        <Dialog open={!!selectedSkill} onOpenChange={() => setSelectedSkill(null)}>
          <DialogContent className="bg-slate-800 border-2 border-yellow-600/40 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-yellow-100 font-serif text-2xl">
                {(() => {
                  const Icon = selectedSkill.icon;
                  return <Icon className="w-8 h-8 text-yellow-400" />;
                })()}
                {selectedSkill.name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Current Level */}
              <div className="text-center">
                <div className="text-5xl font-bold text-yellow-400 mb-2">
                  Level {selectedSkill.level}
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full bg-gradient-to-r ${selectedSkill.color}`}
                    style={{ width: `${(selectedSkill.level / MAX_LEVEL) * 100}%` }}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-yellow-100/90 leading-relaxed">
                  {SKILL_INFO[selectedSkill.name as keyof typeof SKILL_INFO].description}
                </p>
              </div>

              {/* Milestones */}
              <div>
                <h3 className="text-xl font-serif font-bold text-yellow-100 mb-3">
                  Path of Mastery
                </h3>
                <div className="space-y-2">
                  {Object.entries(SKILL_INFO[selectedSkill.name as keyof typeof SKILL_INFO].milestones).map(([level, desc]) => {
                    const levelNum = parseInt(level);
                    const isAchieved = selectedSkill.level >= levelNum;
                    const isCurrent = selectedSkill.level === levelNum;
                    
                    return (
                      <div 
                        key={level}
                        className={`flex items-start gap-3 p-3 rounded-lg ${
                          isCurrent ? 'bg-yellow-600/20 border-2 border-yellow-500/50' :
                          isAchieved ? 'bg-slate-700/30' : 'bg-slate-700/10 opacity-50'
                        }`}
                      >
                        <div className={`text-2xl ${isAchieved ? 'opacity-100' : 'opacity-30'}`}>
                          {isAchieved ? '⭐' : '☆'}
                        </div>
                        <div className="flex-1">
                          <div className={`font-bold ${isAchieved ? 'text-yellow-400' : 'text-yellow-200/50'}`}>
                            Level {level}
                          </div>
                          <div className={`text-sm ${isAchieved ? 'text-yellow-100/80' : 'text-yellow-200/40'}`}>
                            {desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Path of Ascension info box */}
      <div className="max-w-6xl mx-auto px-4 pb-8 pt-4">
        <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📜</span>
            <h2 className="text-xl font-serif font-bold text-yellow-100">The Path of Ascension</h2>
            <span className="text-2xl">📜</span>
          </div>
          <div className="space-y-2 text-yellow-200/80">
            <p className="flex items-start gap-2">
              <span className="text-yellow-400">⭐</span>
              <span>Click any skill to view its path of mastery and milestones</span>
            </p>
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
              <span>Unlock divine blessings at milestone levels</span>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
