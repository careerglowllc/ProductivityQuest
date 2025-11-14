import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Coins, Trophy, CheckCircle, TrendingUp, User, Settings, LogOut, Calendar, Sparkles, ShoppingCart, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Dashboard() {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
  });

  const { data: progress = { goldTotal: 0, tasksCompleted: 0 } } = useQuery({
    queryKey: ["/api/progress"],
  });

  const { data: stats = { completedToday: 0, totalToday: 0, goldEarnedToday: 0 } } = useQuery({
    queryKey: ["/api/stats"],
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              {!isMobile && (
                <div className="flex items-center space-x-2">
                  <Trophy className="text-gold w-8 h-8" />
                  <h1 className="text-2xl font-bold text-gray-900">QuestList</h1>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 bg-gradient-to-r from-yellow-100 to-yellow-200 px-4 py-2 rounded-full">
                <Coins className="text-yellow-600 w-5 h-5" />
                <span className="font-semibold text-gray-900">{progress.goldTotal}</span>
                <span className="text-sm text-gray-600">Gold</span>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {user?.firstName || user?.email || "User"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = '/api/logout'}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.firstName || user?.username || "Adventurer"}! 👋
          </h2>
          <p className="text-gray-600">Ready to level up your productivity?</p>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium mb-1">Total Gold</p>
                  <p className="text-4xl font-bold">{progress.goldTotal || 0}</p>
                </div>
                <Coins className="h-12 w-12 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium mb-1">Quests Completed</p>
                  <p className="text-4xl font-bold">{progress.tasksCompleted || 0}</p>
                </div>
                <CheckCircle className="h-12 w-12 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium mb-1">Today's Progress</p>
                  <p className="text-4xl font-bold">{stats.completedToday || 0}/{stats.totalToday || 0}</p>
                </div>
                <TrendingUp className="h-12 w-12 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Progress Details */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Progress</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Tasks Completed</span>
                  <span className="font-medium text-gray-900">
                    {stats.completedToday}/{stats.totalToday}
                  </span>
                </div>
                <Progress 
                  value={stats.totalToday > 0 ? (stats.completedToday / stats.totalToday) * 100 : 0} 
                  className="h-3"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Gold Earned Today</span>
                  <span className="font-medium text-yellow-600">+{stats.goldEarnedToday}</span>
                </div>
                <Progress 
                  value={stats.goldEarnedToday > 0 ? Math.min((stats.goldEarnedToday / 500) * 100, 100) : 0} 
                  className="h-3"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/tasks">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Tasks</h3>
                <p className="text-sm text-gray-600 mt-1">Manage your quests</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/skills">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Skills</h3>
                <p className="text-sm text-gray-600 mt-1">Level up abilities</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/shop">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-green-600" />
                <h3 className="font-semibold text-gray-900">Item Shop</h3>
                <p className="text-sm text-gray-600 mt-1">Spend your gold</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/rewards">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <Trash2 className="w-12 h-12 mx-auto mb-3 text-orange-600" />
                <h3 className="font-semibold text-gray-900">Recycling</h3>
                <p className="text-sm text-gray-600 mt-1">View completed</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
