import { Link } from "wouter";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, ChevronRight, Database, Calendar, Bell, User, Shield, Palette, BookOpen, Trash2, DollarSign, LogOut, Download, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/theme-context";
import { useToast } from "@/hooks/use-toast";
import { buildRecipesCSVExport } from "@/pages/recipes";
import { buildAccomplishmentsCSVExport } from "@/pages/accomplishments";
import { buildNPCsCSVExport } from "@/pages/npcs";
import { buildCountriesVisitedCSVExport } from "@/pages/countries-visited";
import { buildStatesVisitedCSVExport } from "@/pages/us-states-visited";
import { buildShopItemsCSVExport } from "@/pages/shop";
import { buildFinancesCSVExport } from "@/pages/finances";
import { buildTasksCSVExport } from "@/pages/home";
import { buildQuestlinesCSVExport } from "@/pages/campaigns";
import { buildReferenceBeliefsCSVExport } from "@/pages/reference-beliefs";

const APP_VERSION = "v1.0.53";

async function exportAllAsZip() {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  const results = await Promise.allSettled([
    Promise.resolve(buildRecipesCSVExport()),
    Promise.resolve(buildAccomplishmentsCSVExport()),
    Promise.resolve(buildNPCsCSVExport()),
    buildCountriesVisitedCSVExport(),
    buildStatesVisitedCSVExport(),
    buildShopItemsCSVExport(),
    buildFinancesCSVExport(),
    buildTasksCSVExport(),
    buildQuestlinesCSVExport(),
    Promise.resolve(buildReferenceBeliefsCSVExport()),
  ]);

  let successCount = 0;
  for (const result of results) {
    if (result.status === "fulfilled") {
      const exp = result.value;
      zip.folder(exp.folder)!.file(exp.filename, exp.content);
      successCount++;
    } else {
      console.error("Export failed for one section:", result.reason);
    }
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `productivityquest-export-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return successCount;
}

export default function SettingsPage() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const count = await exportAllAsZip();
      toast({ title: "Export complete!", description: `Bundled ${count} CSV file(s) into a zip, organized by section.` });
    } catch (err: any) {
      toast({ title: "Export failed", description: err?.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  if (!user) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDark ? "bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950" : "bg-gray-50"}`}>
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
      path: "/finances",
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
    },
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 ${!isMobile ? 'pt-16' : ''} ${isMobile ? 'pb-20' : 'pb-24'} relative overflow-hidden`}>
      {/* Starfield Background Effect */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-10 left-10 w-1 h-1 bg-yellow-200 rounded-full animate-pulse"></div>
        <div className="absolute top-20 right-20 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-40 left-1/4 w-1 h-1 bg-purple-200 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-60 right-1/3 w-1 h-1 bg-yellow-200 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute top-32 right-1/2 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
      </div>

      <div className={`container mx-auto ${isMobile ? 'px-2 py-3' : 'px-4 py-8'} relative z-10`}>
        <div className={`${isMobile ? 'max-w-full' : 'max-w-3xl'} mx-auto`}>
          {/* Header */}
          <div className={isMobile ? 'mb-3' : 'mb-8'}>
            <div className={`flex items-center ${isMobile ? 'gap-2 mb-0.5' : 'gap-3 mb-2'}`}>
              <Settings className={`${isMobile ? 'h-5 w-5' : 'h-8 w-8'} text-yellow-400`} />
              <h1 className={`${isMobile ? 'text-xl' : 'text-3xl'} font-serif font-bold text-yellow-100`}>Settings</h1>
            </div>
            <p className={`text-yellow-200/70 ${isMobile ? 'text-xs' : ''}`}>Manage your integrations and preferences</p>
          </div>

          {/* Export All */}
          <Card className={`bg-slate-800/60 backdrop-blur-md border border-sky-600/30 ${isMobile ? 'mb-3' : 'mb-6'}`}>
            <CardContent className={isMobile ? 'p-3' : 'p-5'}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className={`${isMobile ? 'text-sm' : 'text-lg'} font-serif font-bold text-sky-100`}>Export All as CSV</h3>
                  <p className={`${isMobile ? 'text-[11px] leading-tight' : 'text-sm'} text-sky-200/70`}>
                    One-click zip of Recipes, Accomplishments, Countries/States Traveled, Item Shop, NPCs, Finances, Tasks, Questlines & Reference Beliefs — organized into folders by section.
                  </p>
                </div>
                <Button
                  onClick={handleExportAll}
                  disabled={exporting}
                  className="bg-sky-600 hover:bg-sky-500 text-white shrink-0"
                  size={isMobile ? "sm" : "default"}
                >
                  {exporting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
                  {exporting ? "Exporting…" : "Export All"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Settings Menu */}
          <div className={isMobile ? 'space-y-1.5' : 'space-y-4'}>
            {settingsSections.map((section) => {
              const Icon = section.icon;
              const isDisabled = section.disabled;
              
              return (
                <Link key={section.path} href={isDisabled ? "#" : section.path}>
                  <Card 
                    className={`bg-slate-800/60 backdrop-blur-md border transition-all ${
                      isDisabled 
                        ? 'border-slate-700/40 opacity-60 cursor-not-allowed'
                        : 'border-yellow-600/30 hover:border-yellow-500/50 cursor-pointer hover:shadow-lg hover:shadow-yellow-600/10'
                    }`}
                  >
                    <CardContent className={isMobile ? 'p-2.5' : 'p-6'}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          {/* Icon */}
                          <div className={`${isMobile ? 'w-8 h-8 rounded-md' : 'w-12 h-12 rounded-lg'} bg-gradient-to-br ${section.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                            <Icon className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'} text-white`} />
                          </div>
                          
                          {/* Content */}
                          <div className="min-w-0">
                            <h3 className={`${isMobile ? 'text-sm' : 'text-lg'} font-serif font-bold text-yellow-100 flex items-center gap-1.5`}>
                              {section.title}
                              {isDisabled && (
                                <span className={`${isMobile ? 'text-[9px] px-1 py-px' : 'text-xs px-2 py-0.5'} bg-slate-700 text-yellow-200/60 rounded`}>
                                  Soon
                                </span>
                              )}
                            </h3>
                            <p className={`${isMobile ? 'text-[11px] leading-tight' : 'text-sm'} text-yellow-200/70 truncate`}>{section.description}</p>
                          </div>
                        </div>
                        
                        {/* Arrow */}
                        {!isDisabled && (
                          <ChevronRight className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'} text-yellow-400 flex-shrink-0`} />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Sign Out */}
          <div className={isMobile ? 'mt-4' : 'mt-6'}>
            <button
              onClick={() => window.location.href = '/api/logout'}
              className={`w-full flex items-center gap-2.5 rounded-xl border border-red-600/30 bg-slate-800/60 hover:bg-red-900/20 hover:border-red-500/50 transition-all ${isMobile ? 'p-2.5' : 'p-4'}`}
            >
              <div className={`${isMobile ? 'w-8 h-8 rounded-md' : 'w-12 h-12 rounded-lg'} bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg flex-shrink-0`}>
                <LogOut className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'} text-white`} />
              </div>
              <div className="min-w-0 text-left">
                <p className={`${isMobile ? 'text-sm' : 'text-lg'} font-serif font-bold text-red-300`}>Sign Out</p>
                <p className={`${isMobile ? 'text-[11px] leading-tight' : 'text-sm'} text-red-300/60`}>Log out of your account</p>
              </div>
            </button>
          </div>

          {/* Version footer */}
          <p className="mt-6 text-center text-xs text-yellow-200/40">{APP_VERSION}</p>
        </div>
      </div>
    </div>
  );
}