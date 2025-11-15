import { useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Trophy, Coins, Sparkles } from "lucide-react";
import { getSkillIcon } from "@/lib/skillIcons";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface SkillXPGain {
  skillName: string;
  xpGained: number;
  newXP: number;
  newLevel: number;
}

interface CompletionAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  task: any;
  newGoldTotal: number;
  skillXPGains?: SkillXPGain[];
}

export function CompletionAnimation({ isOpen, onClose, task, newGoldTotal, skillXPGains = [] }: CompletionAnimationProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose, task, skillXPGains]);

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gradient-to-b from-slate-800 via-slate-900 to-indigo-950 border-2 border-yellow-500/50 shadow-2xl shadow-yellow-600/20">
        <VisuallyHidden>
          <DialogTitle>Quest Complete</DialogTitle>
        </VisuallyHidden>
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
          
          {/* Gold Earned */}
          <div className="inline-block bg-slate-700/50 border-2 border-yellow-500/40 rounded-lg px-6 py-3 mb-4">
            <p className="text-yellow-200/70 text-sm mb-1">Reward Earned</p>
            <div className="flex items-center justify-center space-x-2">
              <Coins className="w-6 h-6 text-yellow-400" />
              <span className="text-2xl font-bold text-yellow-400">+{task.goldValue}</span>
              <span className="text-yellow-200/80 text-lg">Gold</span>
            </div>
          </div>

          {/* Skill XP Gains */}
          {skillXPGains && skillXPGains.length > 0 && (
            <div className="space-y-3 mb-4">
              <p className="text-yellow-200/70 text-sm">Skills Leveled</p>
              <div className="flex flex-wrap gap-3 justify-center">
                {skillXPGains.map((gain) => {
                  const Icon = getSkillIcon(gain.skillName);
                  const maxXP = 100; // You might want to get this from the skill data
                  const progressPercent = (gain.newXP / maxXP) * 100;
                  
                  return (
                    <div key={gain.skillName} className="bg-slate-700/50 border-2 border-purple-500/40 rounded-lg p-3 min-w-[120px]">
                      {/* Skill Icon with fill animation */}
                      <div className="relative w-16 h-16 mx-auto mb-2">
                        <div className="absolute inset-0 bg-gradient-to-b from-purple-400/10 to-purple-600/10 rounded-2xl"></div>
                        <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-purple-600/40 bg-slate-700/30">
                          {/* Gray background */}
                          <div className="absolute inset-0 bg-gradient-to-b from-slate-600/40 to-slate-700/60"></div>
                          
                          {/* Purple fill from bottom based on XP */}
                          <div 
                            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-purple-600 to-purple-400 transition-all duration-1000 ease-out"
                            style={{ 
                              height: `${Math.min(progressPercent, 100)}%`,
                              boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)'
                            }}
                          ></div>
                          
                          {/* Icon */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Icon 
                              className="h-8 w-8 text-slate-900/80 drop-shadow-lg" 
                              strokeWidth={2.5}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Skill Name */}
                      <p className="text-xs font-semibold text-purple-200 text-center mb-1">
                        {gain.skillName}
                      </p>
                      
                      {/* XP Gained */}
                      <div className="text-center">
                        <span className="text-lg font-bold text-purple-400">+{gain.xpGained}</span>
                        <span className="text-xs text-purple-300/70 ml-1">XP</span>
                      </div>
                      
                      {/* Level badge */}
                      <p className="text-xs text-purple-300/60 text-center mt-1">
                        Lvl {gain.newLevel}
                      </p>
                    </div>
                  );
                })}
              </div>
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
