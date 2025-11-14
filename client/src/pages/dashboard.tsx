import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Coins, Trophy, CheckCircle, TrendingUp, User, Settings, LogOut, Calendar, Sparkles, ShoppingCart, Trash2, Clock, ArrowRight, Maximize2, Wrench, Palette, Brain, Briefcase, Sword, Book, Heart, MessageCircle, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import type { UserProgress, UserSkill } from "@/../../shared/schema";

// Skill icon mapping
const skillIcons: Record<string, any> = {
  Craftsman: Wrench,
  Artist: Palette,
  Will: Brain,
  Merchant: Briefcase,
  Warrior: Sword,
  Scholar: Book,
  Healer: Heart,
  Charisma: MessageCircle,
  Tactician: Target,
};

// Spider Chart Component
function SpiderChart({ skills }: { skills: { name: string; level: number }[] }) {
  const maxSkillLevel = Math.max(...skills.map(s => s.level));
  const chartMax = maxSkillLevel + 10; // +10 from highest level
  const size = 400;
  const center = size / 2;
  const radius = size / 2 - 40; // Reduced padding for labels
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
            stroke="#475569"
            strokeWidth="1"
            opacity={0.3}
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
              stroke="#64748b"
              strokeWidth="1"
              opacity={0.4}
            />
          );
        })}

        {/* Skill level polygon */}
        <path
          d={skillPath}
          fill="rgba(234, 179, 8, 0.15)"
          stroke="rgb(234, 179, 8)"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Skill level points */}
        {skillPoints.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="5"
            fill="rgb(250, 204, 21)"
            stroke="rgb(234, 179, 8)"
            strokeWidth="2"
          />
        ))}

        {/* Skill labels with icons - closer to chart */}
        {skills.map((skill, i) => {
          const labelPoint = getPoint(i, chartMax + 8); // Reduced distance
          const angle = (Math.PI * 2 * i) / numSkills - Math.PI / 2;
          
          // Adjust text anchor based on position
          let textAnchor = 'middle';
          if (Math.abs(Math.cos(angle)) > 0.5) {
            textAnchor = Math.cos(angle) > 0 ? 'start' : 'end';
          }

          const SkillIcon = skillIcons[skill.name] || Target;

          return (
            <g key={i}>
              {/* Icon above skill name - 30% larger */}
              <foreignObject
                x={labelPoint.x - 13}
                y={labelPoint.y - 28}
                width="26"
                height="26"
              >
                <div className="flex items-center justify-center">
                  <SkillIcon className="w-[5.2px] h-[5.2px] text-yellow-400" strokeWidth={2.5} style={{width: '20.8px', height: '20.8px'}} />
                </div>
              </foreignObject>
              
              {/* Skill name - 20% smaller */}
              <text
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor={textAnchor}
                className="text-[9.6px] font-semibold fill-yellow-200"
                dy="0.3em"
              >
                {skill.name}
              </text>
              
              {/* Level - 20% smaller */}
              <text
                x={labelPoint.x}
                y={labelPoint.y + 11}
                textAnchor={textAnchor}
                className="text-[8px] fill-yellow-400 font-bold"
                dy="0.3em"
              >
                Lv {skill.level}
              </text>
            </g>
          );
        })}

        {/* Center point */}
        <circle cx={center} cy={center} r="4" fill="rgb(234, 179, 8)" />
        
        {/* Max level indicator - 20% smaller */}
        <text
          x={center}
          y={center - radius - 15}
          textAnchor="middle"
          className="text-[8px] fill-yellow-200/60 italic"
        >
          Max: Lv {chartMax}
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

  const { data: progress = { goldTotal: 0, tasksCompleted: 0 } } = useQuery<UserProgress>({
    queryKey: ["/api/progress"],
  });

  const { data: stats = { completedToday: 0, totalToday: 0, goldEarnedToday: 0 } } = useQuery({
    queryKey: ["/api/stats"],
  });

  const { data: userSkills = [] } = useQuery<UserSkill[]>({
    queryKey: ["/api/skills"],
  });

  // Transform user skills into chart data
  const skillsData = userSkills.map(skill => ({
    name: skill.skillName,
    level: skill.level,
  }));

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

  // Get top 3 uncompleted tasks - prioritize by due date (today first), then by importance
  const getTopTasks = () => {
    const incompleteTasks = (tasks as any[]).filter((task: any) => !task.completed);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return incompleteTasks
      .sort((a, b) => {
        // Check if tasks are due today
        const aDueToday = a.dueDate ? new Date(a.dueDate).setHours(0, 0, 0, 0) === today.getTime() : false;
        const bDueToday = b.dueDate ? new Date(b.dueDate).setHours(0, 0, 0, 0) === today.getTime() : false;
        
        // Prioritize tasks due today
        if (aDueToday && !bDueToday) return -1;
        if (!aDueToday && bDueToday) return 1;
        
        // If both due today or both not due today, sort by importance
        return getPriorityValue(b.importance) - getPriorityValue(a.importance);
      })
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
      <header className="bg-slate-900/80 backdrop-blur-md shadow-lg border-b border-yellow-600/30 sticky top-0 z-50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Dashboard Title */}
            <div className="flex items-center space-x-2">
              <Trophy className="text-yellow-400 w-8 h-8" />
              <h1 className="text-2xl font-serif font-bold text-yellow-100">Dashboard</h1>
            </div>
            
            {/* User Dropdown */}
            <div className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 hover:bg-slate-700/50 text-yellow-100">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center border-2 border-yellow-400/50">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium">
                      {(user as any)?.firstName || (user as any)?.email || "User"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-slate-800 border-yellow-600/30 text-yellow-100">
                  <DropdownMenuItem asChild className="hover:bg-slate-700 focus:bg-slate-700">
                    <Link href="/settings" className="flex items-center">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = '/api/logout'} className="hover:bg-slate-700 focus:bg-slate-700">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-serif font-bold text-yellow-100 mb-2">
            Welcome back, {(user as any)?.firstName || (user as any)?.username || "Adventurer"}! 👋
          </h2>
          <p className="text-yellow-200/70">Ready to level up your productivity?</p>
        </div>

        {/* Stats Summary Cards - 70% smaller */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-6">
          <Card className="bg-gradient-to-br from-purple-900/60 to-purple-800/60 backdrop-blur-md border-2 border-purple-500/30 text-white hover:border-purple-400/60 transition-all">
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-200 text-[10px] font-medium mb-0.5">Total Gold</p>
                  <p className="text-base font-bold text-yellow-300">{progress.goldTotal || 0}</p>
                </div>
                <Coins className="h-5 w-5 text-yellow-400/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-900/60 to-blue-800/60 backdrop-blur-md border-2 border-blue-500/30 text-white hover:border-blue-400/60 transition-all">
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-200 text-[10px] font-medium mb-0.5">Quests Completed</p>
                  <p className="text-base font-bold text-yellow-300">{progress.tasksCompleted || 0}</p>
                </div>
                <CheckCircle className="h-5 w-5 text-blue-300/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/60 to-green-800/60 backdrop-blur-md border-2 border-green-500/30 text-white hover:border-green-400/60 transition-all">
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-200 text-[10px] font-medium mb-0.5">Today's Progress</p>
                  <p className="text-base font-bold text-yellow-300">{stats.completedToday || 0}/{stats.totalToday || 0}</p>
                </div>
                <TrendingUp className="h-5 w-5 text-green-300/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Two-column layout for web, single column for mobile */}
        <div className={`${!isMobile ? 'grid grid-cols-2 gap-6' : 'space-y-6'} mb-8`}>
          {/* Left Column - Spider Chart (Web) or full width (Mobile) */}
          <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30 hover:border-yellow-500/50 transition-all">
            <CardHeader className="border-b border-yellow-600/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-serif font-bold text-yellow-100">Your Skills Overview</CardTitle>
                <Link href="/skills">
                  <Button variant="outline" size="sm" className="flex items-center gap-2 border-yellow-600/40 bg-slate-700/50 text-yellow-200 hover:bg-yellow-600/20 hover:text-yellow-100 hover:border-yellow-500/60">
                    View Details
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <Dialog>
                <DialogTrigger asChild>
                  <div className="cursor-pointer relative group">
                    <div className={`${!isMobile ? 'scale-[0.8]' : 'scale-[0.45]'} origin-center transform ${!isMobile ? '-my-16' : '-my-32'}`}>
                      <SpiderChart skills={skillsData} />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-slate-900/90 text-yellow-100 px-4 py-2 rounded-lg flex items-center gap-2 border border-yellow-500/50">
                        <Maximize2 className="w-4 h-4" />
                        <span className="text-sm">Click to enlarge</span>
                      </div>
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-2xl bg-slate-800 border-2 border-yellow-600/40 text-yellow-100">
                  <DialogHeader>
                    <DialogTitle className="text-yellow-100 font-serif">Skills Overview</DialogTitle>
                  </DialogHeader>
                  <SpiderChart skills={skillsData} />
                  <div className="mt-4 text-center">
                    <p className="text-sm text-yellow-200/80">
                      All skills are currently at <span className="font-semibold text-yellow-400">Level 3</span>
                    </p>
                    <p className="text-xs text-yellow-200/60 mt-1">
                      Complete quests to level up your skills and expand your constellation
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Right Column - Top Priority Tasks (Web) or full width (Mobile) */}
          <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30 hover:border-yellow-500/50 transition-all">
            <CardHeader className="border-b border-yellow-600/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-serif font-bold text-yellow-100">Today's Top Priorities</CardTitle>
                <Link href="/tasks">
                  <Button variant="outline" size="sm" className="flex items-center gap-2 border-yellow-600/40 bg-slate-700/50 text-yellow-200 hover:bg-yellow-600/20 hover:text-yellow-100 hover:border-yellow-500/60">
                    View All
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {topTasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-yellow-400/50 mx-auto mb-3" />
                  <p className="text-yellow-200/70">No pending tasks! Great job! 🎉</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topTasks.map((task: any, index: number) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-4 border-2 border-slate-600/40 rounded-lg hover:bg-slate-700/40 hover:border-yellow-500/40 transition-all backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-500 text-slate-900 font-bold shadow-lg">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-yellow-100 mb-1">{task.title}</h4>
                          <div className="flex items-center gap-2 flex-wrap">
                            {task.importance && (
                              <Badge className={`${getImportanceBadgeColor(task.importance)} text-xs`}>
                                {task.importance}
                              </Badge>
                            )}
                            {task.duration && (
                              <div className="flex items-center text-xs text-yellow-200/60">
                                <Clock className="w-3 h-3 mr-1" />
                                {task.duration} min
                              </div>
                            )}
                            {task.goldValue && (
                              <div className="flex items-center text-xs text-yellow-400 font-semibold">
                                <Coins className="w-3 h-3 mr-1" />
                                {task.goldValue}
                              </div>
                            )}
                            {task.dueDate && (
                              <div className="flex items-center text-xs text-yellow-200/60">
                                <Calendar className="w-3 h-3 mr-1" />
                                {new Date(task.dueDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <Link href="/tasks">
                        <Button variant="outline" size="sm" className="border-yellow-600/40 bg-slate-700/50 text-yellow-200 hover:bg-yellow-600/20 hover:text-yellow-100 hover:border-yellow-500/60">
                          Start
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions - Skyrim Style */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/tasks">
            <Card className="hover:shadow-xl transition-all cursor-pointer bg-slate-800/60 backdrop-blur-md border-2 border-purple-500/30 hover:border-purple-400/60 group">
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-purple-400 group-hover:text-purple-300 transition-colors" />
                <h3 className="font-semibold text-yellow-100 font-serif">Tasks</h3>
                <p className="text-sm text-yellow-200/60 mt-1">Manage your quests</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/skills">
            <Card className="hover:shadow-xl transition-all cursor-pointer bg-slate-800/60 backdrop-blur-md border-2 border-blue-500/30 hover:border-blue-400/60 group">
              <CardContent className="p-6 text-center">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-blue-400 group-hover:text-blue-300 transition-colors" />
                <h3 className="font-semibold text-yellow-100 font-serif">Skills</h3>
                <p className="text-sm text-yellow-200/60 mt-1">Level up abilities</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/shop">
            <Card className="hover:shadow-xl transition-all cursor-pointer bg-slate-800/60 backdrop-blur-md border-2 border-green-500/30 hover:border-green-400/60 group">
              <CardContent className="p-6 text-center">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-green-400 group-hover:text-green-300 transition-colors" />
                <h3 className="font-semibold text-yellow-100 font-serif">Item Shop</h3>
                <p className="text-sm text-yellow-200/60 mt-1">Spend your gold</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/rewards">
            <Card className="hover:shadow-xl transition-all cursor-pointer bg-slate-800/60 backdrop-blur-md border-2 border-orange-500/30 hover:border-orange-400/60 group">
              <CardContent className="p-6 text-center">
                <Trash2 className="w-12 h-12 mx-auto mb-3 text-orange-400 group-hover:text-orange-300 transition-colors" />
                <h3 className="font-semibold text-yellow-100 font-serif">Recycling</h3>
                <p className="text-sm text-yellow-200/60 mt-1">View completed</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
