import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, ChevronRight, Clock, ArrowLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";

export default function CalendarSettingsPage() {
  const isMobile = useIsMobile();

  const { data: user } = useQuery({
    queryKey: ["/api/user"],
  });

  const calendarSettings = [
    {
      title: "Google Calendar Integration",
      description: "Connect and sync with your Google Calendar",
      icon: Calendar,
      path: "/settings/google-calendar",
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Timezone",
      description: "Set your preferred timezone for calendar events",
      icon: Clock,
      path: "/settings/timezone",
      color: "from-purple-500 to-purple-600",
    },
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 ${!isMobile ? 'pt-16' : ''} pb-24 relative overflow-hidden`}>
      {/* Starfield Background Effect */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-10 left-10 w-1 h-1 bg-yellow-200 rounded-full animate-pulse"></div>
        <div className="absolute top-20 right-20 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-40 left-1/4 w-1 h-1 bg-purple-200 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-60 right-1/3 w-1 h-1 bg-yellow-200 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute top-32 right-1/2 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/settings">
              <Button
                variant="ghost"
                className="mb-4 text-yellow-200/70 hover:text-yellow-100 hover:bg-yellow-500/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Settings
              </Button>
            </Link>
            
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="h-8 w-8 text-yellow-400" />
              <h1 className="text-3xl font-serif font-bold text-yellow-100">Calendar Settings</h1>
            </div>
            <p className="text-yellow-200/70">Configure your calendar sync and timezone preferences</p>
          </div>

          {/* Calendar Settings Menu */}
          <div className="space-y-4">
            {calendarSettings.map((setting) => {
              const Icon = setting.icon;
              
              return (
                <Link key={setting.path} href={setting.path}>
                  <Card 
                    className="bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30 hover:border-yellow-500/50 cursor-pointer hover:shadow-lg hover:shadow-yellow-600/10 transition-all"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Icon */}
                          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${setting.color} flex items-center justify-center shadow-lg`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          
                          {/* Content */}
                          <div>
                            <h3 className="text-lg font-serif font-bold text-yellow-100 mb-1">
                              {setting.title}
                            </h3>
                            <p className="text-sm text-yellow-200/70">{setting.description}</p>
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
