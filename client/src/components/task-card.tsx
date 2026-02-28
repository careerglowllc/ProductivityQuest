import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Calendar, Coins, AlertTriangle, Zap, Repeat, Apple, Brain, Users, DollarSign, Target, Mountain, Zap as Power, Activity, Info, Wrench, Palette, Briefcase, Sword, Book, Network, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TaskDetailModal } from "./task-detail-modal";
import { SkillAdjustmentModal } from "./skill-adjustment-modal";
import { EmojiPicker } from "./emoji-picker";
import { getSkillIcon } from "@/lib/skillIcons";
import type { UserSkill } from "@/../../shared/schema";

// Fallback skill icon mapping for default skills
const skillIcons: Record<string, any> = {
  Craftsman: Wrench,
  Artist: Palette,
  Mindset: Brain,
  Merchant: Briefcase,
  Physical: Sword,
  Scholar: Book,
  Health: Activity,
  Connector: Network,
  Charisma: Users,
};

// Default skill color mapping
const skillColors: Record<string, string> = {
  Craftsman: "bg-amber-900/40 text-amber-200 border-amber-600/40",
  Artist: "bg-purple-900/40 text-purple-200 border-purple-600/40",
  Mindset: "bg-emerald-900/40 text-emerald-200 border-emerald-600/40",
  Merchant: "bg-green-900/40 text-green-200 border-green-600/40",
  Physical: "bg-red-900/40 text-red-200 border-red-600/40",
  Scholar: "bg-blue-900/40 text-blue-200 border-blue-600/40",
  Health: "bg-pink-900/40 text-pink-200 border-pink-600/40",
  Connector: "bg-cyan-900/40 text-cyan-200 border-cyan-600/40",
  Charisma: "bg-indigo-900/40 text-indigo-200 border-indigo-600/40",
};

interface TaskCardProps {
  task: {
    id: number;
    title: string;
    description: string;
    details?: string;
    duration: number;
    goldValue: number;
    dueDate: string | null;
    completed: boolean;
    completedAt: string | null;
    importance?: string;
    kanbanStage?: string;
    recurType?: string;
    businessWorkFilter?: string;
    apple?: boolean;
    smartPrep?: boolean;
    delegationTask?: boolean;
    velin?: boolean;
    skillTags?: string[];
    emoji?: string;
  };
  onSelect: (taskId: number, selected: boolean) => void;
  isSelected: boolean;
  isCompact?: boolean;
}

export function TaskCard({ task, onSelect, isSelected, isCompact = false }: TaskCardProps) {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const queryClient = useQueryClient();
  
  // Double-tap / double-click detection
  const lastTapTimeRef = useRef<number>(0);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCardClick = useCallback(() => {
    if (task.completed) return;
    
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;
    
    if (timeSinceLastTap < 350 && timeSinceLastTap > 0) {
      // Double-tap/double-click → open detail modal
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      lastTapTimeRef.current = 0;
      setShowDetailModal(true);
    } else {
      // First tap → delay selection to allow for second tap
      lastTapTimeRef.current = now;
      tapTimeoutRef.current = setTimeout(() => {
        onSelect(task.id, !isSelected);
        tapTimeoutRef.current = null;
      }, 350);
    }
  }, [task.id, task.completed, isSelected, onSelect]);
  
  const updateEmojiMutation = useMutation({
    mutationFn: async (emoji: string) => {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ emoji }),
      });
      if (!response.ok) throw new Error('Failed to update emoji');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
  });

  // Fetch user skills for dynamic rendering
  const { data: allSkills = [] } = useQuery<UserSkill[]>({
    queryKey: ["/api/skills"],
  });

  // Helper to get skill data by name
  const getSkillByName = (skillName: string) => {
    return allSkills.find(s => s.skillName === skillName);
  };

  // Helper to get skill icon component
  const getSkillIconComponent = (skillName: string) => {
    const skill = getSkillByName(skillName);
    if (skill?.skillIcon) {
      return getSkillIcon(skill.skillIcon);
    }
    return skillIcons[skillName] || Target;
  };

  // Helper to get skill color
  const getSkillColor = (skillName: string) => {
    const skill = getSkillByName(skillName);
    
    // If it's a custom skill, generate a color from the name
    if (skill?.isCustom) {
      const hash = skillName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const hue = hash % 360;
      return `bg-purple-900/40 text-purple-200 border-purple-600/40`;
    }
    
    // Otherwise use default color mapping
    return skillColors[skillName] || "bg-slate-700/40 text-slate-200 border-slate-600/40";
  };
  
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No due date";
    const date = new Date(dateString);
    // Use UTC components to avoid timezone shifting (dueDate is stored as midnight UTC)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
  };

  // Compact grid view version
  if (isCompact) {
    return (
      <>
        <Card 
          className={cn(
            "bg-slate-800/40 backdrop-blur-md border-2 transition-all relative h-full cursor-pointer",
            isSelected 
              ? "border-yellow-500/80 shadow-lg shadow-yellow-600/20 bg-slate-700/50" 
              : "border-yellow-600/20 hover:border-yellow-500/40 hover:shadow-lg hover:shadow-yellow-600/10",
            task.completed && "opacity-60"
          )}
          onClick={handleCardClick}
        >
          <CardContent className="p-3 flex flex-col gap-2">
            <div className="flex flex-col gap-2">
              {/* Title with emoji */}
              <div className="flex items-start gap-1.5">
                <span
                  className="text-base flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
                  onClick={(e) => e.stopPropagation()}
                >
                  <EmojiPicker
                    value={task.emoji || "📝"}
                    onChange={(emoji: string) => updateEmojiMutation.mutate(emoji)}
                    size="sm"
                  />
                </span>
                <h3 className={cn(
                  "text-sm font-semibold text-yellow-100 line-clamp-2 leading-tight pt-1",
                  task.completed && "line-through text-yellow-400/60"
                )}>
                  {task.title}
                </h3>
              </div>
              
              {/* Gold and Priority */}
              <div className="flex items-center justify-between gap-2">
                <Badge 
                  variant={task.completed ? "secondary" : "default"}
                  className={cn(
                    "flex items-center space-x-1 px-2 py-0.5 text-xs",
                    task.completed 
                      ? "bg-green-900/40 text-green-200 border border-green-600/40"
                      : "bg-gradient-to-r from-yellow-600/40 to-yellow-500/40 text-yellow-100 border border-yellow-600/50"
                  )}
                >
                  <Coins className="w-3 h-3" />
                  <span className="font-semibold">{task.goldValue}</span>
                </Badge>
                
                {task.importance && (
                  <span className="text-xs" title={task.importance}>
                    {task.importance === "Pareto" ? "🔥" : 
                     task.importance === "High" ? "🚨" : 
                     task.importance === "Med-High" ? "⚠️" : 
                     task.importance === "Medium" ? "📋" : 
                     task.importance === "Med-Low" ? "📝" : "📄"}
                  </span>
                )}
              </div>
              
              {/* Duration and Due Date */}
              <div className="flex items-center justify-between text-xs text-yellow-300/60 gap-2">
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration(task.duration)}</span>
                </div>
                {task.dueDate && (
                  <div className="flex items-center space-x-1 truncate">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{(() => { const d = new Date(task.dueDate); const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${m[d.getUTCMonth()]} ${d.getUTCDate()}`; })()}</span>
                  </div>
                )}
              </div>
              
              {/* Skill Tags - Show max 2 */}
              {task.skillTags && task.skillTags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {task.skillTags.slice(0, 2).map((skillName) => {
                    const SkillIcon = getSkillIconComponent(skillName);
                    
                    return (
                      <Badge 
                        key={skillName} 
                        variant="outline" 
                        className={cn("text-[10px] border px-1 py-0 cursor-pointer hover:brightness-125 transition-all", getSkillColor(skillName))}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSkillModal(true);
                        }}
                      >
                        <SkillIcon className="w-2.5 h-2.5 mr-0.5" />
                        {skillName.length > 8 ? skillName.substring(0, 8) + '...' : skillName}
                      </Badge>
                    );
                  })}
                  {task.skillTags.length > 2 && (
                    <span className="text-[10px] text-yellow-400/60">+{task.skillTags.length - 2}</span>
                  )}
                </div>
              )}
              
              {/* View Full button */}
              <div className="flex justify-center mt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-yellow-300/70 hover:text-yellow-100 hover:bg-slate-700/60"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDetailModal(true);
                  }}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View Full
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <TaskDetailModal 
          task={task}
          open={showDetailModal}
          onOpenChange={setShowDetailModal}
        />

        <SkillAdjustmentModal
          open={showSkillModal}
          onOpenChange={setShowSkillModal}
          tasks={[task]}
          onComplete={() => {
            setShowSkillModal(false);
            queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
          }}
        />
      </>
    );
  }

  // Full list view version
  return (
    <>
      <Card 
        className={cn(
          "bg-slate-800/40 backdrop-blur-md border-2 transition-all relative cursor-pointer",
          isSelected 
            ? "border-yellow-500/80 shadow-lg shadow-yellow-600/20 bg-slate-700/50" 
            : "border-yellow-600/20 hover:border-yellow-500/40 hover:shadow-lg hover:shadow-yellow-600/10",
          task.completed && "opacity-60"
        )}
        onClick={handleCardClick}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-1">
                <span
                  className="flex-shrink-0 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <EmojiPicker
                    value={task.emoji || "📝"}
                    onChange={(emoji: string) => updateEmojiMutation.mutate(emoji)}
                    size="md"
                  />
                </span>
                <div className="flex-1 min-w-0 pt-1">
                  <h3 className={cn(
                    "text-lg font-semibold text-yellow-100",
                    task.completed && "line-through text-yellow-400/60"
                  )}>
                    {task.title}
                  </h3>
                </div>
              </div>
              <p className="text-yellow-200/70 text-sm mb-2">
                {task.description}
              </p>
              <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-yellow-300/60 mb-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">{formatDuration(task.duration)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">{formatDate(task.dueDate)}</span>
                </div>
                {task.importance && (
                  <div className="flex items-center gap-1.5">
                    <span className="flex-shrink-0">{task.importance === "Pareto" ? "🔥" : task.importance === "High" ? "🚨" : task.importance === "Med-High" ? "⚠️" : task.importance === "Medium" ? "📋" : task.importance === "Med-Low" ? "📝" : "📄"}</span>
                    <span className="whitespace-nowrap">{task.importance}</span>
                  </div>
                )}
                {task.recurType && (
                  <div className="flex items-center gap-1.5">
                    <span className="flex-shrink-0">{task.recurType === "🔄Recurring" ? "🔄" : "⏳"}</span>
                    <span className="whitespace-nowrap">{task.recurType === "🔄Recurring" ? "Recurring" : "One-time"}</span>
                  </div>
                )}
                {task.completed && task.completedAt && (
                  <div className="flex items-center gap-1.5 text-green-400">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">Completed</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center flex-wrap gap-2">
                {task.importance && (
                  <Badge variant="outline" className={cn(
                    "text-xs border",
                    task.importance === "Pareto" && "bg-red-900/40 text-red-200 border-red-600/40",
                    task.importance === "High" && "bg-red-900/40 text-red-200 border-red-600/40",
                    task.importance === "Med-High" && "bg-orange-900/40 text-orange-200 border-orange-600/40",
                    task.importance === "Medium" && "bg-yellow-900/40 text-yellow-200 border-yellow-600/40",
                    task.importance === "Med-Low" && "bg-blue-900/40 text-blue-200 border-blue-600/40",
                    task.importance === "Low" && "bg-green-900/40 text-green-200 border-green-600/40"
                  )}>
                    {task.importance === "Pareto" && <Zap className="w-3 h-3 mr-1" />}
                    {task.importance === "High" && <AlertTriangle className="w-3 h-3 mr-1" />}
                    {task.importance}
                  </Badge>
                )}
                
                {task.recurType === "🔄Recurring" && (
                  <Badge variant="outline" className="text-xs bg-purple-900/40 text-purple-200 border-purple-600/40">
                    <Repeat className="w-3 h-3 mr-1" />
                    Recurring
                  </Badge>
                )}
                
                {/* Skill Tags */}
                {task.skillTags && task.skillTags.length > 0 && task.skillTags.map((skillName) => {
                  const SkillIcon = getSkillIconComponent(skillName);
                  const skill = getSkillByName(skillName);
                  
                  return (
                    <Badge 
                      key={skillName} 
                      variant="outline" 
                      className={cn("text-xs border cursor-pointer hover:brightness-125 transition-all", getSkillColor(skillName))}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSkillModal(true);
                      }}
                    >
                      <SkillIcon className="w-3 h-3 mr-1" />
                      {skillName}
                      {skill?.isCustom && (
                        <span className="ml-1 text-[9px] opacity-60">(custom)</span>
                      )}
                    </Badge>
                  );
                })}
                
                {/* Checkbox indicators */}
                <div className="flex items-center space-x-1">
                  {task.apple && (
                    <Badge variant="outline" className="text-xs bg-slate-700/40 text-slate-200 border-slate-600/40">
                      <Apple className="w-3 h-3 mr-1" />
                      Apple
                    </Badge>
                  )}
                  {task.smartPrep && (
                    <Badge variant="outline" className="text-xs bg-blue-900/40 text-blue-200 border-blue-600/40">
                      <Brain className="w-3 h-3 mr-1" />
                      SmartPrep
                    </Badge>
                  )}
                  {task.delegationTask && (
                    <Badge variant="outline" className="text-xs bg-green-900/40 text-green-200 border-green-600/40">
                      <Users className="w-3 h-3 mr-1" />
                      Delegation
                    </Badge>
                  )}
                  {task.velin && (
                    <Badge variant="outline" className="text-xs bg-purple-900/40 text-purple-200 border-purple-600/40">
                      Velin
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <Badge 
                variant={task.completed ? "secondary" : "default"}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1",
                  task.completed 
                    ? "bg-green-900/40 text-green-200 border border-green-600/40"
                    : "bg-gradient-to-r from-yellow-600/40 to-yellow-500/40 text-yellow-100 border border-yellow-600/50"
                )}
              >
                <Coins className="w-4 h-4 flex-shrink-0" />
                <span className="font-semibold whitespace-nowrap">{task.goldValue}</span>
              </Badge>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 text-xs text-yellow-300/70 hover:text-yellow-100 hover:bg-slate-700/60"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetailModal(true);
                }}
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                View Full
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <TaskDetailModal 
        task={task}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
      />

      <SkillAdjustmentModal
        open={showSkillModal}
        onOpenChange={setShowSkillModal}
        tasks={[task]}
        onComplete={() => {
          setShowSkillModal(false);
          queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        }}
      />
    </>
  );
}
