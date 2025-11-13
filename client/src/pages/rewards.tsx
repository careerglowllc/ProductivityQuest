import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, TrendingUp, CheckCircle } from "lucide-react";

export default function Rewards() {
  const { data: progress = { goldTotal: 0, tasksCompleted: 0 } } = useQuery({
    queryKey: ["/api/progress"],
  });

  // Placeholder achievements - backend implementation pending
  const achievements = [
    {
      id: 1,
      name: "First Steps",
      description: "Complete your first task",
      unlocked: progress.tasksCompleted > 0,
      icon: "🎯",
    },
    {
      id: 2,
      name: "Gold Rush",
      description: "Earn 1000 gold",
      unlocked: progress.goldTotal >= 1000,
      icon: "💰",
    },
    {
      id: 3,
      name: "Task Master",
      description: "Complete 50 tasks",
      unlocked: progress.tasksCompleted >= 50,
      icon: "⭐",
    },
    {
      id: 4,
      name: "Dedicated",
      description: "Complete tasks for 7 days in a row",
      unlocked: false,
      icon: "🔥",
    },
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pb-20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Rewards</h1>
          <p className="text-gray-600">Track your achievements and progress</p>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Tasks Completed</p>
                  <p className="text-3xl font-bold mt-1">{progress.tasksCompleted}</p>
                </div>
                <CheckCircle className="h-12 w-12 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-400 to-yellow-500 border-0 text-yellow-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-800 text-sm font-medium">Total Gold</p>
                  <p className="text-3xl font-bold mt-1">{progress.goldTotal}</p>
                </div>
                <Star className="h-12 w-12 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Achievements</p>
                  <p className="text-3xl font-bold mt-1">{unlockedCount}/{achievements.length}</p>
                </div>
                <Trophy className="h-12 w-12 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-purple-600" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                    achievement.unlocked
                      ? "bg-purple-50 border-purple-200"
                      : "bg-gray-50 border-gray-200 opacity-60"
                  }`}
                >
                  <div className="text-4xl">{achievement.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{achievement.name}</h3>
                      {achievement.unlocked && (
                        <Badge className="bg-green-500 hover:bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Unlocked
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{achievement.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Coming Soon */}
        <Card className="mt-8 bg-purple-50 border-purple-200">
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-12 w-12 text-purple-600 mx-auto mb-3" />
            <p className="text-purple-900 font-medium">
              More achievements and rewards coming soon!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
