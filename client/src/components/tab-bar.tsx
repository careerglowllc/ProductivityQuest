import { Link, useLocation } from "wouter";
import { ShoppingCart, CheckSquare, Trophy } from "lucide-react";

export function TabBar() {
  const [location] = useLocation();

  const tabs = [
    {
      name: "Tasks",
      path: "/dashboard",
      icon: CheckSquare,
    },
    {
      name: "Shop",
      path: "/shop",
      icon: ShoppingCart,
    },
    {
      name: "Rewards",
      path: "/rewards",
      icon: Trophy,
    },
  ];

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
