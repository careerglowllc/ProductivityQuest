import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Settings, Save, Eye, EyeOff, ArrowLeft, Home, Calendar, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showApiKey, setShowApiKey] = useState(false);
  const [notionApiKey, setNotionApiKey] = useState("");
  const [notionDatabaseId, setNotionDatabaseId] = useState("");
  const [hasGoogleAuth, setHasGoogleAuth] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["/api/user/settings"],
  });

  useEffect(() => {
    if (settings) {
      setNotionDatabaseId(settings.notionDatabaseId || "");
      setHasGoogleAuth(!!settings.hasGoogleAuth);
    }
  }, [settings]);

  const updateSettings = useMutation({
    mutationFn: async (data: { notionApiKey?: string; notionDatabaseId?: string }) => {
      return apiRequest("PUT", "/api/user/settings", data);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const testConnection = useMutation({
    mutationFn: async () => {
      // First save the settings
      await apiRequest("PUT", "/api/user/settings", {
        notionApiKey: notionApiKey || undefined,
        notionDatabaseId: notionDatabaseId || undefined,
      });
      
      // Then test the connection
      return apiRequest("GET", "/api/notion/test");
    },
    onError: (error: any) => {
      const errorData = error.response?.data || {};
      let description = "Could not connect to your Notion database.";
      
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

  const connectGoogleCalendar = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/google/auth");
      window.location.href = response.authUrl;
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
      return apiRequest("GET", "/api/google/test");
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
      return apiRequest("POST", "/api/google/disconnect");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to disconnect Google Calendar. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        notionApiKey: notionApiKey || undefined,
        notionDatabaseId: notionDatabaseId || undefined,
      });
      
      toast({
        title: "Settings updated",
        description: "Your settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
    } catch (error) {
      // Error is handled by the mutation's onError callback
    }
  };

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

  const handleTestConnection = async () => {
    try {
      const data = await testConnection.mutateAsync();
      
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
            <CardTitle>Notion Integration</CardTitle>
            <CardDescription>
              Configure your Notion API credentials to sync tasks from your personal database.
            </CardDescription>
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
              <Label htmlFor="notion-database-id">Notion Database ID</Label>
              <Input
                id="notion-database-id"
                placeholder="e.g., 92c68a7f-1469-458a-9f60-97711b3f1f43"
                value={notionDatabaseId}
                onChange={(e) => setNotionDatabaseId(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Copy the 32-character ID from your Notion database URL (between the last "/" and "?")
              </p>
              <p className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                ⚠️ Make sure to use the <strong>database ID</strong>, not the page ID. Open your database directly in Notion to get the correct ID.
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