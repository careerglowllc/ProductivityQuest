import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Target, TrendingUp, Timer, Award, BookOpen, Dumbbell, DollarSign, Users } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function MeasureWhatMattersGuidePage() {
  const isMobile = useIsMobile();

  return (
    <div className={`min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 ${!isMobile ? 'pt-16' : ''} pb-24 relative overflow-hidden`}>
      {/* Starfield Background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-yellow-200 rounded-full animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-4xl mx-auto">
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
          <Card className="bg-gradient-to-br from-purple-900/40 to-slate-800/60 backdrop-blur-md border-2 border-purple-500/40 mb-8">
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-serif font-bold text-yellow-100">Measure What Matters</h1>
                  <p className="text-purple-200/80 mt-1">The Science of Quantitative Goals in Gamification</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Introduction */}
          <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30 mb-6">
            <CardContent className="p-6">
              <h2 className="text-2xl font-serif font-bold text-yellow-100 mb-4 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-yellow-400" />
                Why Quantitative Goals?
              </h2>
              <div className="space-y-4 text-yellow-200/80">
                <p>
                  The foundation of effective gamification lies in <span className="text-yellow-300 font-semibold">measurable, quantitative goals</span>. 
                  This principle, inspired by the book "Measure What Matters" by John Doerr, emphasizes that what gets measured gets improved.
                </p>
                <p>
                  In gamification, <span className="text-yellow-300 font-semibold">numbers are the primary mechanism</span> for tracking progress, 
                  earning rewards, and creating that satisfying sense of achievement. While not perfect for every aspect of life, 
                  quantitative goals maximize the effectiveness of your personal growth journey.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Two Key Reasons */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-blue-500/30">
              <CardContent className="p-6">
                <h3 className="text-xl font-serif font-bold text-yellow-100 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  Track Progress & Improve
                </h3>
                <p className="text-yellow-200/80">
                  Quantitative goals provide clear, objective feedback on your progress. You can see exactly where you started, 
                  how far you've come, and what's left to achieve. This clarity drives continuous improvement.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-green-500/30">
              <CardContent className="p-6">
                <h3 className="text-xl font-serif font-bold text-yellow-100 mb-3 flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-400" />
                  Enable True Gamification
                </h3>
                <p className="text-yellow-200/80">
                  Numbers unlock XP gains, level progression, and milestone achievements. Without quantification, 
                  gamification loses its power. Metrics transform vague aspirations into concrete, achievable targets.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Real-World Examples */}
          <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30 mb-6">
            <CardContent className="p-6">
              <h2 className="text-2xl font-serif font-bold text-yellow-100 mb-4 flex items-center gap-2">
                <Target className="w-6 h-6 text-yellow-400" />
                Examples: Qualitative to Quantitative
              </h2>
              <div className="space-y-4">
                <div className="bg-slate-900/40 p-4 rounded-lg border border-purple-500/20">
                  <div className="flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-purple-400 mt-1" />
                    <div>
                      <p className="text-yellow-100 font-semibold mb-1">Learning a Language</p>
                      <p className="text-red-300/70 line-through mb-1">❌ "Learn Spanish"</p>
                      <p className="text-green-300">✅ "Score 85% on Spanish proficiency test"</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/40 p-4 rounded-lg border border-purple-500/20">
                  <div className="flex items-start gap-3">
                    <Dumbbell className="w-5 h-5 text-blue-400 mt-1" />
                    <div>
                      <p className="text-yellow-100 font-semibold mb-1">Physical Fitness</p>
                      <p className="text-red-300/70 line-through mb-1">❌ "Get stronger"</p>
                      <p className="text-green-300">✅ "Bench press 225 lbs for 5 reps"</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/40 p-4 rounded-lg border border-purple-500/20">
                  <div className="flex items-start gap-3">
                    <Timer className="w-5 h-5 text-green-400 mt-1" />
                    <div>
                      <p className="text-yellow-100 font-semibold mb-1">Running Performance</p>
                      <p className="text-red-300/70 line-through mb-1">❌ "Run faster"</p>
                      <p className="text-green-300">✅ "Complete a mile in under 7 minutes"</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/40 p-4 rounded-lg border border-purple-500/20">
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-yellow-400 mt-1" />
                    <div>
                      <p className="text-yellow-100 font-semibold mb-1">Professional Networking</p>
                      <p className="text-red-300/70 line-through mb-1">❌ "Expand my network"</p>
                      <p className="text-green-300">✅ "Build a rolodex of 500+ professional contacts"</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/40 p-4 rounded-lg border border-purple-500/20">
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-green-400 mt-1" />
                    <div>
                      <p className="text-yellow-100 font-semibold mb-1">Financial Success</p>
                      <p className="text-red-300/70 line-through mb-1">❌ "Make more money"</p>
                      <p className="text-green-300">✅ "Earn $150,000 in annual income"</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 10,000 Hours Concept */}
          <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30 mb-6">
            <CardContent className="p-6">
              <h2 className="text-2xl font-serif font-bold text-yellow-100 mb-4 flex items-center gap-2">
                <Timer className="w-6 h-6 text-yellow-400" />
                The 10,000 Hours Framework
              </h2>
              <div className="space-y-4 text-yellow-200/80">
                <p>
                  Malcolm Gladwell popularized the concept that <span className="text-yellow-300 font-semibold">10,000 hours of deliberate practice</span> leads 
                  to mastery in any field. While the exact number varies, the principle holds: skill acquisition follows a logarithmic curve.
                </p>
                
                <div className="bg-slate-900/40 p-5 rounded-lg border border-yellow-500/20">
                  <h3 className="text-lg font-semibold text-yellow-100 mb-3">Key Milestones on the Path to Mastery</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-green-900/30 text-green-300 border-green-500/30">500 hours</Badge>
                      <p className="text-yellow-200/80">Competent beginner - you "get good" at the skill</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-blue-900/30 text-blue-300 border-blue-500/30">5,000 hours</Badge>
                      <p className="text-yellow-200/80">Half-mastery - professional-level competence</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-purple-900/30 text-purple-300 border-purple-500/30">10,000 hours</Badge>
                      <p className="text-yellow-200/80">Full mastery - world-class expertise</p>
                    </div>
                  </div>
                </div>

                <p>
                  Because skill growth follows a <span className="text-yellow-300 font-semibold">logarithmic curve</span>, the first few hundred hours 
                  yield dramatic improvements. You might become "pretty good" at singing after just 500 hours of focused practice!
                </p>

                <div className="bg-indigo-900/30 p-5 rounded-lg border border-indigo-500/30">
                  <h3 className="text-lg font-semibold text-yellow-100 mb-3">Breaking It Down: Milestone Example</h3>
                  <p className="text-yellow-200/80 mb-3">
                    Let's say your goal is 500 hours to become proficient at singing. Break this into <span className="text-yellow-300 font-semibold">50-hour milestones</span>:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-slate-900/40 p-2 rounded border border-yellow-500/20 text-center">
                      <p className="text-yellow-300 font-semibold">50 hours</p>
                      <p className="text-yellow-200/60">10% progress</p>
                    </div>
                    <div className="bg-slate-900/40 p-2 rounded border border-yellow-500/20 text-center">
                      <p className="text-yellow-300 font-semibold">100 hours</p>
                      <p className="text-yellow-200/60">20% progress</p>
                    </div>
                    <div className="bg-slate-900/40 p-2 rounded border border-yellow-500/20 text-center">
                      <p className="text-yellow-300 font-semibold">150 hours</p>
                      <p className="text-yellow-200/60">30% progress</p>
                    </div>
                    <div className="bg-slate-900/40 p-2 rounded border border-yellow-500/20 text-center">
                      <p className="text-yellow-300 font-semibold">...</p>
                      <p className="text-yellow-200/60">Continue to 500</p>
                    </div>
                  </div>
                  <p className="text-yellow-200/80 mt-3 text-sm">
                    Each 50-hour milestone becomes a concrete, gamifiable achievement with XP rewards and visual progress!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Call to Action */}
          <Card className="bg-gradient-to-br from-purple-900/40 to-slate-800/60 backdrop-blur-md border-2 border-purple-500/40">
            <CardContent className="p-6">
              <h2 className="text-2xl font-serif font-bold text-yellow-100 mb-4 flex items-center gap-2">
                <Award className="w-6 h-6 text-purple-400" />
                Start Measuring Today
              </h2>
              <div className="space-y-4 text-yellow-200/80">
                <p>
                  The key takeaway: <span className="text-yellow-300 font-semibold">convert your qualitative life goals into quantitative, measurable targets</span>. 
                  Even if a goal seems inherently qualitative (like "be a better friend"), challenge yourself to find metrics that correlate with success.
                </p>
                <p>
                  Use ProductivityQuest to track these numbers through custom skills, milestones, and hour-based progression. 
                  Watch as vague aspirations transform into concrete achievements, complete with XP gains, level-ups, and satisfying visual progress.
                </p>
                <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-500/30 mt-4">
                  <p className="text-yellow-100 font-semibold text-center">
                    Remember: What gets measured gets improved. 📊✨
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
