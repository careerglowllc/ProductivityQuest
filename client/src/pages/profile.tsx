import { Link } from "wouter";
import { User, Settings, Calendar, Users, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export default function Profile() {
  const { user } = useAuth();

  const handleLogout = async () => {
    window.location.href = "/api/logout";
  };

  const menuItems = [
    {
      name: "Settings",
      path: "/settings",
      icon: Settings,
      description: "Manage your account and preferences",
      color: "text-purple-400",
      bgColor: "bg-purple-500/20",
      borderColor: "border-purple-500/30",
    },
    {
      name: "Calendar",
      path: "/calendar",
      icon: Calendar,
      description: "View and manage your schedule",
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
      borderColor: "border-blue-500/30",
    },
    {
      name: "NPCs",
      path: "/npcs",
      icon: Users,
      description: "Interact with your quest companions",
      color: "text-green-400",
      bgColor: "bg-green-500/20",
      borderColor: "border-green-500/30",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-8 pb-24 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 bg-yellow-500/20 rounded-full border-2 border-yellow-500/40">
              <User className="w-12 h-12 text-yellow-400" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200">
                {user?.username || "Adventurer"}
              </h1>
              <p className="text-gray-400 text-sm mt-1">Level up your productivity</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-4 mb-8">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path}>
                <a>
                  <Card className={`p-5 bg-slate-800/60 ${item.borderColor} hover:bg-slate-800/80 transition-all cursor-pointer`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 ${item.bgColor} rounded-lg`}>
                        <Icon className={`w-6 h-6 ${item.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                        <p className="text-gray-400 text-sm">{item.description}</p>
                      </div>
                    </div>
                  </Card>
                </a>
              </Link>
            );
          })}
        </div>

        {/* Logout Button */}
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Log Out
        </Button>
      </div>
    </div>
  );
}
