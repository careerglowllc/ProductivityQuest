import { useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Trophy, Coins } from "lucide-react";

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
      <DialogContent className="max-w-md border-none shadow-2xl">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Quest Complete!</h3>
          <p className="text-gray-600 mb-4">
            You earned <span className="font-semibold text-yellow-600">+{task.goldValue} Gold</span>
          </p>
          <div className="flex items-center justify-center space-x-2">
            <Coins className="w-6 h-6 text-yellow-600" />
            <span className="text-2xl font-bold text-gray-900">{newGoldTotal} Gold</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
