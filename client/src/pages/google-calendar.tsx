import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { CheckCircle, ArrowLeft, Calendar, AlertCircle, Loader2, Link as LinkIcon, ExternalLink, Settings as SettingsIcon } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { UserSettings } from "@/../../shared/schema";

export default function GoogleCalendar() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [hasGoogleAuth, setHasGoogleAuth] = useState(false);

  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ["/api/user/settings"],
  });

  useEffect(() => {
    if (settings) {
      setHasGoogleAuth(!!settings.hasGoogleAuth);
    }
  }, [settings]);

  const connectGoogleCalendar = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/google/auth");
      const data = await response.json();
      window.location.href = data.authUrl;
    },
    onError: (error: any) => {
      toast({
        title: "Authentication Error",
        description: "Failed to initiate Google authentication. Please try again.",
        variant: "destructive",
      });
    },
  });

  const testGoogleConnection = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/google/test");
      return response.json();
    },
    onError: (error: any) => {
      const errorData = error.response?.data || {};
      let description = "Could not connect to Google Calendar.";
      
      if (errorData.instructions) {
        description = errorData.instructions;
      } else if (errorData.error) {
        description = errorData.error;
      }
      
      toast({
        title: "Connection failed",
        description: description,
        variant: "destructive",
      });
    },
  });

  const disconnectGoogleCalendar = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/google/disconnect");
      return response.json();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to disconnect Google Calendar. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGoogleConnect = async () => {
    try {
      await connectGoogleCalendar.mutateAsync();
    } catch (error) {
      // Error is handled by the mutation's onError callback
    }
  };

  const handleGoogleTestConnection = async () => {
    try {
      await testGoogleConnection.mutateAsync();
      
      toast({
        title: "Google Calendar Connected!",
        description: `Successfully connected to Google Calendar`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
    } catch (error) {
      // Error is handled by the mutation's onError callback
    }
  };

  const handleGoogleDisconnect = async () => {
    try {
      await disconnectGoogleCalendar.mutateAsync();
      
      setHasGoogleAuth(false);
      toast({
        title: "Google Calendar Disconnected",
        description: "Your Google Calendar has been disconnected.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
    } catch (error) {
      // Error is handled by the mutation's onError callback
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center pb-20">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
      </div>
    );
  }

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
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-yellow-400" />
              <div>
                <h1 className="text-3xl font-serif font-bold text-yellow-100">Google Calendar Integration</h1>
                <p className="text-yellow-200/70 mt-1">Sync your tasks with Google Calendar</p>
              </div>
            </div>
            <Link href="/settings">
              <Button variant="outline" className="flex items-center gap-2 border-yellow-600/40 text-yellow-200 hover:bg-yellow-600/20">
                <ArrowLeft className="h-4 w-4" />
                Back to Settings
              </Button>
            </Link>
          </div>

          {/* Status Card */}
          <Card className="mb-6 bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30">
            <CardHeader>
              <CardTitle className="text-yellow-100 flex items-center gap-2">
                Connection Status
                {hasGoogleAuth && (
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/50">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-yellow-200/70">
                {hasGoogleAuth 
                  ? "Your Google Calendar is connected and ready to sync." 
                  : "Connect your Google Calendar to sync tasks automatically."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasGoogleAuth ? (
                <div className="space-y-4">
                  <Alert className="bg-green-500/10 border-green-500/50">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <AlertDescription className="text-green-200">
                      Your Google Calendar is successfully connected. Tasks with due dates will be synced automatically.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={handleGoogleTestConnection}
                      disabled={testGoogleConnection.isPending}
                      className="bg-yellow-600 hover:bg-yellow-500 text-slate-900"
                    >
                      {testGoogleConnection.isPending ? "Testing..." : "Test Connection"}
                    </Button>
                    <Button
                      onClick={handleGoogleDisconnect}
                      disabled={disconnectGoogleCalendar.isPending}
                      variant="outline"
                      className="border-red-600/40 text-red-300 hover:bg-red-600/20"
                    >
                      {disconnectGoogleCalendar.isPending ? "Disconnecting..." : "Disconnect"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert className="bg-blue-500/10 border-blue-500/50">
                    <AlertCircle className="h-4 w-4 text-blue-400" />
                    <AlertDescription className="text-blue-200">
                      Click the button below to authorize ProductivityQuest to access your Google Calendar.
                    </AlertDescription>
                  </Alert>
                  
                  <Button
                    onClick={handleGoogleConnect}
                    disabled={connectGoogleCalendar.isPending}
                    className="bg-yellow-600 hover:bg-yellow-500 text-slate-900 flex items-center gap-2"
                  >
                    <LinkIcon className="h-4 w-4" />
                    {connectGoogleCalendar.isPending ? "Connecting..." : "Connect Google Calendar"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30">
            <CardHeader>
              <CardTitle className="text-yellow-100">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-yellow-200/80">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-600/20 flex items-center justify-center border border-yellow-500/50">
                  <span className="text-yellow-400 font-bold">1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-yellow-100 mb-1">Authorize Access</h3>
                  <p className="text-sm">Connect your Google account to grant ProductivityQuest access to your calendar.</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-600/20 flex items-center justify-center border border-yellow-500/50">
                  <span className="text-yellow-400 font-bold">2</span>
                </div>
                <div>
                  <h3 className="font-semibold text-yellow-100 mb-1">Automatic Sync</h3>
                  <p className="text-sm">Tasks with due dates are automatically synced to your Google Calendar as events.</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-600/20 flex items-center justify-center border border-yellow-500/50">
                  <span className="text-yellow-400 font-bold">3</span>
                </div>
                <div>
                  <h3 className="font-semibold text-yellow-100 mb-1">Stay Organized</h3>
                  <p className="text-sm">View and manage your tasks alongside your other calendar events in one place.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
