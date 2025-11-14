import { useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Trophy, Coins, Sparkles } from "lucide-react";

interface CompletionAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  task: any;
  newGoldTotal: number;
}

export function CompletionAnimation({ isOpen, onClose, task, newGoldTotal }: CompletionAnimationProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

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
          
          {/* Gold Earned */}
          <div className="inline-block bg-slate-700/50 border-2 border-yellow-500/40 rounded-lg px-6 py-3 mb-4">
            <p className="text-yellow-200/70 text-sm mb-1">Reward Earned</p>
            <div className="flex items-center justify-center space-x-2">
              <Coins className="w-6 h-6 text-yellow-400" />
              <span className="text-2xl font-bold text-yellow-400">+{task.goldValue}</span>
              <span className="text-yellow-200/80 text-lg">Gold</span>
            </div>
          </div>
          
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
