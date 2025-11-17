import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight, Brain, Sparkles, Target } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function SettingsGuidesPage() {
  const isMobile = useIsMobile();

  const guides = [
    {
      title: "Measure What Matters",
      description: "Master quantitative goals and the science of gamification through measurable progress",
      icon: Target,
      path: "/settings/guides/measure-what-matters",
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Skill Classification Guide",
      description: "Learn how AI categorizes your tasks and how to train it for your journey",
      icon: Brain,
      path: "/settings/guides/skill-classification",
      color: "from-emerald-500 to-emerald-600",
    },
    {
      title: "Getting Started",
      description: "Quick start guide to ProductivityQuest features",
      icon: Sparkles,
      path: "/getting-started",
      color: "from-blue-500 to-blue-600",
    },
  ];

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
          <Link href="/settings">
            <Button 
              variant="ghost" 
              className="mb-6 text-yellow-200/80 hover:text-yellow-100 hover:bg-slate-800/50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Settings
            </Button>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-serif font-bold text-yellow-100 mb-2">Guides</h1>
            <p className="text-yellow-200/70">Learn how to make the most of ProductivityQuest</p>
          </div>

          {/* Guides List */}
          <div className="space-y-4">
            {guides.map((guide) => {
              const Icon = guide.icon;
              
              return (
                <Link key={guide.path} href={guide.path}>
                  <Card 
                    className="bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30 hover:border-yellow-500/50 cursor-pointer hover:shadow-lg hover:shadow-yellow-600/10 transition-all"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Icon */}
                          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${guide.color} flex items-center justify-center shadow-lg`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          
                          {/* Content */}
                          <div>
                            <h3 className="text-lg font-serif font-bold text-yellow-100 mb-1">
                              {guide.title}
                            </h3>
                            <p className="text-sm text-yellow-200/70">{guide.description}</p>
                          </div>
                        </div>
                        
                        {/* Arrow */}
                        <ChevronRight className="w-6 h-6 text-yellow-400" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
