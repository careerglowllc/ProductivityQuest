import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, ChevronRight, Database, Calendar, Bell, User, Shield, Palette } from "lucide-react";
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
      title: "Notion Integration",
      description: "Configure your Notion database connection and sync tasks",
      icon: Database,
      path: "/settings/notion",
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Google Calendar",
      description: "Connect and sync with your Google Calendar",
      icon: Calendar,
      path: "/settings/google-calendar",
      color: "from-blue-500 to-blue-600",
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

  const handleTestConnection = async () => {
    try {
      const response = await testConnection.mutateAsync();
      const data = await response.json();
      
      toast({
        title: "Connection successful!",
        description: `Connected to database: ${data.databaseTitle}`,
      });
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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-4">Please log in to access settings</p>
          <Button onClick={() => window.location.href = '/api/login'}>
            Log In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Settings</h1>
          </div>
          <Link href="/">
            <Button variant="outline" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Notion Integration</CardTitle>
                <CardDescription>
                  Configure your Notion API credentials to sync tasks from your personal database.
                </CardDescription>
              </div>
              <Link href="/settings/notion">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Setup Guide
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notion-api-key">Notion API Key</Label>
              <div className="relative">
                <Input
                  id="notion-api-key"
                  type={showApiKey ? "text" : "password"}
                  placeholder="Enter your Notion integration secret"
                  value={notionApiKey}
                  onChange={(e) => setNotionApiKey(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Current status: {settings?.notionApiKey ? "✓ Configured" : "Not set"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notion-database-id">Notion Database ID or URL</Label>
              <Input
                id="notion-database-id"
                placeholder="Paste full URL or just the 32-character ID"
                value={notionDatabaseId}
                onChange={(e) => setNotionDatabaseId(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                💡 <strong>Pro tip:</strong> Just paste the entire database URL from your browser - we'll extract the ID automatically!
              </p>
              <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                📋 Your database must include these properties (exact names): <strong>Task</strong>, <strong>Due</strong>, <strong>Importance</strong>, <strong>Kanban - Stage</strong>, <strong>Recur Type</strong>
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSave} 
                disabled={updateSettings.isPending}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateSettings.isPending ? "Saving..." : "Save Settings"}
              </Button>
              <Button 
                onClick={handleTestConnection}
                disabled={testConnection.isPending || !notionApiKey || !notionDatabaseId}
                variant="outline"
                className="flex-1"
              >
                {testConnection.isPending ? "Testing..." : "Test Connection"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
            <CardDescription>
              Follow these steps to connect your Notion workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold">1. Create a Notion Integration</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Go to <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">notion.so/my-integrations</a></li>
                <li>• Create a new integration</li>
                <li>• Copy the integration secret (API key)</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">2. Share Your Database</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Open your Notion database page</li>
                <li>• Click "..." (three dots) in the top right</li>
                <li>• Select "Connections" or "Add connections"</li>
                <li>• Choose your integration by name</li>
                <li>• Click "Confirm" to grant access</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">3. Get Database ID</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Open your Notion database in the browser</li>
                <li>• Copy the URL from the address bar</li>
                <li>• Find the 32-character ID after the last "/" and before "?"</li>
                <li>• Example: https://notion.so/myworkspace/Tasks-<strong>92c68a7f1469458a9f6097711b3f1f43</strong>?v=...</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">4. If Connection Fails</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Double-check that your database is shared with the integration</li>
                <li>• Make sure you&apos;re using the database ID, not the page ID</li>
                <li>• Verify your API key is correct and has the right permissions</li>
                <li>• Check that your database has the required fields (Task, Details, etc.)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Google Calendar Integration
            </CardTitle>
            <CardDescription>
              Connect your Google account to sync tasks as calendar events with time blocking and reminders.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasGoogleAuth ? (
              <div className="space-y-4">
                <div className="text-center p-6 border rounded-lg bg-gray-50">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">Connect Google Calendar</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Authorize access to your Google Calendar to sync tasks as events
                  </p>
                  <Button
                    onClick={handleGoogleConnect}
                    disabled={connectGoogleCalendar.isPending}
                    className="w-full"
                  >
                    {connectGoogleCalendar.isPending ? "Connecting..." : "Connect Google Calendar"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">Google Calendar Connected</p>
                      <p className="text-sm text-green-600">
                        Your tasks can be synced to Google Calendar with time blocking and reminders
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleGoogleTestConnection}
                      disabled={testGoogleConnection.isPending}
                      variant="outline"
                      size="sm"
                    >
                      {testGoogleConnection.isPending ? "Testing..." : "Test Connection"}
                    </Button>
                    <Button 
                      onClick={handleGoogleDisconnect}
                      disabled={disconnectGoogleCalendar.isPending}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      {disconnectGoogleCalendar.isPending ? 'Disconnecting...' : 'Disconnect'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {hasGoogleAuth && (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <h4 className="font-medium text-green-800">Google Calendar Features</h4>
                </div>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Time blocking: Tasks with due dates become calendar events</li>
                  <li>• Smart scheduling: Duration sets event length automatically</li>
                  <li>• Color coding: Events are colored by importance level</li>
                  <li>• Rich details: Events include task descriptions, gold rewards, and metadata</li>
                  <li>• Reminders: 15-minute popup and 1-hour email reminders</li>
                </ul>
              </div>
            )}

            {!hasGoogleAuth && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <h4 className="font-medium text-blue-800">How Calendar Sync Works</h4>
                </div>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Select tasks from your task list</li>
                  <li>• Click &quot;Calendar Sync&quot; in the sidebar</li>
                  <li>• Tasks with due dates become calendar events</li>
                  <li>• Events are automatically time-blocked based on task duration</li>
                  <li>• Importance levels determine event colors</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>OAuth Authentication</CardTitle>
            <CardDescription>
              How Google Calendar authentication works with OAuth 2.0
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold">How It Works</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Click "Connect Google Calendar" to start the OAuth flow</li>
                <li>• You'll be redirected to Google to authorize access</li>
                <li>• Grant permission to access your Google Calendar</li>
                <li>• You'll be redirected back to this page with a success message</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Permissions</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• The app only requests access to create calendar events</li>
                <li>• Your calendar data is never stored on our servers</li>
                <li>• You can revoke access at any time from Google Account settings</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Troubleshooting</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• If authentication fails, try disconnecting and reconnecting</li>
                <li>• Make sure you grant calendar permissions during authorization</li>
                <li>• Check that your Google account has calendar access enabled</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}