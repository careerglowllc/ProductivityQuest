import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  Target, 
  Brain, 
  Sparkles, 
  Heart, 
  CheckCircle2, 
  ArrowRight,
  Lightbulb,
  Zap,
  TrendingUp,
  Edit3
} from "lucide-react";

export default function GettingStarted() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 py-12 px-4">
      {/* Starfield Background Effect */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-10 left-10 w-1 h-1 bg-yellow-200 rounded-full animate-pulse"></div>
        <div className="absolute top-20 right-20 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-40 left-1/4 w-1 h-1 bg-purple-200 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-60 right-1/3 w-1 h-1 bg-yellow-200 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-yellow-600/50">
              <Trophy className="w-10 h-10 text-slate-900" />
            </div>
          </div>
          <h1 className="text-4xl font-serif font-bold text-yellow-100 mb-4">
            Welcome to ProductivityQuest
          </h1>
          <p className="text-yellow-200/80 text-lg">
            Your journey to gamified productivity begins here
          </p>
        </div>

        {/* Why Gamification Works */}
        <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30 p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Brain className="w-8 h-8 text-yellow-400" />
            <h2 className="text-2xl font-serif font-bold text-yellow-100">
              Why Gamification Works
            </h2>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-yellow-600/20 rounded-lg flex items-center justify-center border border-yellow-600/40">
                  <Zap className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-yellow-100 mb-2">
                  Humans Are Wired for Progress
                </h3>
                <p className="text-yellow-200/70">
                  Our brains release dopamine when we achieve goals and see visible progress. 
                  ProductivityQuest taps into this natural reward system, making every completed 
                  task a victory that drives you forward.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center border border-purple-600/40">
                  <Heart className="w-6 h-6 text-purple-400" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-yellow-100 mb-2">
                  Balance Work & Life with Reward Systems
                </h3>
                <p className="text-yellow-200/70">
                  Earn gold for completing tasks, level up skills that matter to you, and use 
                  rewards to maintain balance. The game mechanics help you see the value in both 
                  work and personal growth, creating sustainable productivity.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center border border-blue-600/40">
                  <Target className="w-6 h-6 text-blue-400" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-yellow-100 mb-2">
                  Transform Big Goals into Actionable Steps
                </h3>
                <p className="text-yellow-200/70">
                  Writing down your goals and breaking them into quests forces clarity. 
                  Big, overwhelming projects become manageable when split into smaller, 
                  reward-worthy tasks. You'll see exactly what needs to be done and feel 
                  accomplished with each step.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Customization & Your Journey */}
        <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-purple-600/30 p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-8 h-8 text-purple-400" />
            <h2 className="text-2xl font-serif font-bold text-yellow-100">
              Make It Your Own
            </h2>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center border border-green-600/40">
                  <Edit3 className="w-6 h-6 text-green-400" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-yellow-100 mb-2">
                  This Is Your Baseline
                </h3>
                <p className="text-yellow-200/70">
                  ProductivityQuest comes with default skills (Craftsman, Artist, Physical, etc.) 
                  and templates, but these are just starting points. Use your imagination to create 
                  custom skills that align with YOUR life goals. Edit the templates, adjust the 
                  formulas, and build a system that works for you.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center border border-orange-600/40">
                  <Lightbulb className="w-6 h-6 text-orange-400" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-yellow-100 mb-2">
                  Examples of Custom Skills
                </h3>
                <p className="text-yellow-200/70 mb-2">
                  Think beyond the defaults:
                </p>
                <ul className="text-yellow-200/70 space-y-1 list-disc list-inside ml-4">
                  <li>Language Learning (track your Spanish, Japanese, etc.)</li>
                  <li>Parenting (quality time with your kids)</li>
                  <li>Investment Knowledge (studying stocks, real estate)</li>
                  <li>Cooking Mastery (trying new recipes, meal prep)</li>
                  <li>Music Production (hours spent creating beats)</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        {/* Realistic Expectations */}
        <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-red-600/30 p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-8 h-8 text-red-400" />
            <h2 className="text-2xl font-serif font-bold text-yellow-100">
              The Truth About This App
            </h2>
          </div>

          <div className="space-y-4">
            <div className="bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
              <p className="text-yellow-100 font-semibold mb-2">
                ⚠️ This is NOT an instant gratification app
              </p>
              <p className="text-yellow-200/70">
                Most productivity apps promise quick wins and easy results. ProductivityQuest 
                is different. It requires dedication, honest effort, and the discipline to put 
                in the work. You won't level up by checking your phone—you level up by doing 
                the actual tasks.
              </p>
            </div>

            <div className="bg-green-900/20 border-l-4 border-green-500 p-4 rounded">
              <p className="text-yellow-100 font-semibold mb-2">
                ✨ But it's immensely rewarding
              </p>
              <p className="text-yellow-200/70">
                When you commit to the system and track your real progress, something magical 
                happens. You'll see your skills grow, your gold accumulate, and your actual 
                life improve. The gamification isn't just for fun—it's a mirror showing you 
                the progress you're making in reality.
              </p>
            </div>

            <div className="bg-purple-900/20 border-l-4 border-purple-500 p-4 rounded">
              <p className="text-yellow-100 font-semibold mb-2">
                🚀 Life-changing potential
              </p>
              <p className="text-yellow-200/70">
                Users who stick with it report profound changes: better work-life balance, 
                clearer goals, tangible skill development, and the satisfaction of seeing 
                their growth visualized. This isn't a game you play—it's a life you build.
              </p>
            </div>
          </div>
        </Card>

        {/* Getting Started Steps */}
        <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30 p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle2 className="w-8 h-8 text-yellow-400" />
            <h2 className="text-2xl font-serif font-bold text-yellow-100">
              Your First Steps
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center text-slate-900 font-bold">
                1
              </div>
              <div>
                <h4 className="text-yellow-100 font-semibold mb-1">Review Your Skills</h4>
                <p className="text-yellow-200/70 text-sm">
                  Check out the Skills page. Do the default skills align with your goals? 
                  Create custom skills for areas you want to develop.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center text-slate-900 font-bold">
                2
              </div>
              <div>
                <h4 className="text-yellow-100 font-semibold mb-1">Create Your First Quest</h4>
                <p className="text-yellow-200/70 text-sm">
                  Add a real task you need to complete. Set the importance, duration, and 
                  let the AI categorize which skills it develops.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center text-slate-900 font-bold">
                3
              </div>
              <div>
                <h4 className="text-yellow-100 font-semibold mb-1">Complete It & Feel the Rush</h4>
                <p className="text-yellow-200/70 text-sm">
                  When you finish the task, mark it complete. Watch the gold roll in, see 
                  your skills level up, and experience the satisfaction of progress.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center text-slate-900 font-bold">
                4
              </div>
              <div>
                <h4 className="text-yellow-100 font-semibold mb-1">Build Your System</h4>
                <p className="text-yellow-200/70 text-sm">
                  Integrate with Notion, set up recurring quests, customize your workflow. 
                  Make ProductivityQuest fit seamlessly into your daily routine.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Call to Action */}
        <div className="text-center">
          <Link href="/tasks">
            <Button className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-slate-900 text-lg px-8 py-6 font-semibold shadow-lg shadow-yellow-600/30">
              Start Your First Quest
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <p className="text-yellow-200/60 text-sm mt-4">
            Your adventure begins now. Make it count.
          </p>
        </div>

        {/* Back to Settings */}
        <div className="text-center mt-8">
          <Link href="/settings">
            <Button variant="ghost" className="text-yellow-300 hover:text-yellow-100 hover:bg-slate-700/50">
              ← Back to Settings
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
