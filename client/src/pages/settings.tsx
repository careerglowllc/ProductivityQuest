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

  // Handle Google OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleSuccess = params.get('google_success');
    const googleError = params.get('google_error');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const expiry = params.get('expiry');

    if (googleSuccess && accessToken && refreshToken && expiry) {
      // Save tokens to backend
      saveGoogleTokens.mutate({ accessToken, refreshToken, expiry });
      
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else if (googleError) {
      toast({
        title: "Google Calendar Connection Failed",
        description: "Please try again or check your Google account permissions.",
        variant: "destructive",
      });
      
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const { data: settings } = useQuery({
    queryKey: ["/api/user/settings"],
    onSuccess: (data) => {
      setNotionDatabaseId(data.notionDatabaseId || "");
      setHasGoogleAuth(!!data.hasGoogleAuth);
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (data: { notionApiKey?: string; notionDatabaseId?: string }) => {
      return apiRequest("PUT", "/api/user/settings", data);
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Your Notion settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
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
    onSuccess: (data) => {
      toast({
        title: "Connection successful!",
        description: `Connected to database: ${data.databaseTitle}`,
      });
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
      const response = await apiRequest("GET", "/api/auth/google");
      const data = await response.json();
      window.location.href = data.authUrl;
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to connect to Google Calendar. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveGoogleTokens = useMutation({
    mutationFn: async (tokens: { accessToken: string; refreshToken: string; expiry: string }) => {
      return apiRequest("POST", "/api/auth/google/save-tokens", tokens);
    },
    onSuccess: () => {
      setHasGoogleAuth(true);
      toast({
        title: "Google Calendar Connected!",
        description: "You can now sync your tasks to Google Calendar.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save Google Calendar connection. Please try again.",
        variant: "destructive",
      });
    },
  });

  const disconnectGoogleCalendar = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/auth/google");
    },
    onSuccess: () => {
      setHasGoogleAuth(false);
      toast({
        title: "Google Calendar Disconnected",
        description: "Your Google Calendar has been disconnected.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to disconnect Google Calendar. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateSettings.mutate({
      notionApiKey: notionApiKey || undefined,
      notionDatabaseId: notionDatabaseId || undefined,
    });
  };

  const handleTestConnection = () => {
    testConnection.mutate();
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
              Connect your Google Calendar to sync tasks as calendar events with time blocking and reminders.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${hasGoogleAuth ? 'bg-green-500' : 'bg-gray-300'}`} />
                <div>
                  <p className="font-medium">
                    {hasGoogleAuth ? 'Connected to Google Calendar' : 'Not connected'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {hasGoogleAuth 
                      ? 'Your tasks can be synced to Google Calendar with time blocking and reminders' 
                      : 'Connect your Google account to enable calendar sync for your tasks'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasGoogleAuth ? (
                  <Button 
                    onClick={() => disconnectGoogleCalendar.mutate()}
                    disabled={disconnectGoogleCalendar.isPending}
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                  >
                    {disconnectGoogleCalendar.isPending ? 'Disconnecting...' : 'Disconnect'}
                  </Button>
                ) : (
                  <Button 
                    onClick={() => connectGoogleCalendar.mutate()}
                    disabled={connectGoogleCalendar.isPending}
                    className="flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    {connectGoogleCalendar.isPending ? 'Connecting...' : 'Connect Google Calendar'}
                  </Button>
                )}
              </div>
            </div>

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
      </div>
    </div>
  );
}