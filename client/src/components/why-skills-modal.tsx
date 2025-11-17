import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HelpCircle, Activity, Brain, Briefcase, Book, Users, Network, Wrench, Palette, Sword, Edit3, Save, X } from "lucide-react";
import { useState } from "react";

interface WhySkillsModalProps {
  open: boolean;
  onClose: () => void;
}

export function WhySkillsModal({ open, onClose }: WhySkillsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [customGoals, setCustomGoals] = useState("");

  // Load custom goals from localStorage on mount
  const loadedCustomGoals = typeof window !== 'undefined' 
    ? localStorage.getItem('customMacroGoals') 
    : null;

  const handleSaveCustomGoals = () => {
    localStorage.setItem('customMacroGoals', customGoals);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setCustomGoals(loadedCustomGoals || "");
    setIsEditing(false);
  };

  const hasCustomGoals = loadedCustomGoals && loadedCustomGoals.trim().length > 0;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-slate-800 via-slate-900 to-purple-900 border-2 border-yellow-600/30 text-yellow-100 max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-yellow-100 flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-yellow-400" />
            Why These Skills?
          </DialogTitle>
          
          {/* Edit link in corner */}
          {!isEditing && (
            <button
              onClick={() => {
                setCustomGoals(loadedCustomGoals || "");
                setIsEditing(true);
              }}
              className="absolute top-4 right-12 text-xs text-yellow-400/70 hover:text-yellow-300 underline flex items-center gap-1"
            >
              <Edit3 className="h-3 w-3" />
              {hasCustomGoals ? "Edit your goals" : "Not you? Write your own"}
            </button>
          )}
        </DialogHeader>
        
        {isEditing ? (
          // Edit Mode
          <div className="space-y-4">
            <p className="text-sm text-yellow-200/80">
              Write your own macro life goals and justifications for why you're tracking these skills. This will replace the default content.
            </p>
            
            <Textarea
              value={customGoals}
              onChange={(e) => setCustomGoals(e.target.value)}
              placeholder="Example:&#10;&#10;🎯 My Life Goals&#10;&#10;• Health & Fitness - I want to feel strong and energetic...&#10;• Career Success - Building wealth to support my family...&#10;• Relationships - Deep connections with loved ones..."
              className="min-h-[400px] bg-slate-900/50 border-yellow-600/30 text-yellow-100 placeholder:text-yellow-200/40"
            />
            
            <div className="flex gap-3 justify-end">
              <Button
                onClick={handleCancelEdit}
                variant="outline"
                className="bg-slate-800/50 hover:bg-slate-700/50 text-yellow-200 border-yellow-600/40"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveCustomGoals}
                className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Goals
              </Button>
            </div>
          </div>
        ) : hasCustomGoals ? (
          // Custom Goals View
          <div className="space-y-4 text-yellow-200/90">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-yellow-600/20">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {loadedCustomGoals}
              </pre>
            </div>
            
            <div className="pt-4 border-t border-yellow-600/20">
              <p className="text-sm text-yellow-200/70 italic text-center">
                Track your progress across these dimensions. Each completed task brings you closer to the life you envision.
              </p>
            </div>
          </div>
        ) : (
          // Default Goals View
        <div className="space-y-6 text-yellow-200/90">
          <p className="text-lg leading-relaxed text-yellow-100/90 italic border-l-4 border-yellow-600/50 pl-4">
            Each skill represents a macro life goal — a dimension of growth that leads to a fulfilling, powerful, and meaningful life.
          </p>

          {/* Health */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-yellow-600/20">
            <div className="flex items-start gap-3 mb-2">
              <Activity className="h-5 w-5 text-green-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-yellow-100 font-bold text-lg">Health & Athlete</h3>
                <p className="text-yellow-200/80 mt-1">
                  <span className="font-semibold text-yellow-100">Goal:</span> Body with good health, minimal aches/pains, peak physical fitness and athletic ability.
                </p>
              </div>
            </div>
          </div>

          {/* Mindset */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-yellow-600/20">
            <div className="flex items-start gap-3 mb-2">
              <Brain className="h-5 w-5 text-purple-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-yellow-100 font-bold text-lg">Mindset</h3>
                <p className="text-yellow-200/80 mt-1">
                  <span className="font-semibold text-yellow-100">Goal:</span> Positive, clear, peaceful mindset — removed mental clutter, feeling alpha, masculine, capable, and content. Masculinely confident, secure, and at peace.
                </p>
              </div>
            </div>
          </div>

          {/* Merchant */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-yellow-600/20">
            <div className="flex items-start gap-3 mb-2">
              <Briefcase className="h-5 w-5 text-yellow-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-yellow-100 font-bold text-lg">Merchant</h3>
                <p className="text-yellow-200/80 mt-1">
                  <span className="font-semibold text-yellow-100">Goal:</span> Power and freedom — high status, financial and geographic freedom to pursue what I want. Free from blackmail, coercion, and limiting vices.
                </p>
              </div>
            </div>
          </div>

          {/* Scholar */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-yellow-600/20">
            <div className="flex items-start gap-3 mb-2">
              <Book className="h-5 w-5 text-blue-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-yellow-100 font-bold text-lg">Scholar</h3>
                <p className="text-yellow-200/80 mt-1">
                  <span className="font-semibold text-yellow-100">Goal:</span> Meaning and purpose — existential resonance. Strong emotional tie and authenticity in what I do, work on, and who I engage with.
                </p>
              </div>
            </div>
          </div>

          {/* Charisma & Connector */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-yellow-600/20">
            <div className="flex items-start gap-3 mb-2">
              <Users className="h-5 w-5 text-pink-400 mt-1 flex-shrink-0" />
              <Network className="h-5 w-5 text-cyan-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-yellow-100 font-bold text-lg">Charisma & Connector</h3>
                <p className="text-yellow-200/80 mt-1">
                  <span className="font-semibold text-yellow-100">Goal:</span> Meaningful, valuable relationships — respected by high-value men, desired by attractive women. Being my authentic self, not an act or fake. Possibly includes strong connected family, traditional or unconventional.
                </p>
              </div>
            </div>
          </div>

          {/* Physical */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-yellow-600/20">
            <div className="flex items-start gap-3 mb-2">
              <Sword className="h-5 w-5 text-red-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-yellow-100 font-bold text-lg">Physical</h3>
                <p className="text-yellow-200/80 mt-1">
                  <span className="font-semibold text-yellow-100">Goal:</span> Complete physical mastery — martial arts, strength, tactical proficiency. Pairs with power, freedom, and meaningful relationships with high-status individuals.
                </p>
              </div>
            </div>
          </div>

          {/* Artist & Craftsman */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-yellow-600/20">
            <div className="flex items-start gap-3 mb-2">
              <Palette className="h-5 w-5 text-orange-400 mt-1 flex-shrink-0" />
              <Wrench className="h-5 w-5 text-amber-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-yellow-100 font-bold text-lg">Artist & Craftsman</h3>
                <p className="text-yellow-200/80 mt-1">
                  <span className="font-semibold text-yellow-100">Goal:</span> Adventure — see the world, do new things, embrace what life has to offer. Create, build, and express yourself authentically through your work and experiences. Mental zest for life and excitement for the future.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-yellow-600/20">
            <p className="text-sm text-yellow-200/70 italic text-center">
              Track your progress across these dimensions. Each completed task brings you closer to the life you envision.
            </p>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
