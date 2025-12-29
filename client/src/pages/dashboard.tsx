import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Coins, Trophy, CheckCircle, TrendingUp, User, Settings, LogOut, Calendar, Sparkles, ShoppingCart, Trash2, Clock, ArrowRight, Maximize2, Wrench, Palette, Brain, Briefcase, Sword, Book, Activity, Network, Users as UsersIcon, Crown, Target, ChevronDown, ChevronUp, Plus, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useRef, useEffect } from "react";
import React from "react";
import type { UserProgress, UserSkill, FinancialItem } from "@/../../shared/schema";
import { getSkillIcon } from "@/lib/skillIcons";
import { Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Legend, Tooltip } from "recharts";

// Default skill icon mapping for backward compatibility
const skillIcons: Record<string, any> = {
  Craftsman: Wrench,
  Artist: Palette,
  Mindset: Brain,
  Merchant: Briefcase,
  Physical: Sword,
  Scholar: Book,
  Health: Activity,
  Connector: Network,
  Charisma: UsersIcon,
};

// Mini Today Calendar Widget Component
function TodayCalendarWidget() {
  type CalendarEvent = {
    id: string;
    title: string;
    start: string;
    end: string;
    description?: string;
    source?: string;
    calendarColor?: string;
    calendarName?: string;
  };

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const { data: calendarData } = useQuery<{ events: CalendarEvent[] }>({
    queryKey: [`/api/google-calendar/events?year=${year}&month=${month}`],
  });

  // Ensure calendarEvents is always an array
  const safeCalendarEvents = Array.isArray(calendarData?.events) ? calendarData.events : [];

  
  // Time slots for today (full 24 hours to match main calendar)
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i;
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return {
      hour,
      label: `${displayHour}:00 ${ampm}`
    };
  });

  // Get events for a specific hour
  const getEventsForHour = (hour: number) => {
    // Ensure calendarEvents is an array before filtering
    if (!Array.isArray(safeCalendarEvents)) {
      return [];
    }
    return safeCalendarEvents.filter(event => {
      const eventStart = new Date(event.start);
      const eventHour = eventStart.getHours();
      const isToday = eventStart.toDateString() === today.toDateString();
      return isToday && eventHour === hour;
    });
  };

  // Get event styling
  const getEventStyle = (event: CalendarEvent) => {
    if (event.calendarColor) {
      return {
        backgroundColor: event.calendarColor,
        borderColor: event.calendarColor,
        color: '#ffffff'
      };
    }
    return { className: 'bg-purple-600/40 border-purple-500' };
  };

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Ref for scrollable container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to current time on mount
  useEffect(() => {
    if (scrollContainerRef.current && currentHour >= 6 && currentHour <= 23) {
      // Scroll with a small delay to ensure render is complete
      setTimeout(() => {
        const currentHourElement = document.getElementById(`hour-${currentHour}`);
        if (currentHourElement && scrollContainerRef.current) {
          const containerTop = scrollContainerRef.current.offsetTop;
          const elementTop = currentHourElement.offsetTop;
          const scrollPosition = elementTop - containerTop;
          
          scrollContainerRef.current.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [currentHour]);
  
  return (
    <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-blue-600/30 hover:border-blue-500/50 transition-all">
      <CardHeader className="border-b border-blue-600/20 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-serif font-bold text-blue-100">Today's Schedule</CardTitle>
          <Link href="/calendar">
            <Button variant="outline" size="sm" className="flex items-center gap-2 border-blue-600/40 bg-slate-700/50 text-blue-200 hover:bg-blue-600/20 hover:text-blue-100 hover:border-blue-500/60">
              Full Calendar
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <div className="text-sm text-blue-300/80 mt-1">
          {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </CardHeader>
      <CardContent className="pt-4 pb-2">
        <div ref={scrollContainerRef} className="overflow-auto max-h-[300px]">
          <div className="space-y-px">
            {timeSlots.map(({ hour, label }) => {
              const hourEvents = getEventsForHour(hour);
              const showTimeIndicator = hour === currentHour;
              const timeIndicatorPosition = (currentMinute / 60) * 100;
              
              return (
                <div 
                  key={hour} 
                  id={`hour-${hour}`}
                  className="grid grid-cols-[60px_1fr] gap-2 min-h-[40px]"
                >
                  <div className="text-xs text-gray-500 text-right pr-2 pt-1">
                    {label}
                  </div>
                  <div className="bg-gray-900/20 rounded p-1 relative">
                    {/* Current Time Indicator */}
                    {showTimeIndicator && (
                      <div 
                        className="absolute left-0 right-0 flex items-center z-20"
                        style={{ top: `${timeIndicatorPosition}%` }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-lg shadow-red-500/50 -ml-1"></div>
                        <div className="flex-1 h-0.5 bg-red-500 shadow-md shadow-red-500/50"></div>
                      </div>
                    )}
                    
                    {hourEvents.map((event, idx) => {
                      const eventStyle = getEventStyle(event);
                      return (
                        <div
                          key={idx}
                          className={`p-1.5 mb-1 rounded text-xs border ${eventStyle.className || ''}`}
                          style={eventStyle.backgroundColor ? { 
                            backgroundColor: eventStyle.backgroundColor,
                            borderColor: eventStyle.borderColor,
                            color: eventStyle.color
                          } : undefined}
                        >
                          <div className="font-medium truncate text-[11px]">{event.title}</div>
                          {event.calendarName && (
                            <div className="text-[9px] opacity-70 truncate">{event.calendarName}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Finance Widget Component
function FinanceWidget() {
  const INCOME_CATEGORIES = ["Income", "Retirement", "Investment"];
  const EXPENSE_COLORS: Record<string, string> = {
    "General": "#A78BFA", // purple-400
    "Business": "#60A5FA", // blue-400
    "Entertainment": "#F472B6", // pink-400
    "Food": "#FBBF24", // amber-400
    "Housing": "#F87171", // red-400
    "Transportation": "#34D399", // emerald-400
    "Phone": "#818CF8", // indigo-400
    "Internet": "#2DD4BF", // teal-400
    "Insurance": "#FB923C", // orange-400
    "Credit Card": "#EF4444", // red-500
    "Health (Non Insurance)": "#A3E635", // lime-400
    "Toiletries": "#C084FC", // purple-400
    "Charity": "#22D3EE", // cyan-400
  };
  const INCOME_COLOR = "#10B981"; // emerald-500

  const { data: financialItems = [] } = useQuery<FinancialItem[]>({
    queryKey: ["/api/finances"],
  });

  // Calculate totals
  const totalIncome = financialItems
    .filter(item => INCOME_CATEGORIES.includes(item.category))
    .reduce((sum, item) => sum + item.monthlyCost, 0);

  const totalExpenses = financialItems
    .filter(item => !INCOME_CATEGORIES.includes(item.category))
    .reduce((sum, item) => sum + item.monthlyCost, 0);

  const netIncome = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((netIncome / totalIncome) * 100) : 0;

  // Prepare pie chart data
  const expensesByCategory = financialItems
    .filter(item => !INCOME_CATEGORIES.includes(item.category))
    .reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = 0;
      }
      acc[item.category] += item.monthlyCost;
      return acc;
    }, {} as Record<string, number>);

  const pieData = [
    { name: "Income", value: totalIncome, color: INCOME_COLOR },
    ...Object.entries(expensesByCategory).map(([category, value]) => ({
      name: category,
      value,
      color: EXPENSE_COLORS[category as keyof typeof EXPENSE_COLORS] || "#94A3B8"
    }))
  ].filter(item => item.value > 0);

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(0)}`;
  };

  return (
    <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-emerald-500/30 hover:border-emerald-400/60 transition-all h-full shadow-lg shadow-emerald-500/10">
      <CardHeader className="border-b border-emerald-500/20 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-serif font-bold bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">
              💰 Financial Overview
            </CardTitle>
            <p className="text-xs text-emerald-200/60 mt-1">Monthly Income & Expenses</p>
          </div>
          <Link href="/finances">
            <Button variant="outline" size="sm" className="flex items-center gap-2 border-emerald-500/50 bg-emerald-600/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200 hover:border-emerald-400/70 hover:shadow-md hover:shadow-emerald-500/20 transition-all">
              View Details
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-4 pb-4">
        {pieData.length === 0 ? (
          <div className="text-center py-12 text-emerald-200/60">
            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50 text-emerald-400/40" />
            <p>No financial data yet</p>
          </div>
        ) : (
          <div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-green-500/5 rounded-lg blur-xl"></div>
              <ResponsiveContainer width="100%" height={220}>
                <RechartsPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={70}
                    stroke="rgba(15, 23, 42, 0.8)"
                    strokeWidth={2}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        style={{
                          filter: `drop-shadow(0 0 8px ${entry.color}40)`,
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      border: '2px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '12px',
                      color: '#f1f5f9',
                      boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)',
                      backdropFilter: 'blur(8px)'
                    }}
                    labelStyle={{
                      color: '#6ee7b7',
                      fontWeight: 'bold'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{
                      fontSize: '11px',
                      paddingTop: '10px'
                    }}
                    iconType="circle"
                    formatter={(value) => <span className="text-slate-300">{value}</span>}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-emerald-500/10 to-green-500/10 rounded-lg border border-emerald-500/20">
                <span className="text-emerald-200/90 font-medium">Net Income:</span>
                <span className={`font-bold text-lg ${netIncome >= 0 ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]'}`}>
                  {formatCurrency(netIncome)}/mo
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 rounded-lg border border-yellow-500/20">
                <span className="text-yellow-200/90 font-medium">Savings Rate:</span>
                <span className="font-bold text-lg text-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]">{savingsRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Spider Chart Component
function SpiderChart({ skills }: { skills: UserSkill[] }) {
  // Ensure skills is an array
  if (!Array.isArray(skills) || skills.length === 0) {
    return null;
  }
  
  // Calculate max chart value: highest skill level + 10, capped at 99
  const highestSkillLevel = Math.max(...skills.map(s => s.level), 0);
  const chartMax = Math.min(highestSkillLevel + 10, 99);
  
  const size = 400; // Reduced from 500 for more compact display
  const center = size / 2;
  const radius = size / 2 - 90; // Increased padding from 80 to 90 for better fit
  const numSkills = skills.length;

  // Helper function to get skill icon
  const getSkillIconComponent = (skill: UserSkill) => {
    // If skill has a custom icon, use it
    if (skill.skillIcon) {
      return getSkillIcon(skill.skillIcon);
    }
    // Otherwise fall back to hardcoded mapping for default skills
    return skillIcons[skill.skillName] || Target;
  };

  // Helper to generate consistent colors for custom skills
  const getSkillColor = (skill: UserSkill) => {
    if (!skill.isCustom) {
      return { fill: 'rgb(234, 179, 8)', stroke: 'rgb(234, 179, 8)', textColor: 'text-yellow-400' };
    }
    
    // Generate color from skill name hash for consistency
    const hash = skill.skillName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    return {
      fill: `hsl(${hue}, 70%, 60%)`,
      stroke: `hsl(${hue}, 70%, 50%)`,
      textColor: 'text-purple-400'
    };
  };

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
  
  // Create polygon points for skill levels
  const skillPoints = skills.map((skill, i) => getPoint(i, skill.level));
  const polygonPointsString = skillPoints.map(p => `${p.x},${p.y}`).join(' ');

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

        {/* Skill level polygon - filled area */}
        {skillPoints.length > 0 && (
          <>
            <polygon
              points={polygonPointsString}
              fill="rgba(234, 179, 8, 0.3)"
              className="transition-all duration-500"
              style={{ filter: 'drop-shadow(0 0 15px rgba(234, 179, 8, 0.4))' }}
            />
            {/* Polygon outline */}
            <polygon
              points={polygonPointsString}
              fill="none"
              stroke="rgb(234, 179, 8)"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </>
        )}

        {/* Skill level points */}
        {skillPoints.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="6"
            fill="rgb(250, 204, 21)"
            stroke="rgb(234, 179, 8)"
            strokeWidth="2"
            className="transition-all duration-300"
            style={{ filter: 'drop-shadow(0 0 6px rgba(234, 179, 8, 1))' }}
          />
        ))}

        {/* Skill labels with icons - positioned inside bounds */}
        {skills.map((skill, i) => {
          const labelPoint = getPoint(i, chartMax + 2); // Reduced offset to keep labels closer
          const angle = (Math.PI * 2 * i) / numSkills - Math.PI / 2;
          
          // Adjust text anchor based on position
          let textAnchor = 'middle';
          if (Math.abs(Math.cos(angle)) > 0.5) {
            textAnchor = Math.cos(angle) > 0 ? 'start' : 'end';
          }

          const SkillIcon = getSkillIconComponent(skill);
          const colors = getSkillColor(skill);

          return (
            <g key={i}>
              {/* Icon above skill name */}
              <foreignObject
                x={labelPoint.x - 15}
                y={labelPoint.y - 32}
                width="30"
                height="30"
              >
                <div className="flex items-center justify-center">
                  <SkillIcon className={`w-6 h-6 ${colors.textColor}`} strokeWidth={2.5} />
                </div>
              </foreignObject>
              
              {/* Skill name */}
              <text
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor={textAnchor}
                className="text-xs font-semibold fill-yellow-200"
                dy="0.3em"
              >
                {skill.skillName}
              </text>
              
              {/* Level */}
              <text
                x={labelPoint.x}
                y={labelPoint.y + 13}
                textAnchor={textAnchor}
                className="text-[10px] fill-yellow-400 font-bold"
                dy="0.3em"
              >
                Lv {skill.level}
              </text>
            </g>
          );
        })}

        {/* Center point */}
        <circle cx={center} cy={center} r="4" fill="rgb(234, 179, 8)" />
      </svg>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  // State for expanded campaigns
  const [expandedCampaigns, setExpandedCampaigns] = useState<{ [key: string]: boolean }>({});
  
  // Mock selected campaigns data (replace with API call in production)
  const selectedCampaigns = [
    {
      id: 'maximize-looks',
      title: 'Maximize Looks',
      description: 'A comprehensive transformation journey covering fitness, grooming, style, and confidence',
      progress: 35,
      quests: [
        { id: 1, title: 'Foundation Assessment Complete', status: 'completed' },
        { id: 2, title: 'Skincare Routine Established', status: 'completed' },
        { id: 3, title: 'Fitness Fundamentals', status: 'in-progress' },
        { id: 4, title: 'Wardrobe Optimization', status: 'locked' },
        { id: 5, title: 'Confidence & Presence', status: 'locked' },
      ],
    },
    {
      id: 'remote-business',
      title: 'Build a Self-Sufficient Remote Business',
      description: 'Launch and scale a profitable online business that generates passive income and location freedom',
      progress: 60,
      quests: [
        { id: 1, title: 'Market Research & Niche Selection', status: 'completed' },
        { id: 2, title: 'MVP Development & Launch', status: 'completed' },
        { id: 3, title: 'First 10 Paying Customers', status: 'completed' },
        { id: 4, title: 'Scale to $10K MRR', status: 'in-progress' },
        { id: 5, title: 'Automation & Systems', status: 'locked' },
        { id: 6, title: 'Full Location Independence', status: 'locked' },
      ],
    },
  ];
  
  const toggleCampaign = (campaignId: string) => {
    setExpandedCampaigns(prev => ({
      ...prev,
      [campaignId]: !prev[campaignId]
    }));
  };

  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
  });

  // Ensure tasks is always an array
  const safeTasks = Array.isArray(tasks) ? tasks : [];

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

  // Fetch user skills dynamically from API
  const { data: skills = [], isLoading: skillsLoading } = useQuery<UserSkill[]>({
    queryKey: ["/api/skills"],
  });

  // Ensure skills is always an array
  const safeSkills = Array.isArray(skills) ? skills : [];

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

  // Get top 4 uncompleted tasks with advanced priority logic
  const getTopTasks = () => {
    // Ensure tasks is an array before filtering
    if (!Array.isArray(safeTasks)) {
      return [];
    }
    const incompleteTasks = (safeTasks as any[]).filter((task: any) => !task.completed);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    
    // Helper to get days until due date
    const getDaysUntilDue = (task: any) => {
      if (!task.dueDate) return Infinity;
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const diffTime = dueDate.getTime() - todayTime;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    };
    
    // Priority tiers based on requirements
    const categorizedTasks = {
      tier1: [] as any[], // Due today or earlier + High priority
      tier2: [] as any[], // Next 3 days + High priority
      tier3: [] as any[], // Next 3 days + Med-High priority
      tier4: [] as any[], // Next 7 days + High priority
      tier5: [] as any[], // Next 7 days + Med-High priority
      tier6: [] as any[], // Everything else
    };
    
    incompleteTasks.forEach(task => {
      const daysUntilDue = getDaysUntilDue(task);
      const importance = task.importance || '';
      
      // Tier 1: Due today or earlier + High priority
      if (daysUntilDue <= 0 && importance === 'High') {
        categorizedTasks.tier1.push(task);
      }
      // Tier 2: Next 3 days (1-3 days) + High priority
      else if (daysUntilDue >= 1 && daysUntilDue <= 3 && importance === 'High') {
        categorizedTasks.tier2.push(task);
      }
      // Tier 3: Next 3 days (1-3 days) + Med-High priority
      else if (daysUntilDue >= 1 && daysUntilDue <= 3 && importance === 'Med-High') {
        categorizedTasks.tier3.push(task);
      }
      // Tier 4: Next week (4-7 days) + High priority
      else if (daysUntilDue >= 4 && daysUntilDue <= 7 && importance === 'High') {
        categorizedTasks.tier4.push(task);
      }
      // Tier 5: Next week (4-7 days) + Med-High priority
      else if (daysUntilDue >= 4 && daysUntilDue <= 7 && importance === 'Med-High') {
        categorizedTasks.tier5.push(task);
      }
      // Tier 6: Everything else
      else {
        categorizedTasks.tier6.push(task);
      }
    });
    
    // Within each tier, sort by due date (closest first), then by importance
    const sortTier = (tasks: any[]) => {
      return tasks.sort((a, b) => {
        const aDays = getDaysUntilDue(a);
        const bDays = getDaysUntilDue(b);
        
        // First by due date
        if (aDays !== bDays) return aDays - bDays;
        
        // Then by importance
        return getPriorityValue(b.importance) - getPriorityValue(a.importance);
      });
    };
    
    // Sort each tier
    Object.keys(categorizedTasks).forEach(tier => {
      categorizedTasks[tier as keyof typeof categorizedTasks] = 
        sortTier(categorizedTasks[tier as keyof typeof categorizedTasks]);
    });
    
    // Combine tiers in order and take first 4
    return [
      ...categorizedTasks.tier1,
      ...categorizedTasks.tier2,
      ...categorizedTasks.tier3,
      ...categorizedTasks.tier4,
      ...categorizedTasks.tier5,
      ...categorizedTasks.tier6,
    ].slice(0, 4);
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

      <div className={`max-w-7xl mx-auto ${isMobile ? 'px-3 py-4' : 'px-4 sm:px-6 lg:px-8 py-8'} relative`}>
        {/* Quick Actions - All 8 buttons in a single row on desktop, 2 rows of 4 on mobile */}
        {!isMobile && (
        <div className="grid grid-cols-8 gap-2 mb-6">
          <Link href="/tasks">
            <Card className="hover:shadow-xl transition-all cursor-pointer bg-slate-800/60 backdrop-blur-md border-2 border-purple-500/30 hover:border-purple-400/60 group">
              <CardContent className="p-3 text-center">
                <CheckCircle className="w-6 h-6 mx-auto mb-1 text-purple-400 group-hover:text-purple-300 transition-colors" />
                <h3 className="text-xs font-medium text-yellow-100 font-serif">Tasks</h3>
              </CardContent>
            </Card>
          </Link>

          <Link href="/skills">
            <Card className="hover:shadow-xl transition-all cursor-pointer bg-slate-800/60 backdrop-blur-md border-2 border-blue-500/30 hover:border-blue-400/60 group">
              <CardContent className="p-3 text-center">
                <Sparkles className="w-6 h-6 mx-auto mb-1 text-blue-400 group-hover:text-blue-300 transition-colors" />
                <h3 className="text-xs font-medium text-yellow-100 font-serif">Skills</h3>
              </CardContent>
            </Card>
          </Link>

          <Link href="/shop">
            <Card className="hover:shadow-xl transition-all cursor-pointer bg-slate-800/60 backdrop-blur-md border-2 border-green-500/30 hover:border-green-400/60 group">
              <CardContent className="p-3 text-center">
                <ShoppingCart className="w-6 h-6 mx-auto mb-1 text-green-400 group-hover:text-green-300 transition-colors" />
                <h3 className="text-xs font-medium text-yellow-100 font-serif">Shop</h3>
              </CardContent>
            </Card>
          </Link>

          <Link href="/recycling-bin">
            <Card className="hover:shadow-xl transition-all cursor-pointer bg-slate-800/60 backdrop-blur-md border-2 border-orange-500/30 hover:border-orange-400/60 group">
              <CardContent className="p-3 text-center">
                <Trash2 className="w-6 h-6 mx-auto mb-1 text-orange-400 group-hover:text-orange-300 transition-colors" />
                <h3 className="text-xs font-medium text-yellow-100 font-serif">Recycle</h3>
              </CardContent>
            </Card>
          </Link>

          <Link href="/npcs">
            <Card className="hover:shadow-xl transition-all cursor-pointer bg-slate-800/60 backdrop-blur-md border-2 border-cyan-500/30 hover:border-cyan-400/60 group">
              <CardContent className="p-3 text-center">
                <User className="w-6 h-6 mx-auto mb-1 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                <h3 className="text-xs font-medium text-yellow-100 font-serif">NPCs</h3>
              </CardContent>
            </Card>
          </Link>

          <Link href="/calendar">
            <Card className="hover:shadow-xl transition-all cursor-pointer bg-slate-800/60 backdrop-blur-md border-2 border-pink-500/30 hover:border-pink-400/60 group">
              <CardContent className="p-3 text-center">
                <Calendar className="w-6 h-6 mx-auto mb-1 text-pink-400 group-hover:text-pink-300 transition-colors" />
                <h3 className="text-xs font-medium text-yellow-100 font-serif">Calendar</h3>
              </CardContent>
            </Card>
          </Link>

          <Link href="/settings">
            <Card className="hover:shadow-xl transition-all cursor-pointer bg-slate-800/60 backdrop-blur-md border-2 border-yellow-500/30 hover:border-yellow-400/60 group">
              <CardContent className="p-3 text-center">
                <Settings className="w-6 h-6 mx-auto mb-1 text-yellow-400 group-hover:text-yellow-300 transition-colors" />
                <h3 className="text-xs font-medium text-yellow-100 font-serif">Settings</h3>
              </CardContent>
            </Card>
          </Link>

          <Card className="hover:shadow-xl transition-all cursor-pointer bg-slate-800/60 backdrop-blur-md border-2 border-gray-500/30 hover:border-gray-400/60 group">
            <CardContent className="p-3 text-center">
              <Target className="w-6 h-6 mx-auto mb-1 text-gray-400 group-hover:text-gray-300 transition-colors" />
              <h3 className="text-xs font-medium text-yellow-100 font-serif">More</h3>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Mobile: First row of 4 */}
        {isMobile && (
        <div className="grid grid-cols-4 gap-2 mb-2">
          <Link href="/tasks">
            <Card className="hover:shadow-xl transition-all cursor-pointer bg-slate-800/60 backdrop-blur-md border-2 border-purple-500/30 hover:border-purple-400/60 group h-full">
              <CardContent className="p-2 text-center flex flex-col items-center justify-center h-full">
                <CheckCircle className="w-6 h-6 mb-1 text-purple-400 group-hover:text-purple-300 transition-colors" />
                <h3 className="text-[10px] leading-tight text-yellow-100 font-serif">Tasks</h3>
              </CardContent>
            </Card>
          </Link>

          <Link href="/skills">
            <Card className="hover:shadow-xl transition-all cursor-pointer bg-slate-800/60 backdrop-blur-md border-2 border-blue-500/30 hover:border-blue-400/60 group h-full">
              <CardContent className="p-2 text-center flex flex-col items-center justify-center h-full">
                <Sparkles className="w-6 h-6 mb-1 text-blue-400 group-hover:text-blue-300 transition-colors" />
                <h3 className="text-[10px] leading-tight text-yellow-100 font-serif">Skills</h3>
              </CardContent>
            </Card>
          </Link>

          <Link href="/shop">
            <Card className="hover:shadow-xl transition-all cursor-pointer bg-slate-800/60 backdrop-blur-md border-2 border-green-500/30 hover:border-green-400/60 group h-full">
              <CardContent className="p-2 text-center flex flex-col items-center justify-center h-full">
                <ShoppingCart className="w-6 h-6 mb-1 text-green-400 group-hover:text-green-300 transition-colors" />
                <h3 className="text-[10px] leading-tight text-yellow-100 font-serif">Shop</h3>
              </CardContent>
            </Card>
          </Link>

          <Link href="/recycling-bin">
            <Card className="hover:shadow-xl transition-all cursor-pointer bg-slate-800/60 backdrop-blur-md border-2 border-orange-500/30 hover:border-orange-400/60 group h-full">
              <CardContent className="p-2 text-center flex flex-col items-center justify-center h-full">
                <Trash2 className="w-6 h-6 mb-1 text-orange-400 group-hover:text-orange-300 transition-colors" />
                <h3 className="text-[10px] leading-tight text-yellow-100 font-serif">Recycle</h3>
              </CardContent>
            </Card>
          </Link>
        </div>
        )}

        {/* Mobile: Second row of 4 */}
        {isMobile && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <Link href="/npcs">
            <Card className="hover:shadow-xl transition-all cursor-pointer bg-slate-800/60 backdrop-blur-md border-2 border-cyan-500/30 hover:border-cyan-400/60 group h-full">
              <CardContent className="p-2 text-center flex flex-col items-center justify-center h-full">
                <User className="w-6 h-6 mb-1 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                <h3 className="text-[10px] leading-tight text-yellow-100 font-serif">NPCs</h3>
              </CardContent>
            </Card>
          </Link>

          <Link href="/calendar">
            <Card className="hover:shadow-xl transition-all cursor-pointer bg-slate-800/60 backdrop-blur-md border-2 border-pink-500/30 hover:border-pink-400/60 group h-full">
              <CardContent className="p-2 text-center flex flex-col items-center justify-center h-full">
                <Calendar className="w-6 h-6 mb-1 text-pink-400 group-hover:text-pink-300 transition-colors" />
                <h3 className="text-[10px] leading-tight text-yellow-100 font-serif">Calendar</h3>
              </CardContent>
            </Card>
          </Link>

          <Link href="/settings">
            <Card className="hover:shadow-xl transition-all cursor-pointer bg-slate-800/60 backdrop-blur-md border-2 border-yellow-500/30 hover:border-yellow-400/60 group h-full">
              <CardContent className="p-2 text-center flex flex-col items-center justify-center h-full">
                <Settings className="w-6 h-6 mb-1 text-yellow-400 group-hover:text-yellow-300 transition-colors" />
                <h3 className="text-[10px] leading-tight text-yellow-100 font-serif">Settings</h3>
              </CardContent>
            </Card>
          </Link>

          <Card className="hover:shadow-xl transition-all cursor-pointer bg-slate-800/60 backdrop-blur-md border-2 border-gray-500/30 hover:border-gray-400/60 group h-full">
            <CardContent className="p-2 text-center flex flex-col items-center justify-center h-full">
              <Target className="w-6 h-6 mb-1 text-gray-400 group-hover:text-gray-300 transition-colors" />
              <h3 className="text-[10px] leading-tight text-yellow-100 font-serif">More</h3>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Active Questlines Section */}
        <Card className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-md border-2 border-purple-600/40 hover:border-purple-500/60 transition-all mb-6">
          <CardContent className={isMobile ? 'p-3' : 'p-3'}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4'} text-purple-400`} />
                <h3 className={`${isMobile ? 'text-sm' : 'text-sm'} font-serif font-bold text-purple-100`}>Active Questlines</h3>
              </div>
              <Link href="/campaigns">
                <Button variant="outline" size="sm" className={`h-7 px-3 ${isMobile ? 'text-xs' : 'text-xs'} border-purple-600/40 bg-slate-700/50 text-purple-200 hover:bg-purple-600/20 hover:text-purple-100 hover:border-purple-500/60`}>
                  <Target className="w-3 h-3 mr-1" />
                  Manage
                </Button>
              </Link>
            </div>

            {/* No Campaigns Selected State */}
            {selectedCampaigns.length === 0 ? (
              <div className="text-center py-6">
                <Target className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} text-purple-400/40 mx-auto mb-3`} />
                <h4 className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold text-purple-200 mb-1`}>No Active Questlines</h4>
                <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-purple-300/70 mb-3 max-w-md mx-auto`}>
                  Select up to 2 questlines from the Questlines page to track your major life objectives.
                </p>
                <Link href="/campaigns">
                  <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 h-8 text-xs">
                    <Plus className="w-3 h-3 mr-1" />
                    Select Questlines
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedCampaigns.map((campaign) => (
                  <Card 
                    key={campaign.id}
                    className="bg-slate-800/60 border-purple-500/30 hover:border-purple-400/50 transition-all cursor-pointer"
                    onClick={() => toggleCampaign(campaign.id)}
                  >
                    <CardContent className="p-3">
                      {/* Collapsed View */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-xs font-serif font-semibold text-purple-100">
                              {campaign.title}
                            </h4>
                            <span className="text-[10px] font-bold text-purple-200">{campaign.progress}%</span>
                          </div>
                          <Progress value={campaign.progress} className="h-1.5 bg-slate-700/50 mb-1">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all" 
                              style={{ width: `${campaign.progress}%` }} 
                            />
                          </Progress>
                          {!expandedCampaigns[campaign.id] && (
                            <p className="text-[9px] text-purple-300/70 line-clamp-1">{campaign.description}</p>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="ml-3 text-purple-300 hover:text-purple-100 h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCampaign(campaign.id);
                          }}
                        >
                          {expandedCampaigns[campaign.id] ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </div>

                      {/* Expanded View */}
                      {expandedCampaigns[campaign.id] && (
                        <div className="mt-3 pt-3 border-t border-purple-500/20">
                          <p className="text-[10px] text-purple-200/80 mb-3">{campaign.description}</p>
                          
                          {/* Quest Steps */}
                          <div className="space-y-1.5">
                            {campaign.quests.map((quest) => (
                              <div 
                                key={quest.id}
                                className="flex items-center gap-2 p-1.5 rounded bg-slate-900/40"
                              >
                                {quest.status === 'completed' && (
                                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                                )}
                                {quest.status === 'in-progress' && (
                                  <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                                    <div className="w-2.5 h-2.5 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
                                  </div>
                                )}
                                {quest.status === 'locked' && (
                                  <div className="w-4 h-4 flex-shrink-0 rounded-full bg-slate-600/50 flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  </div>
                                )}
                                <span className={`text-[10px] ${
                                  quest.status === 'completed' ? 'text-green-300' :
                                  quest.status === 'in-progress' ? 'text-yellow-200 font-medium' :
                                  'text-slate-400'
                                }`}>
                                  Quest {quest.id}: {quest.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Two-by-two grid layout for web (Skills, Schedule, Priorities, Finances), stacked for mobile */}
        <div className={`${!isMobile ? 'grid grid-cols-2 gap-6' : 'space-y-6'} mb-8`}>
          {/* Top Left - Skills Overview */}
          <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30 hover:border-yellow-500/50 transition-all h-full">
            <CardHeader className="border-b border-yellow-600/20 pb-3">
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
            <CardContent className="pt-4 pb-4 flex items-center justify-center">
              <Dialog>
                <DialogTrigger asChild>
                  <div className="cursor-pointer relative group w-full">
                    <div className={`${!isMobile ? 'scale-[0.6]' : 'scale-[0.5]'} origin-center transform ${!isMobile ? '-my-16' : '-my-28'}`}>
                      {skillsLoading ? (
                        <div className="flex items-center justify-center h-[400px] text-yellow-200/60">
                          Loading skills...
                        </div>
                      ) : (
                        <SpiderChart skills={safeSkills} />
                      )}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
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
                  {skillsLoading ? (
                    <div className="flex items-center justify-center h-[500px] text-yellow-200/60">
                      Loading skills...
                    </div>
                  ) : (
                    <SpiderChart skills={safeSkills} />
                  )}
                  <div className="mt-4 text-center">
                    <p className="text-sm text-yellow-200/80">
                      Complete quests to level up your skills and expand your constellation
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Top Right - Today's Schedule */}
          <TodayCalendarWidget />

          {/* Bottom Left - Top Priority Tasks */}
          <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30 hover:border-yellow-500/50 transition-all h-full">
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
                <div className="space-y-3 max-h-[280px] overflow-y-auto">
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

          {/* Bottom Right - Finance Widget */}
          <FinanceWidget />
        </div>
      </div>
    </div>
  );
}
