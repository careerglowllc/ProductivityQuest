import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Coins, Star } from "lucide-react";
import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 relative overflow-hidden">
      {/* Starfield Background Effect */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-10 left-10 w-1 h-1 bg-yellow-200 rounded-full animate-pulse"></div>
        <div className="absolute top-20 right-20 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-40 left-1/4 w-1 h-1 bg-purple-200 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-60 right-1/3 w-1 h-1 bg-yellow-200 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute top-32 right-1/2 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute bottom-20 left-1/3 w-1 h-1 bg-purple-200 rounded-full animate-pulse" style={{animationDelay: '2.5s'}}></div>
        <div className="absolute bottom-40 right-1/4 w-1 h-1 bg-yellow-200 rounded-full animate-pulse" style={{animationDelay: '3s'}}></div>
      </div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <Trophy className="text-yellow-400 w-16 h-16 mr-4" />
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-yellow-100">
              ProductivityQuest
            </h1>
          </div>
          <p className="text-xl text-yellow-200/80 mb-8 max-w-2xl mx-auto">
            Transform your productivity into an epic adventure. Complete quests, earn gold, and unlock rewards while mastering your skills with Notion and Google Calendar.
          </p>
          <div className="flex gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 bg-yellow-600 hover:bg-yellow-500 text-slate-900 font-bold border-2 border-yellow-500 shadow-lg shadow-yellow-600/50"
              onClick={() => setLocation('/register')}
            >
              Start Your Quest
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6 border-2 border-yellow-600/60 bg-slate-800/50 text-yellow-100 hover:bg-yellow-600/20 hover:border-yellow-500/80"
              onClick={() => setLocation('/login')}
            >
              Sign In
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="text-center bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30 hover:border-yellow-500/50 transition-all">
            <CardHeader>
              <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
              <CardTitle className="text-yellow-100 font-serif">Gamified Quests</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-yellow-200/70">
                Turn your to-do list into an engaging game with gold rewards and achievements.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30 hover:border-yellow-500/50 transition-all">
            <CardHeader>
              <Target className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
              <CardTitle className="text-yellow-100 font-serif">Smart Prioritization</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-yellow-200/70">
                Intelligent gold calculation based on task importance and duration.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30 hover:border-yellow-500/50 transition-all">
            <CardHeader>
              <Coins className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
              <CardTitle className="text-yellow-100 font-serif">Reward Shop</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-yellow-200/70">
                Spend earned gold on entertainment, wellness, and lifestyle rewards.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30 hover:border-yellow-500/50 transition-all">
            <CardHeader>
              <Star className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
              <CardTitle className="text-yellow-100 font-serif">Notion Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-yellow-200/70">
                Seamlessly sync with your existing Notion databases and workflows.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-serif font-semibold mb-4 text-yellow-100">Ready to level up your productivity?</h2>
          <Button 
            size="lg"
            className="bg-yellow-600 hover:bg-yellow-500 text-slate-900 font-bold border-2 border-yellow-500 shadow-lg shadow-yellow-600/50"
            onClick={() => setLocation('/register')}
          >
            Get Started Free
          </Button>
        </div>
      </div>
    </div>
  );
}