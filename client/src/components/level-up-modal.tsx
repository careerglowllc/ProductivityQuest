import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Star, Sparkles, Zap } from "lucide-react";
import { getSkillIcon } from "@/lib/skillIcons";

interface LevelUpSkill {
  skillName: string;
  skillIcon: string;
  newLevel: number;
  currentXP: number;
  maxXP: number;
}

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  skills: LevelUpSkill[];
}

export function LevelUpModal({ isOpen, onClose, skills }: LevelUpModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentSkill = skills[currentIndex];

  useEffect(() => {
    if (!isOpen || !currentSkill) return;

    // Show each skill level-up for 3 seconds
    const timer = setTimeout(() => {
      if (currentIndex < skills.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // All skills shown, close modal
        onClose();
        setCurrentIndex(0); // Reset for next time
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isOpen, currentIndex, skills.length, onClose, currentSkill]);

  if (!currentSkill) return null;

  const Icon = getSkillIcon(currentSkill.skillIcon);
  const progressPercent = (currentSkill.currentXP / currentSkill.maxXP) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gradient-to-b from-purple-900 via-purple-950 to-indigo-950 border-2 border-purple-500/50 shadow-2xl shadow-purple-600/30">
        {/* Animated background particles */}
        <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden rounded-lg">
          <div className="absolute top-10 left-10 w-2 h-2 bg-purple-200 rounded-full animate-ping"></div>
          <div className="absolute top-20 right-20 w-2 h-2 bg-blue-200 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
          <div className="absolute bottom-20 left-20 w-2 h-2 bg-purple-300 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-10 right-10 w-2 h-2 bg-blue-300 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
          <div className="absolute top-1/2 left-1/4 w-1 h-1 bg-yellow-200 rounded-full animate-ping" style={{animationDelay: '0.3s'}}></div>
          <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-purple-200 rounded-full animate-pulse" style={{animationDelay: '0.8s'}}></div>
        </div>
        
        <div className="text-center py-8 relative z-10">
          {/* Level Up Badge */}
          <div className="relative inline-block mb-6 animate-in zoom-in-50 duration-500">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-purple-600/50 animate-pulse">
              <Star className="w-12 h-12 text-yellow-300 fill-yellow-300" />
            </div>
            {/* Sparkle effects */}
            <Sparkles className="w-8 h-8 text-yellow-400 absolute -top-2 -right-2 animate-spin" style={{animationDuration: '3s'}} />
            <Zap className="w-6 h-6 text-purple-300 absolute -bottom-2 -left-2 animate-bounce" />
            <Sparkles className="w-6 h-6 text-purple-300 absolute top-0 left-0 animate-pulse" style={{animationDelay: '0.5s'}} />
          </div>
          
          {/* Level Up Message */}
          <h3 className="text-3xl font-serif font-bold text-purple-100 mb-2 animate-in slide-in-from-bottom-4 duration-700">
            Level Up!
          </h3>
          
          {/* Skill Icon */}
          <div className="relative w-20 h-20 mx-auto mb-4 animate-in zoom-in-95 duration-500" style={{animationDelay: '0.2s'}}>
            <div className="absolute inset-0 bg-gradient-to-b from-purple-400/20 to-purple-600/20 rounded-2xl"></div>
            <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-purple-500/60 bg-slate-700/30">
              {/* Background */}
              <div className="absolute inset-0 bg-gradient-to-b from-slate-600/40 to-slate-700/60"></div>
              
              {/* Purple fill from bottom based on XP */}
              <div 
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-purple-600 to-purple-400 transition-all duration-1000 ease-out"
                style={{ 
                  height: `${Math.min(progressPercent, 100)}%`,
                  boxShadow: '0 0 20px rgba(168, 85, 247, 0.5)'
                }}
              ></div>
              
              {/* Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Icon 
                  className="h-10 w-10 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" 
                  strokeWidth={2.5}
                  fill="currentColor"
                />
              </div>
            </div>
          </div>

          {/* Skill Name */}
          <p className="text-2xl font-bold text-purple-200 mb-2 animate-in slide-in-from-bottom-3 duration-700" style={{animationDelay: '0.3s'}}>
            {currentSkill.skillName}
          </p>
          
          {/* New Level */}
          <div className="inline-block bg-purple-700/50 border-2 border-purple-400/50 rounded-lg px-8 py-4 mb-4 animate-in zoom-in-90 duration-500" style={{animationDelay: '0.4s'}}>
            <p className="text-purple-200/80 text-sm mb-1">Reached Level</p>
            <div className="flex items-center justify-center gap-2">
              <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
              <span className="text-4xl font-bold text-yellow-300">{currentSkill.newLevel}</span>
            </div>
          </div>

          {/* XP Progress */}
          <div className="animate-in fade-in-0 duration-700" style={{animationDelay: '0.5s'}}>
            <div className="bg-slate-800/50 rounded-full h-3 overflow-hidden border border-purple-500/30 mb-2">
              <div 
                className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-1000 ease-out shadow-lg shadow-purple-500/50"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <p className="text-sm text-purple-300/80">
              {currentSkill.currentXP} / {currentSkill.maxXP} XP
            </p>
          </div>

          {/* Multiple skills indicator */}
          {skills.length > 1 && (
            <div className="mt-6 flex gap-2 justify-center">
              {skills.map((_, index) => (
                <div 
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex 
                      ? 'bg-purple-400 w-6' 
                      : index < currentIndex 
                        ? 'bg-purple-600/50' 
                        : 'bg-purple-800/30'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
