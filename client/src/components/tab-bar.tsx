import { Link, useLocation } from "wouter";
import { ShoppingCart, CheckSquare, Recycle, Sparkles, LayoutDashboard } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export function TabBar() {
  const [location] = useLocation();
  const isMobile = useIsMobile();

  const tabs = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Tasks",
      path: "/tasks",
      icon: CheckSquare,
    },
    {
      name: "Skills",
      path: "/skills",
      icon: Sparkles,
    },
    {
      name: "Item Shop",
      path: "/shop",
      icon: ShoppingCart,
    },
    {
      name: "Recycling",
      path: "/rewards",
      icon: Recycle,
    },
  ];

  // Mobile: bottom navigation (white background)
  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom z-50">
        <nav className="flex justify-around items-center h-16 max-w-lg mx-auto px-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location === tab.path;
            
            return (
              <Link key={tab.path} href={tab.path}>
                <a
                  className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                    isActive
                      ? "text-purple-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon className={`h-6 w-6 ${isActive ? "stroke-[2.5]" : ""}`} />
                  <span className={`text-xs mt-1 ${isActive ? "font-semibold" : "font-medium"}`}>
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
      <nav className="flex justify-center items-center h-16 max-w-7xl mx-auto px-8 gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location === tab.path;
          
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
      </nav>
    </div>
  );
}
