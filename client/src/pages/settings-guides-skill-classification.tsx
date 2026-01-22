import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Brain, Sparkles, Target, TrendingUp, CheckCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function SkillClassificationGuidePage() {
  const isMobile = useIsMobile();

  return (
    <div className={`min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 ${!isMobile ? 'pt-16' : ''} pb-24 relative overflow-hidden`}>
      {/* Starfield Background Effect */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-10 left-10 w-1 h-1 bg-yellow-200 rounded-full animate-pulse"></div>
        <div className="absolute top-20 right-20 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-40 left-1/4 w-1 h-1 bg-purple-200 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-3xl mx-auto">
          {/* Back Button */}
          <Link href="/settings/guides">
            <Button 
              variant="ghost" 
              className="mb-6 text-yellow-200/80 hover:text-yellow-100 hover:bg-slate-800/50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Guides
            </Button>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-serif font-bold text-yellow-100">Skill Classification Guide</h1>
            </div>
            <p className="text-lg text-yellow-200/80">Learn how AI categorizes your tasks and adapts to your unique journey</p>
          </div>

          {/* Content Sections */}
          <div className="space-y-6">
            {/* Privacy Notice */}
            <Card className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 backdrop-blur-md border-2 border-indigo-600/40">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🔒</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-indigo-200 mb-2">Your Data Is Completely Private</h3>
                    <p className="text-sm text-yellow-200/80 leading-relaxed">
                      All training data is <span className="font-semibold text-yellow-100">isolated to your account</span>. Your adjustments train the AI specifically for YOUR journey - not for everyone else. Other users never see or benefit from your categorization preferences.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 1: How It Works */}
            <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Sparkles className="w-6 h-6 text-yellow-400 mt-1" />
                  <div>
                    <h2 className="text-xl font-serif font-bold text-yellow-100 mb-2">How AI Classification Works</h2>
                    <p className="text-yellow-200/80 leading-relaxed">
                      ProductivityQuest uses AI to automatically categorize your tasks into skill areas. When you create or import tasks, our AI analyzes the title and description to suggest which skills you're developing.
                    </p>
                  </div>
                </div>
                
                <div className="bg-slate-900/40 rounded-lg p-4 border border-slate-700/50">
                  <p className="text-sm text-yellow-200/70 mb-2">Example:</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-100">"Morning meditation session"</span>
                      <span className="text-yellow-200/60">→</span>
                      <Badge className="bg-emerald-900/40 text-emerald-200 border-emerald-600/40">Mindset</Badge>
                      <Badge className="bg-pink-900/40 text-pink-200 border-pink-600/40">Health</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-100">"Build a wooden shelf"</span>
                      <span className="text-yellow-200/60">→</span>
                      <Badge className="bg-amber-900/40 text-amber-200 border-amber-600/40">Craftsman</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Starting Point */}
            <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-blue-600/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Target className="w-6 h-6 text-blue-400 mt-1" />
                  <div>
                    <h2 className="text-xl font-serif font-bold text-yellow-100 mb-2">It's Just a Starting Point</h2>
                    <p className="text-yellow-200/80 leading-relaxed mb-3">
                      The AI provides intelligent suggestions, but <span className="font-semibold text-yellow-100">every person's journey is unique</span>. What counts as "Scholar" work for one person might be "Merchant" work for another, depending on your goals and context.
                    </p>
                    <p className="text-yellow-200/70 text-sm italic">
                      For instance, reading a business book could be Scholar (learning), Merchant (business knowledge), or both - it's up to you!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 3: How to Adjust */}
            <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-emerald-600/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-emerald-400 mt-1" />
                  <div>
                    <h2 className="text-xl font-serif font-bold text-yellow-100 mb-3">How to Adjust Classifications</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-yellow-100 mb-2">Method 1: After Categorization</h3>
                        <ol className="list-decimal list-inside space-y-2 text-yellow-200/80 ml-2">
                          <li>Select tasks and click "Categorize with AI"</li>
                          <li>A success notification appears with an "Adjust Skills" button</li>
                          <li>Click the button to review each task</li>
                          <li>Check/uncheck skills using the checkboxes</li>
                          <li>Click "Confirm" to save your changes</li>
                        </ol>
                      </div>

                      <div className="bg-slate-900/40 rounded-lg p-4 border border-slate-700/50">
                        <p className="text-xs text-yellow-200/60 mb-2">💡 Pro Tip:</p>
                        <p className="text-sm text-yellow-200/70">
                          The adjustment modal shows AI's reasoning, helping you understand why it chose certain skills. You can learn from this and make more informed corrections.
                        </p>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-yellow-100 mb-2">Method 2: Task Detail View</h3>
                        <ol className="list-decimal list-inside space-y-2 text-yellow-200/80 ml-2">
                          <li>Click any task to open its detail modal</li>
                          <li>Scroll to the "Skill Tags" section</li>
                          <li>Add or remove skills as needed</li>
                          <li>Changes save automatically</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 4: Learning Over Time */}
            <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-purple-600/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <TrendingUp className="w-6 h-6 text-purple-400 mt-1" />
                  <div>
                    <h2 className="text-xl font-serif font-bold text-yellow-100 mb-2">AI Fine-Tunes to Your Journey</h2>
                    <p className="text-yellow-200/80 leading-relaxed mb-4">
                      Here's the magic: <span className="font-semibold text-yellow-100">every adjustment you make trains the AI</span>. When you correct a categorization, that becomes a learning example for future tasks.
                    </p>

                    <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-lg p-4 border border-purple-600/30">
                      <h3 className="text-md font-semibold text-purple-200 mb-3">The Learning Process:</h3>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs text-purple-200">1</span>
                          </div>
                          <p className="text-sm text-yellow-200/80">AI suggests skills based on general patterns</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs text-purple-200">2</span>
                          </div>
                          <p className="text-sm text-yellow-200/80">You adjust to match your personal interpretation</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs text-purple-200">3</span>
                          </div>
                          <p className="text-sm text-yellow-200/80">Your correction is stored as a training example</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs text-purple-200">4</span>
                          </div>
                          <p className="text-sm text-yellow-200/80">Future similar tasks use your preferences as guidance</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs text-emerald-200">✓</span>
                          </div>
                          <p className="text-sm text-emerald-200 font-medium">Over time, AI learns YOUR unique journey and categorizes like you would!</p>
                        </div>
                      </div>
                    </div>

                    <p className="text-yellow-200/70 text-sm mt-4 italic">
                      The more you adjust, the smarter it gets. After 10-20 corrections, you'll notice the AI matching your style much more accurately.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conclusion */}
            <Card className="bg-gradient-to-br from-yellow-900/20 to-amber-900/20 backdrop-blur-md border-2 border-yellow-600/40">
              <CardContent className="p-6">
                <h2 className="text-xl font-serif font-bold text-yellow-100 mb-3">Bottom Line</h2>
                <p className="text-yellow-200/80 leading-relaxed mb-3">
                  Think of the AI as a learning assistant, not a rigid system. It starts with good general knowledge, but it's designed to adapt to <span className="font-semibold text-yellow-100">your specific goals and interpretations</span>.
                </p>
                <p className="text-yellow-200/80 leading-relaxed">
                  Don't hesitate to adjust classifications - you're not correcting "mistakes," you're teaching the AI about your unique productivity journey. The system gets better with every adjustment you make.
                </p>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="flex gap-3">
              <Link href="/tasks" className="flex-1">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                  Try Categorization Now
                </Button>
              </Link>
              <Link href="/settings/guides" className="flex-1">
                <Button variant="outline" className="w-full">
                  Back to Guides
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
