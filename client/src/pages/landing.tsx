import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Coins, Star } from "lucide-react";
import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-primary mb-4">
            TaskQuest
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Transform your productivity into an engaging game. Complete tasks, earn gold, and unlock rewards while staying organized with Notion and Google Calendar.
          </p>
          <div className="flex gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6"
              onClick={() => setLocation('/register')}
            >
              Start Your Quest
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6"
              onClick={() => setLocation('/login')}
            >
              Sign In
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="text-center">
            <CardHeader>
              <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Gamified Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Turn your to-do list into an engaging game with gold rewards and achievements.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Target className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Smart Prioritization</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Intelligent gold calculation based on task importance and duration.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Coins className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Reward Shop</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Spend earned gold on entertainment, wellness, and lifestyle rewards.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Star className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Notion Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Seamlessly sync with your existing Notion databases and workflows.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Ready to level up your productivity?</h2>
          <Button 
            size="lg" 
            onClick={() => window.location.href = '/api/login'}
          >
            Get Started Free
          </Button>
        </div>
      </div>
    </div>
  );
}