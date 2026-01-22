import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HelpCircle, Activity, Brain, Briefcase, Book, Users, Network, Wrench, Palette, Sword, Edit3, Save, X, Compass } from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface WhySkillsModalProps {
  open: boolean;
  onClose: () => void;
}

export function WhySkillsModal({ open, onClose }: WhySkillsModalProps) {
  const isMobile = useIsMobile();
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
      <DialogContent className={`${isMobile ? 'max-w-full w-[calc(100%-2rem)] max-h-[calc(100%-4rem)] my-8 mx-4 rounded-xl p-4' : 'max-w-3xl max-h-[85vh] p-6'} overflow-y-auto bg-gradient-to-br from-slate-800 via-slate-900 to-purple-900 border-2 border-yellow-600/30 text-yellow-100`}>
        <DialogHeader>
          <DialogTitle className={`${isMobile ? 'text-lg pr-10' : 'text-2xl pr-20'} font-serif text-yellow-100 flex items-center gap-2`}>
            <HelpCircle className={`${isMobile ? 'h-4 w-4' : 'h-6 w-6'} text-yellow-400`} />
            Why These Skills?
          </DialogTitle>
          
          {/* Edit link - positioned below title on mobile to avoid overlap */}
          {!isEditing && (
            <button
              onClick={() => {
                setCustomGoals(loadedCustomGoals || "");
                setIsEditing(true);
              }}
              className={`${isMobile ? 'relative top-0 right-0 mt-2 text-[11px]' : 'absolute top-4 right-12 text-xs'} text-yellow-400/70 hover:text-yellow-300 underline flex items-center gap-1`}
            >
              <Edit3 className={`${isMobile ? 'h-3 w-3' : 'h-3 w-3'}`} />
              {hasCustomGoals ? "Edit your goals" : "Not you? Write your own"}
            </button>
          )}
        </DialogHeader>
        
        {isEditing ? (
          // Edit Mode
          <div className={isMobile ? 'space-y-3' : 'space-y-4'}>
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
          <div className={`${isMobile ? 'space-y-3' : 'space-y-4'} text-yellow-200/90`}>
            <div className={`bg-slate-800/50 backdrop-blur-sm rounded-lg ${isMobile ? 'p-3' : 'p-6'} border border-yellow-600/20`}>
              <pre className={`whitespace-pre-wrap font-sans ${isMobile ? 'text-xs' : 'text-sm'} leading-relaxed`}>
                {loadedCustomGoals}
              </pre>
            </div>
            
            <div className={`${isMobile ? 'pt-3' : 'pt-4'} border-t border-yellow-600/20`}>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-yellow-200/70 italic text-center`}>
                Track your progress across these dimensions. Each completed task brings you closer to the life you envision.
              </p>
            </div>
          </div>
        ) : (
          // Default Goals View
        <div className={`${isMobile ? 'space-y-3' : 'space-y-6'} text-yellow-200/90`}>
          <p className={`${isMobile ? 'text-sm' : 'text-lg'} leading-relaxed text-yellow-100/90 italic border-l-4 border-yellow-600/50 pl-4`}>
            Each skill represents a macro life goal — a dimension of growth that leads to a fulfilling, powerful, and meaningful life.
          </p>

          {/* Health */}
          <div className={`bg-slate-800/50 backdrop-blur-sm rounded-lg ${isMobile ? 'p-3' : 'p-4'} border border-yellow-600/20`}>
            <div className="flex items-start gap-3 mb-2">
              <Activity className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-green-400 mt-1 flex-shrink-0`} />
              <div>
                <h3 className={`text-yellow-100 font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>Health & Athlete</h3>
                <p className={`text-yellow-200/80 mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  <span className="font-semibold text-yellow-100">Goal:</span> Body with good health, minimal aches/pains, peak physical fitness and athletic ability.
                </p>
              </div>
            </div>
          </div>

          {/* Mindset */}
          <div className={`bg-slate-800/50 backdrop-blur-sm rounded-lg ${isMobile ? 'p-3' : 'p-4'} border border-yellow-600/20`}>
            <div className="flex items-start gap-3 mb-2">
              <Brain className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-purple-400 mt-1 flex-shrink-0`} />
              <div>
                <h3 className={`text-yellow-100 font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>Mindset</h3>
                <p className={`text-yellow-200/80 mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  <span className="font-semibold text-yellow-100">Goal:</span> Positive, clear, peaceful mindset — removed mental clutter, feeling alpha, masculine, capable, and content. Masculinely confident, secure, and at peace.
                </p>
              </div>
            </div>
          </div>

          {/* Merchant */}
          <div className={`bg-slate-800/50 backdrop-blur-sm rounded-lg ${isMobile ? 'p-3' : 'p-4'} border border-yellow-600/20`}>
            <div className="flex items-start gap-3 mb-2">
              <Briefcase className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-yellow-400 mt-1 flex-shrink-0`} />
              <div>
                <h3 className={`text-yellow-100 font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>Merchant</h3>
                <p className={`text-yellow-200/80 mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  <span className="font-semibold text-yellow-100">Goal:</span> Power and freedom — high status, financial and geographic freedom to pursue what I want. Free from blackmail, coercion, and limiting vices.
                </p>
              </div>
            </div>
          </div>

          {/* Scholar */}
          <div className={`bg-slate-800/50 backdrop-blur-sm rounded-lg ${isMobile ? 'p-3' : 'p-4'} border border-yellow-600/20`}>
            <div className="flex items-start gap-3 mb-2">
              <Book className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-blue-400 mt-1 flex-shrink-0`} />
              <div>
                <h3 className={`text-yellow-100 font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>Scholar</h3>
                <p className={`text-yellow-200/80 mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  <span className="font-semibold text-yellow-100">Goal:</span> Meaning and purpose — existential resonance. Strong emotional tie and authenticity in what I do, work on, and who I engage with.
                </p>
              </div>
            </div>
          </div>

          {/* Charisma & Connector */}
          <div className={`bg-slate-800/50 backdrop-blur-sm rounded-lg ${isMobile ? 'p-3' : 'p-4'} border border-yellow-600/20`}>
            <div className="flex items-start gap-3 mb-2">
              <Users className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-pink-400 mt-1 flex-shrink-0`} />
              <Network className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-cyan-400 mt-1 flex-shrink-0`} />
              <div>
                <h3 className={`text-yellow-100 font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>Charisma & Connector</h3>
                <p className={`text-yellow-200/80 mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  <span className="font-semibold text-yellow-100">Goal:</span> Meaningful, valuable relationships — respected by high-value men, desired by attractive women. Being my authentic self, not an act or fake. Possibly includes strong connected family, traditional or unconventional.
                </p>
              </div>
            </div>
          </div>

          {/* Physical */}
          <div className={`bg-slate-800/50 backdrop-blur-sm rounded-lg ${isMobile ? 'p-3' : 'p-4'} border border-yellow-600/20`}>
            <div className="flex items-start gap-3 mb-2">
              <Sword className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-red-400 mt-1 flex-shrink-0`} />
              <div>
                <h3 className={`text-yellow-100 font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>Physical</h3>
                <p className={`text-yellow-200/80 mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  <span className="font-semibold text-yellow-100">Goal:</span> Complete physical mastery — martial arts, strength, tactical proficiency. Pairs with power, freedom, and meaningful relationships with high-status individuals.
                </p>
              </div>
            </div>
          </div>

          {/* Artist & Craftsman */}
          <div className={`bg-slate-800/50 backdrop-blur-sm rounded-lg ${isMobile ? 'p-3' : 'p-4'} border border-yellow-600/20`}>
            <div className="flex items-start gap-3 mb-2">
              <Palette className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-orange-400 mt-1 flex-shrink-0`} />
              <Wrench className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-amber-400 mt-1 flex-shrink-0`} />
              <div>
                <h3 className={`text-yellow-100 font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>Artist & Craftsman</h3>
                <p className={`text-yellow-200/80 mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  <span className="font-semibold text-yellow-100">Goal:</span> Create, build, and express yourself authentically through your work and craft. Bring ideas to life through art and physical creation. Mental zest for making things real.
                </p>
              </div>
            </div>
          </div>

          {/* Explorer */}
          <div className={`bg-slate-800/50 backdrop-blur-sm rounded-lg ${isMobile ? 'p-3' : 'p-4'} border border-yellow-600/20`}>
            <div className="flex items-start gap-3 mb-2">
              <Compass className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-emerald-400 mt-1 flex-shrink-0`} />
              <div>
                <h3 className={`text-yellow-100 font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>Explorer</h3>
                <p className={`text-yellow-200/80 mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  <span className="font-semibold text-yellow-100">Goal:</span> You only have one life — answer the call to adventure. Explore the world, embrace new experiences, try exotic foods, immerse yourself in different cultures. Each new adventure enriches your soul and expands your perspective. Personal growth through discovery and the courage to step into the unknown. Life is meant to be experienced, not just observed.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={`${isMobile ? 'pt-3' : 'pt-4'} border-t border-yellow-600/20`}>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-yellow-200/70 italic text-center`}>
              Track your progress across these dimensions. Each completed task brings you closer to the life you envision.
            </p>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
