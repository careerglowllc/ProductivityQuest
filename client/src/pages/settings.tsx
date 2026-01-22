import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, ChevronRight, Database, Calendar, Bell, User, Shield, Palette, BookOpen, Trash2, DollarSign } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function SettingsPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950">
        <div className="text-center">
          <p className="text-lg text-yellow-200/80 mb-4">Please log in to access settings</p>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            className="bg-yellow-600 hover:bg-yellow-500 text-slate-900"
          >
            Log In
          </Button>
        </div>
      </div>
    );
  }

  const settingsSections = [
    {
      title: "Finances",
      description: "Track your income and expenses with visual insights",
      icon: DollarSign,
      path: "/settings/finances",
      color: "from-green-500 to-emerald-600",
    },
    {
      title: "Notion Integration",
      description: "Configure your Notion database connection and sync tasks",
      icon: Database,
      path: "/settings/notion",
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Recycling Bin",
      description: "View and restore deleted or completed tasks",
      icon: Trash2,
      path: "/recycling-bin",
      color: "from-slate-500 to-slate-600",
    },
    {
      title: "Calendar Settings",
      description: "Configure calendar sync and timezone preferences",
      icon: Calendar,
      path: "/settings/calendar",
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Guides",
      description: "Learn how to use ProductivityQuest features",
      icon: BookOpen,
      path: "/settings/guides",
      color: "from-indigo-500 to-indigo-600",
    },
    {
      title: "Account",
      description: "Manage your account details and preferences",
      icon: User,
      path: "/settings/account",
      color: "from-green-500 to-green-600",
      disabled: true,
    },
    {
      title: "Notifications",
      description: "Configure notification preferences and reminders",
      icon: Bell,
      path: "/settings/notifications",
      color: "from-yellow-500 to-yellow-600",
      disabled: true,
    },
    {
      title: "Privacy & Security",
      description: "Manage your privacy settings and security options",
      icon: Shield,
      path: "/settings/privacy",
      color: "from-red-500 to-red-600",
      disabled: true,
    },
    {
      title: "Appearance",
      description: "Customize the app's look and theme",
      icon: Palette,
      path: "/settings/appearance",
      color: "from-pink-500 to-pink-600",
      disabled: true,
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
            <div className="flex items-center gap-3 mb-2">
              <Settings className="h-8 w-8 text-yellow-400" />
              <h1 className="text-3xl font-serif font-bold text-yellow-100">Settings</h1>
            </div>
            <p className="text-yellow-200/70">Manage your integrations and preferences</p>
          </div>

          {/* Settings Menu */}
          <div className="space-y-4">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              const isDisabled = section.disabled;
              
              return (
                <Link key={section.path} href={isDisabled ? "#" : section.path}>
                  <Card 
                    className={`bg-slate-800/60 backdrop-blur-md border-2 transition-all ${
                      isDisabled 
                        ? 'border-slate-700/40 opacity-60 cursor-not-allowed'
                        : 'border-yellow-600/30 hover:border-yellow-500/50 cursor-pointer hover:shadow-lg hover:shadow-yellow-600/10'
                    }`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Icon */}
                          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${section.color} flex items-center justify-center shadow-lg`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          
                          {/* Content */}
                          <div>
                            <h3 className="text-lg font-serif font-bold text-yellow-100 mb-1 flex items-center gap-2">
                              {section.title}
                              {isDisabled && (
                                <span className="text-xs bg-slate-700 text-yellow-200/60 px-2 py-0.5 rounded">
                                  Coming Soon
                                </span>
                              )}
                            </h3>
                            <p className="text-sm text-yellow-200/70">{section.description}</p>
                          </div>
                        </div>
                        
                        {/* Arrow */}
                        {!isDisabled && (
                          <ChevronRight className="w-6 h-6 text-yellow-400" />
                        )}
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