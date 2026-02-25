import { useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Trophy, Coins, Sparkles } from "lucide-react";
import { getSkillIcon } from "@/lib/skillIcons";

interface SkillXPGain {
  skillName: string;
  xpGained: number;
  newXP: number;
  newLevel: number;
  maxXP: number;
  skillIcon?: string;
}

interface UserSkill {
  id: number;
  skillName: string;
  skillIcon: string;
  currentXP: number;
  currentLevel: number;
}

interface CompletionAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  task: any;
  newGoldTotal: number;
  skillXPGains?: SkillXPGain[];
  skills?: UserSkill[];
}

export function CompletionAnimation({ isOpen, onClose, task, newGoldTotal, skillXPGains = [], skills = [] }: CompletionAnimationProps) {
  console.log('🎨 CompletionAnimation render:', {
    isOpen,
    task: task?.title,
    skillXPGains,
    skillXPGainsLength: skillXPGains?.length,
    hasSkillXPGains: skillXPGains && skillXPGains.length > 0,
    skills
  });

  useEffect(() => {
    if (isOpen) {
      console.log('🎨 CompletionAnimation opened with:', {
        task: task?.title,
        skillXPGains,
        skillXPGainsLength: skillXPGains.length
      });
      const timer = setTimeout(() => {
        onClose();
      }, 4000); // Extended to 4 seconds to show skills
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose, skillXPGains]);

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gradient-to-b from-slate-800 via-slate-900 to-indigo-950 border-2 border-yellow-500/50 shadow-2xl shadow-yellow-600/20">
        {/* Starfield effect */}
        <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden rounded-lg">
          <div className="absolute top-5 left-5 w-1 h-1 bg-yellow-200 rounded-full animate-pulse"></div>
          <div className="absolute top-10 right-10 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
          <div className="absolute bottom-10 left-10 w-1 h-1 bg-purple-200 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-5 right-5 w-1 h-1 bg-yellow-200 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
        </div>
        
        <div className="text-center py-8 relative z-10">
          {/* Animated Trophy */}
          <div className="relative inline-block mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto animate-pulse shadow-lg shadow-yellow-600/50">
              <Trophy className="w-10 h-10 text-slate-900" />
            </div>
            {/* Sparkle effects */}
            <Sparkles className="w-6 h-6 text-yellow-400 absolute -top-2 -right-2 animate-ping" />
            <Sparkles className="w-4 h-4 text-yellow-300 absolute -bottom-1 -left-1 animate-pulse" style={{animationDelay: '0.3s'}} />
          </div>
          
          {/* Quest Complete Message */}
          <h3 className="text-3xl font-serif font-bold text-yellow-100 mb-3">
            Quest Complete!
          </h3>
          
          {/* Task Title */}
          <p className="text-yellow-200/80 mb-4 text-sm px-4">
            {task.title}
          </p>
          
          {/* Gold Earned - Horizontal Bar Chart */}
          <div className="bg-slate-700/50 border-2 border-yellow-500/40 rounded-lg px-5 py-4 mb-4 w-full">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Coins className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-200/70 text-sm font-medium">Gold Earned</span>
              </div>
              <span className="text-lg font-bold text-yellow-400">+{task.goldValue}</span>
            </div>
            <div className="w-full h-4 bg-slate-600/60 rounded-full overflow-hidden border border-yellow-600/30">
              <div 
                className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(234,179,8,0.4)]"
                style={{ width: `${Math.min((task.goldValue / 100) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-yellow-200/40">0</span>
              <span className="text-[10px] text-yellow-200/40">100 gold</span>
            </div>
          </div>

          {/* Skill XP Gains - Horizontal Bar Charts */}
          {skillXPGains && skillXPGains.length > 0 ? (
            <div className="bg-slate-700/50 border-2 border-purple-500/40 rounded-lg px-5 py-4 mb-4 w-full animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
              <p className="text-purple-200/70 text-sm font-medium mb-3">Skill XP Earned</p>
              <div className="space-y-3">
                {skillXPGains.map((gain, index) => {
                  let iconName = gain.skillIcon;
                  if (!iconName) {
                    const skill = skills.find(s => s.skillName === gain.skillName);
                    iconName = skill?.skillIcon;
                  }
                  const Icon = getSkillIcon(iconName);
                  const progressPercent = (gain.newXP / gain.maxXP) * 100;
                  
                  return (
                    <div 
                      key={gain.skillName}
                      className="animate-in fade-in-0 slide-in-from-left-4 duration-300"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-purple-600/40 rounded-md flex items-center justify-center">
                            <Icon className="h-3.5 w-3.5 text-purple-200" strokeWidth={2.5} />
                          </div>
                          <span className="text-xs font-semibold text-purple-200">{gain.skillName}</span>
                          <span className="text-[10px] text-purple-400/60">Lvl {gain.newLevel}</span>
                        </div>
                        <span className="text-sm font-bold text-purple-400">+{gain.xpGained} XP</span>
                      </div>
                      <div className="w-full h-3 bg-slate-600/60 rounded-full overflow-hidden border border-purple-600/30">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(168,85,247,0.4)]"
                          style={{ width: `${Math.min(progressPercent, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[10px] text-purple-300/40">{gain.newXP}/{gain.maxXP} XP</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <p className="text-yellow-200/50 text-xs">No skill XP gains (task may not have skills categorized)</p>
            </div>
          )}
          
          {/* Total Gold */}
          <div className="pt-4 border-t border-yellow-600/30">
            <p className="text-yellow-200/60 text-xs mb-2">Total Gold</p>
            <div className="flex items-center justify-center space-x-2">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="text-xl font-bold text-yellow-100">{newGoldTotal}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
