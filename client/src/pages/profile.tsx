import { Link } from "wouter";
import { User, Settings, LogOut, ChevronLeft, KeyRound, UserCog, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [showProfile, setShowProfile] = useState(false);

  const handleLogout = async () => {
    window.location.href = "/api/logout";
  };

  const handleComingSoon = (feature: string) => {
    toast({
      title: "🚧 Coming Soon",
      description: `${feature} will be available in a future update.`,
    });
  };

  // Profile sub-view
  if (showProfile) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 ${isMobile ? 'pt-6 pb-24 px-4' : 'pt-8 pb-24 px-6'}`}>
        <div className="max-w-2xl mx-auto">
          {/* Back button */}
          <Button
            variant="ghost"
            onClick={() => setShowProfile(false)}
            className="flex items-center gap-1.5 text-yellow-200/80 hover:text-yellow-100 hover:bg-slate-800/50 mb-6 -ml-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Settings
          </Button>

          {/* Profile Header */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 bg-yellow-500/20 rounded-full border-2 border-yellow-500/40">
                <User className="w-12 h-12 text-yellow-400" />
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200">
                  {(user as any)?.username || (user as any)?.email || "Adventurer"}
                </h1>
                <p className="text-gray-400 text-sm mt-1">Manage your profile</p>
              </div>
            </div>
          </div>

          {/* Profile Options */}
          <div className="space-y-3">
            <Card
              className="p-4 bg-slate-800/60 border-slate-600/30 hover:bg-slate-800/80 transition-all cursor-pointer"
              onClick={() => handleComingSoon("Account Settings")}
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-blue-500/20 rounded-lg">
                  <UserCog className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-white">Account Settings</h3>
                  <p className="text-gray-400 text-sm">Manage your account details</p>
                </div>
              </div>
            </Card>

            <Card
              className="p-4 bg-slate-800/60 border-slate-600/30 hover:bg-slate-800/80 transition-all cursor-pointer"
              onClick={() => handleComingSoon("Change Password")}
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-orange-500/20 rounded-lg">
                  <KeyRound className="w-5 h-5 text-orange-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-white">Change Password</h3>
                  <p className="text-gray-400 text-sm">Update your password</p>
                </div>
              </div>
            </Card>

            <Card
              className="p-4 bg-slate-800/60 border-slate-600/30 hover:bg-slate-800/80 transition-all cursor-pointer"
              onClick={() => handleComingSoon("Change Username")}
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-green-500/20 rounded-lg">
                  <AtSign className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-white">Change Username</h3>
                  <p className="text-gray-400 text-sm">Pick a new display name</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Main Settings view
  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 ${isMobile ? 'pt-6 pb-24 px-4' : 'pt-8 pb-24 px-6'}`}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 bg-purple-500/20 rounded-full border-2 border-purple-500/40">
              <Settings className="w-10 h-10 text-purple-400" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200">
                Settings
              </h1>
              <p className="text-gray-400 text-sm mt-1">Manage your app preferences</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-3 mb-8">
          {/* Profile */}
          <Card
            className="p-4 bg-slate-800/60 border-yellow-500/30 hover:bg-slate-800/80 transition-all cursor-pointer"
            onClick={() => setShowProfile(true)}
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-yellow-500/20 rounded-lg">
                <User className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-white">Profile</h3>
                <p className="text-gray-400 text-sm">View and edit your profile</p>
              </div>
            </div>
          </Card>

          {/* App Settings link */}
          <Link href="/settings">
            <a>
              <Card className="p-4 bg-slate-800/60 border-purple-500/30 hover:bg-slate-800/80 transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-purple-500/20 rounded-lg">
                    <Settings className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-white">App Settings</h3>
                    <p className="text-gray-400 text-sm">Preferences, integrations, and data</p>
                  </div>
                </div>
              </Card>
            </a>
          </Link>
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
