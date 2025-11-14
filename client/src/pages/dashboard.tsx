import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Coins, Trophy, CheckCircle, TrendingUp, User, Settings, LogOut, Calendar, Sparkles, ShoppingCart, Trash2, Clock, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";

// Skill data with levels (all set to 3 for now)
const skillsData = [
  { name: "Craftsman", level: 3 },
  { name: "Artist", level: 3 },
  { name: "Alchemist", level: 3 },
  { name: "Merchant", level: 3 },
  { name: "Warrior", level: 3 },
  { name: "Scholar", level: 3 },
  { name: "Healer", level: 3 },
  { name: "Athlete", level: 3 },
  { name: "Tactician", level: 3 },
];

// Spider Chart Component
function SpiderChart({ skills }: { skills: typeof skillsData }) {
  const maxSkillLevel = Math.max(...skills.map(s => s.level));
  const chartMax = maxSkillLevel + 10; // +10 from highest level
  const size = 400;
  const center = size / 2;
  const radius = size / 2 - 60;
  const numSkills = skills.length;

  // Calculate polygon points for skill levels
  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / numSkills - Math.PI / 2;
    const distance = (value / chartMax) * radius;
    return {
      x: center + distance * Math.cos(angle),
      y: center + distance * Math.sin(angle),
    };
  };

  // Create background grid circles
  const gridLevels = [chartMax * 0.25, chartMax * 0.5, chartMax * 0.75, chartMax];
  
  // Create polygon path for skill levels
  const skillPoints = skills.map((skill, i) => getPoint(i, skill.level));
  const skillPath = skillPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <div className="flex items-center justify-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Background circles */}
        {gridLevels.map((level, i) => (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={(level / chartMax) * radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="1"
            opacity={0.5}
          />
        ))}

        {/* Axis lines from center to each skill */}
        {skills.map((skill, i) => {
          const endPoint = getPoint(i, chartMax);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={endPoint.x}
              y2={endPoint.y}
              stroke="#d1d5db"
              strokeWidth="1"
              opacity={0.5}
            />
          );
        })}

        {/* Skill level polygon */}
        <path
          d={skillPath}
          fill="rgba(147, 51, 234, 0.2)"
          stroke="rgb(147, 51, 234)"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Skill level points */}
        {skillPoints.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="6"
            fill="rgb(147, 51, 234)"
            stroke="white"
            strokeWidth="2"
          />
        ))}

        {/* Skill labels */}
        {skills.map((skill, i) => {
          const labelPoint = getPoint(i, chartMax + 15);
          const angle = (Math.PI * 2 * i) / numSkills - Math.PI / 2;
          
          // Adjust text anchor based on position
          let textAnchor = 'middle';
          if (Math.abs(Math.cos(angle)) > 0.5) {
            textAnchor = Math.cos(angle) > 0 ? 'start' : 'end';
          }

          return (
            <g key={i}>
              <text
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor={textAnchor}
                className="text-sm font-semibold fill-gray-700"
                dy="0.3em"
              >
                {skill.name}
              </text>
              <text
                x={labelPoint.x}
                y={labelPoint.y + 16}
                textAnchor={textAnchor}
                className="text-xs fill-purple-600 font-bold"
                dy="0.3em"
              >
                Lv {skill.level}
              </text>
            </g>
          );
        })}

        {/* Center point */}
        <circle cx={center} cy={center} r="4" fill="rgb(147, 51, 234)" />
        
        {/* Max level indicator */}
        <text
          x={center}
          y={center - radius - 20}
          textAnchor="middle"
          className="text-xs fill-gray-500 italic"
        >
          Max: Level {chartMax}
        </text>
      </svg>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
  });

  const { data: progress = { goldTotal: 0, tasksCompleted: 0 } } = useQuery({
    queryKey: ["/api/progress"],
  });

  const { data: stats = { completedToday: 0, totalToday: 0, goldEarnedToday: 0 } } = useQuery({
    queryKey: ["/api/stats"],
  });

  // Priority ranking: Pareto > High > Med-High > Medium > Med-Low > Low
  const getPriorityValue = (importance: string | null) => {
    const priorityMap: { [key: string]: number } = {
      'Pareto': 6,
      'High': 5,
      'Med-High': 4,
      'Medium': 3,
      'Med-Low': 2,
      'Low': 1,
    };
    return priorityMap[importance || ''] || 0;
  };

  // Get top 3 uncompleted tasks by priority
  const getTopTasks = () => {
    const incompleteTasks = (tasks as any[]).filter((task: any) => !task.completed);
    return incompleteTasks
      .sort((a, b) => getPriorityValue(b.importance) - getPriorityValue(a.importance))
      .slice(0, 3);
  };

  const topTasks = getTopTasks();

  const getImportanceBadgeColor = (importance: string | null) => {
    switch (importance) {
      case 'Pareto': return 'bg-red-500 text-white';
      case 'High': return 'bg-orange-500 text-white';
      case 'Med-High': return 'bg-yellow-500 text-white';
      case 'Medium': return 'bg-blue-500 text-white';
      case 'Med-Low': return 'bg-green-500 text-white';
      case 'Low': return 'bg-gray-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              {!isMobile && (
                <div className="flex items-center space-x-2">
                  <Trophy className="text-gold w-8 h-8" />
                  <h1 className="text-2xl font-bold text-gray-900">QuestList</h1>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 bg-gradient-to-r from-yellow-100 to-yellow-200 px-4 py-2 rounded-full">
                <Coins className="text-yellow-600 w-5 h-5" />
                <span className="font-semibold text-gray-900">{progress.goldTotal}</span>
                <span className="text-sm text-gray-600">Gold</span>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {user?.firstName || user?.email || "User"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = '/api/logout'}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.firstName || user?.username || "Adventurer"}! 👋
          </h2>
          <p className="text-gray-600">Ready to level up your productivity?</p>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium mb-1">Total Gold</p>
                  <p className="text-4xl font-bold">{progress.goldTotal || 0}</p>
                </div>
                <Coins className="h-12 w-12 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium mb-1">Quests Completed</p>
                  <p className="text-4xl font-bold">{progress.tasksCompleted || 0}</p>
                </div>
                <CheckCircle className="h-12 w-12 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium mb-1">Today's Progress</p>
                  <p className="text-4xl font-bold">{stats.completedToday || 0}/{stats.totalToday || 0}</p>
                </div>
                <TrendingUp className="h-12 w-12 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Progress Details */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Progress</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Tasks Completed</span>
                  <span className="font-medium text-gray-900">
                    {stats.completedToday}/{stats.totalToday}
                  </span>
                </div>
                <Progress 
                  value={stats.totalToday > 0 ? (stats.completedToday / stats.totalToday) * 100 : 0} 
                  className="h-3"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Gold Earned Today</span>
                  <span className="font-medium text-yellow-600">+{stats.goldEarnedToday}</span>
                </div>
                <Progress 
                  value={stats.goldEarnedToday > 0 ? Math.min((stats.goldEarnedToday / 500) * 100, 100) : 0} 
                  className="h-3"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skills Spider Chart */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold">Your Skills Overview</CardTitle>
              <Link href="/skills">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  View Details
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <SpiderChart skills={skillsData} />
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                All skills are currently at <span className="font-semibold text-purple-600">Level 3</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Complete quests to level up your skills and expand your constellation
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Top 3 Priority Tasks */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold">Today's Top Priorities</CardTitle>
              <Link href="/tasks">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  View All
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {topTasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No pending tasks! Great job! 🎉</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topTasks.map((task: any, index: number) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{task.title}</h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          {task.importance && (
                            <Badge className={`${getImportanceBadgeColor(task.importance)} text-xs`}>
                              {task.importance}
                            </Badge>
                          )}
                          {task.duration && (
                            <div className="flex items-center text-xs text-gray-600">
                              <Clock className="w-3 h-3 mr-1" />
                              {task.duration} min
                            </div>
                          )}
                          {task.goldValue && (
                            <div className="flex items-center text-xs text-yellow-600 font-semibold">
                              <Coins className="w-3 h-3 mr-1" />
                              {task.goldValue}
                            </div>
                          )}
                          {task.dueDate && (
                            <div className="flex items-center text-xs text-gray-600">
                              <Calendar className="w-3 h-3 mr-1" />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Link href="/tasks">
                      <Button variant="outline" size="sm">
                        Start
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/tasks">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Tasks</h3>
                <p className="text-sm text-gray-600 mt-1">Manage your quests</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/skills">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Skills</h3>
                <p className="text-sm text-gray-600 mt-1">Level up abilities</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/shop">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-green-600" />
                <h3 className="font-semibold text-gray-900">Item Shop</h3>
                <p className="text-sm text-gray-600 mt-1">Spend your gold</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/rewards">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <Trash2 className="w-12 h-12 mx-auto mb-3 text-orange-600" />
                <h3 className="font-semibold text-gray-900">Recycling</h3>
                <p className="text-sm text-gray-600 mt-1">View completed</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
