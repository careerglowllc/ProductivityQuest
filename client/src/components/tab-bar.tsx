import { Link, useLocation } from "wouter";
import { ShoppingCart, CheckSquare, Sparkles, LayoutDashboard, Coins, User, Users, Crown, Calendar, ChevronDown, DollarSign } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Settings, LogOut } from "lucide-react";
import { useState } from "react";

export function TabBar() {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [questsMenuOpen, setQuestsMenuOpen] = useState(false);

  const { data: progress = { goldTotal: 0 } } = useQuery({
    queryKey: ["/api/progress"],
  });

  const handleLogout = async () => {
    // Use GET to /api/logout which will redirect to landing page
    window.location.href = "/api/logout";
  };

  const tabs = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Quests",
      path: "/tasks",
      icon: CheckSquare,
    },
    {
      name: "Calendar",
      path: "/calendar",
      icon: Calendar,
    },
    {
      name: "Item Shop",
      path: "/shop",
      icon: ShoppingCart,
    },
    {
      name: "Settings",
      path: "/profile",
      icon: Settings,
    },
  ];

  // Mobile: bottom navigation (dark theme)
  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-yellow-600/30 safe-area-inset-bottom z-50">
        <nav className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location === tab.path;
            
            return (
              <Link key={tab.path} href={tab.path}>
                <a
                  className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                    isActive
                      ? "text-yellow-400"
                      : "text-yellow-200/60 hover:text-yellow-200"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                  <span className={`text-[10px] mt-0.5 ${isActive ? "font-semibold" : "font-medium"}`}>
                    {tab.name}
                  </span>
                </a>
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  // Web: top navigation (dark theme)
  return (
    <div className="fixed top-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-b-2 border-yellow-600/30 z-50">
      <nav className="flex justify-between items-center h-16 max-w-7xl mx-auto px-8">
        {/* Navigation Tabs - Center */}
        <div className="flex items-center gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location === tab.path;
            
            // Special handling for Quests tab with dropdown
            if (tab.name === "Quests") {
              return (
                <DropdownMenu key={tab.path} open={questsMenuOpen} onOpenChange={setQuestsMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <div
                      onMouseEnter={() => setQuestsMenuOpen(true)}
                      onMouseLeave={() => setQuestsMenuOpen(false)}
                    >
                      <Link href={tab.path}>
                        <a
                          className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-all ${
                            isActive || location === "/campaigns" || location === "/calendar"
                              ? "bg-gradient-to-r from-yellow-600/40 to-yellow-500/40 text-yellow-100 border-2 border-yellow-500/60"
                              : "text-yellow-200/70 hover:bg-slate-800/60 hover:text-yellow-100 border-2 border-transparent"
                          }`}
                        >
                          <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                          <span className={`text-sm ${isActive ? "font-semibold" : "font-medium"}`}>
                            {tab.name}
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-60" />
                        </a>
                      </Link>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="start" 
                    className="bg-slate-800 border-yellow-600/30"
                    onMouseEnter={() => setQuestsMenuOpen(true)}
                    onMouseLeave={() => setQuestsMenuOpen(false)}
                  >
                    <DropdownMenuItem asChild className="text-yellow-100 hover:bg-slate-700 focus:bg-slate-700 cursor-pointer">
                      <Link href="/calendar">
                        <a className="flex items-center gap-2 w-full">
                          <Calendar className="h-4 w-4 text-blue-400" />
                          Calendar
                        </a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="text-yellow-100 hover:bg-slate-700 focus:bg-slate-700 cursor-pointer">
                      <Link href="/campaigns">
                        <a className="flex items-center gap-2 w-full">
                          <Crown className="h-4 w-4 text-purple-400" />
                          Questlines
                        </a>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }
            
            return (
              <Link key={tab.path} href={tab.path}>
                <a
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-yellow-600/40 to-yellow-500/40 text-yellow-100 border-2 border-yellow-500/60"
                      : "text-yellow-200/70 hover:bg-slate-800/60 hover:text-yellow-100 border-2 border-transparent"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                  <span className={`text-sm ${isActive ? "font-semibold" : "font-medium"}`}>
                    {tab.name}
                  </span>
                </a>
              </Link>
            );
          })}

          {/* Skills - desktop only (not in mobile tabs) */}
          {(() => {
            const isSkillsActive = location === "/skills";
            return (
              <Link href="/skills">
                <a
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-all ${
                    isSkillsActive
                      ? "bg-gradient-to-r from-yellow-600/40 to-yellow-500/40 text-yellow-100 border-2 border-yellow-500/60"
                      : "text-yellow-200/70 hover:bg-slate-800/60 hover:text-yellow-100 border-2 border-transparent"
                  }`}
                >
                  <Sparkles className={`h-5 w-5 ${isSkillsActive ? "stroke-[2.5]" : ""}`} />
                  <span className={`text-sm ${isSkillsActive ? "font-semibold" : "font-medium"}`}>
                    Skills
                  </span>
                </a>
              </Link>
            );
          })()}
        </div>

        {/* Gold and User Info - Right */}
        <div className="flex items-center gap-4">
          {/* Finances Button */}
          <Link href="/finances">
            <a className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600/30 border-2 border-green-500/50 hover:bg-green-600/40 hover:border-green-400/60 transition-all">
              <DollarSign className="h-5 w-5 text-green-300" />
              <span className="text-sm font-semibold text-green-100">Finances</span>
            </a>
          </Link>

          {/* NPCs Button */}
          <Link href="/npcs">
            <a className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600/30 border-2 border-blue-500/50 hover:bg-blue-600/40 hover:border-blue-400/60 transition-all">
              <Users className="h-5 w-5 text-blue-300" />
              <span className="text-sm font-semibold text-blue-100">NPCs</span>
            </a>
          </Link>

          {/* Gold Display */}
          <div className="flex items-center gap-1.5 bg-yellow-600/30 px-3 py-1.5 rounded-full border border-yellow-500/50">
            <Coins className="h-4 w-4 text-yellow-400" />
            <span className="font-bold text-yellow-100 text-sm">{(progress as any)?.goldTotal || 0}</span>
          </div>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 bg-slate-800/60 hover:bg-slate-700/60 px-3 py-1.5 rounded-full border border-yellow-600/30 hover:border-yellow-500/50 transition-all">
                <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="text-yellow-100 text-sm font-medium">
                  {(() => {
                    const email = (user as any)?.email || (user as any)?.username || 'User';
                    return email.length > 5 ? email.slice(0, 5) + '...' : email;
                  })()}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-800 border-yellow-600/30">
              <DropdownMenuItem asChild className="text-yellow-100 hover:bg-slate-700 focus:bg-slate-700 cursor-pointer">
                <Link href="/settings">
                  <a className="flex items-center gap-2 w-full">
                    <Settings className="h-4 w-4" />
                    Settings
                  </a>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleLogout}
                className="text-red-300 hover:bg-slate-700 focus:bg-slate-700 cursor-pointer"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </div>
  );
}
