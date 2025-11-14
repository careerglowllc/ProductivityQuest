import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  Target 
} from "lucide-react";

const skills = [
  { id: 1, name: "Mechanic", icon: Wrench, level: 3, xp: 750, maxXp: 1000, color: "bg-orange-500" },
  { id: 2, name: "Artist", icon: Palette, level: 5, xp: 1200, maxXp: 1500, color: "bg-purple-500" },
  { id: 3, name: "Scientist", icon: TestTube, level: 2, xp: 400, maxXp: 800, color: "bg-blue-500" },
  { id: 4, name: "Businessman", icon: Briefcase, level: 4, xp: 900, maxXp: 1200, color: "bg-green-500" },
  { id: 5, name: "Warrior", icon: Sword, level: 6, xp: 1800, maxXp: 2000, color: "bg-red-500" },
  { id: 6, name: "Scholar", icon: Book, level: 3, xp: 600, maxXp: 1000, color: "bg-indigo-500" },
  { id: 7, name: "Healer", icon: Heart, level: 2, xp: 350, maxXp: 800, color: "bg-pink-500" },
  { id: 8, name: "Athlete", icon: Zap, level: 4, xp: 1100, maxXp: 1200, color: "bg-yellow-500" },
  { id: 9, name: "Strategist", icon: Target, level: 3, xp: 700, maxXp: 1000, color: "bg-teal-500" },
];

export default function Skills() {
  const { data: progress } = useQuery<UserProgress>({
    queryKey: ["/api/progress"],
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-blue-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white pt-8 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Your Skills</h1>
          <p className="text-purple-100">Level up by completing quests!</p>
          <div className="mt-4 flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <span className="text-sm font-medium">Total XP: {(progress?.tasksCompleted || 0) * 100}</span>
            </div>
            <div className="bg-yellow-400 text-yellow-900 rounded-full px-4 py-2 font-bold">
              {progress?.goldTotal || 0} 🪙
            </div>
          </div>
        </div>
      </div>

      {/* Skills Grid */}
      <div className="max-w-4xl mx-auto px-4 -mt-6">
        <div className="grid grid-cols-3 gap-4">
          {skills.map((skill) => {
            const Icon = skill.icon;
            const progressPercent = (skill.xp / skill.maxXp) * 100;
            
            return (
              <Card 
                key={skill.id} 
                className="relative overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group"
              >
                <CardContent className="p-4">
                  {/* Level Badge */}
                  <Badge className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 font-bold">
                    Lv {skill.level}
                  </Badge>

                  {/* Icon */}
                  <div className={`${skill.color} w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-lg`}>
                    <Icon className="h-8 w-8 text-white" strokeWidth={2.5} />
                  </div>

                  {/* Skill Name */}
                  <h3 className="text-center font-bold text-gray-800 mb-3">
                    {skill.name}
                  </h3>

                  {/* XP Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{skill.xp} XP</span>
                      <span>{skill.maxXp} XP</span>
                    </div>
                    <Progress 
                      value={progressPercent} 
                      className="h-2 bg-gray-200"
                    />
                  </div>

                  {/* XP to Next Level */}
                  <p className="text-center text-xs text-gray-500 mt-2">
                    {skill.maxXp - skill.xp} XP to Level {skill.level + 1}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info Section */}
        <Card className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-purple-200">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              How to Level Up Skills
            </h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p>• Complete quests related to each skill category</p>
              <p>• Higher importance tasks give more XP</p>
              <p>• Daily streaks multiply your XP gains</p>
              <p>• Unlock special abilities at certain levels!</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
