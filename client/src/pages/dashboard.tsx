import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Coins, Trophy, CheckCircle, TrendingUp, User, Settings, LogOut, Calendar, Sparkles, ShoppingCart, Trash2, Clock, ArrowRight, Maximize2, Wrench, Palette, Brain, Briefcase, Sword, Book, Heart, MessageCircle, Target, Crown, Handshake, Activity } from "lucide-react";
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
  Connector: Handshake,
  Charisma: MessageCircle,
  Health: Heart,
};

// Hardcoded skills data - same as skills page
const HARDCODED_SKILLS = [
  { name: "Craftsman", level: 3 },
  { name: "Artist", level: 3 },
  { name: "Will", level: 3 },
  { name: "Merchant", level: 3 },
  { name: "Warrior", level: 3 },
  { name: "Scholar", level: 3 },
  { name: "Connector", level: 3 },
  { name: "Charisma", level: 3 },
  { name: "Health", level: 3 },
];

// Spider Chart Component
function SpiderChart({ skills }: { skills: { name: string; level: number }[] }) {
  const chartMax = 10; // Changed to match skills page max level
  const size = 400;
  const center = size / 2;
  const radius = size / 2 - 60; // Increased padding to keep icons inside
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

        {/* Skill labels with icons - positioned inside bounds */}
        {skills.map((skill, i) => {
          const labelPoint = getPoint(i, chartMax + 5); // Reduced offset to keep inside
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

  const { data: stats = { completedToday: 0, totalToday: 0, goldEarnedToday: 0 } } = useQuery<{
    completedToday: number;
    totalToday: number;
    goldEarnedToday: number;
  }>({
    queryKey: ["/api/stats"],
  });

  // Use hardcoded skills instead of API call
  const skillsData = HARDCODED_SKILLS;

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Stats Summary Cards - Skyrim Theme */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-6">
          <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30 hover:border-yellow-500/50 transition-all">
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-200/70 text-[10px] font-medium mb-0.5">Total Gold</p>
                  <p className="text-base font-bold text-yellow-100">{progress.goldTotal || 0}</p>
                </div>
                <Coins className="h-5 w-5 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30 hover:border-yellow-500/50 transition-all">
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-200/70 text-[10px] font-medium mb-0.5">Quests Completed</p>
                  <p className="text-base font-bold text-yellow-100">{progress.tasksCompleted || 0}</p>
                </div>
                <CheckCircle className="h-5 w-5 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30 hover:border-yellow-500/50 transition-all">
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-200/70 text-[10px] font-medium mb-0.5">Today's Progress</p>
                  <p className="text-base font-bold text-yellow-100">{stats.completedToday || 0}/{stats.totalToday || 0}</p>
                </div>
                <TrendingUp className="h-5 w-5 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Campaign Section */}
        <Card className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-md border-2 border-purple-600/40 hover:border-purple-500/60 transition-all mb-6">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="h-4 w-4 text-purple-400" />
              <h3 className="text-base font-serif font-bold text-purple-100">Main Campaign</h3>
            </div>

            {/* Objective 1: Financial Independence */}
            <div className="mb-3 pb-3 border-b border-purple-600/30">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="text-sm font-serif font-bold text-purple-100">Financial Independence</h4>
                  <p className="text-purple-300/70 text-xs">Build wealth and achieve freedom</p>
                </div>
                <div className="text-right">
                  <p className="text-purple-200/70 text-[10px] mb-0.5">Current Net Worth</p>
                  <p className="text-lg font-bold text-purple-100">$500,000</p>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-purple-200/80">Goal: $1.3M Net Worth</span>
                  <span className="text-purple-100 font-bold">38.5%</span>
                </div>
                <Progress value={38.5} className="h-2 bg-slate-700/50">
                  <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all" style={{ width: '38.5%' }} />
                </Progress>
                <p className="text-[10px] text-purple-300/60">$800,000 remaining to achieve financial freedom</p>
              </div>
            </div>

            {/* Objective 2: Peace of Mind */}
            <div>
              <h4 className="text-sm font-serif font-bold text-purple-100 mb-1">Peace of Mind</h4>
              <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-2">
                <p className="text-purple-200/80 text-xs italic leading-relaxed">
                  "Peace is a choice. The journey is all there is. There are no rules to the game."
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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
                      <Link href={`/tasks?taskId=${task.id}`}>
                        <Button variant="outline" size="sm" className="border-yellow-600/40 bg-slate-700/50 text-yellow-200 hover:bg-yellow-600/20 hover:text-yellow-100 hover:border-yellow-500/60">
                          Details
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
