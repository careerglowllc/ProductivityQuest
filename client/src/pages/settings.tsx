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
  const [googleClientEmail, setGoogleClientEmail] = useState("");
  const [googlePrivateKey, setGooglePrivateKey] = useState("");
  const [showGooglePrivateKey, setShowGooglePrivateKey] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["/api/user/settings"],
    onSuccess: (data) => {
      setNotionDatabaseId(data.notionDatabaseId || "");
      setHasGoogleAuth(!!data.hasGoogleAuth);
      setGoogleClientEmail(data.googleClientEmail || "");
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (data: { notionApiKey?: string; notionDatabaseId?: string; googleClientEmail?: string; googlePrivateKey?: string }) => {
      return apiRequest("PUT", "/api/user/settings", data);
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Your settings have been saved successfully.",
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

  const testGoogleConnection = useMutation({
    mutationFn: async () => {
      // First save the settings
      await apiRequest("PUT", "/api/user/settings", {
        googleClientEmail: googleClientEmail || undefined,
        googlePrivateKey: googlePrivateKey || undefined,
      });
      
      // Then test the connection
      return apiRequest("GET", "/api/google/test");
    },
    onSuccess: (data) => {
      setHasGoogleAuth(true);
      toast({
        title: "Google Calendar Connected!",
        description: `Successfully connected to Google Calendar`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
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
      return apiRequest("PUT", "/api/user/settings", {
        googleClientEmail: '',
        googlePrivateKey: '',
      });
    },
    onSuccess: () => {
      setHasGoogleAuth(false);
      setGoogleClientEmail("");
      setGooglePrivateKey("");
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

  const handleGoogleSave = () => {
    updateSettings.mutate({
      googleClientEmail: googleClientEmail || undefined,
      googlePrivateKey: googlePrivateKey || undefined,
    });
  };

  const handleGoogleTestConnection = () => {
    testGoogleConnection.mutate();
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
              Configure your Google service account credentials to sync tasks as calendar events with time blocking and reminders.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="google-client-email">Google Service Account Email</Label>
              <Input
                id="google-client-email"
                type="email"
                placeholder="your-service-account@your-project.iam.gserviceaccount.com"
                value={googleClientEmail}
                onChange={(e) => setGoogleClientEmail(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Current status: {settings?.googleClientEmail ? "✓ Configured" : "Not set"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="google-private-key">Google Service Account Private Key</Label>
              <div className="relative">
                <Input
                  id="google-private-key"
                  type={showGooglePrivateKey ? "text" : "password"}
                  placeholder="-----BEGIN PRIVATE KEY-----\n..."
                  value={googlePrivateKey}
                  onChange={(e) => setGooglePrivateKey(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowGooglePrivateKey(!showGooglePrivateKey)}
                >
                  {showGooglePrivateKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Current status: {settings?.googlePrivateKey ? "✓ Configured" : "Not set"}
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleGoogleSave} 
                disabled={updateSettings.isPending}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateSettings.isPending ? "Saving..." : "Save Google Settings"}
              </Button>
              <Button 
                onClick={handleGoogleTestConnection}
                disabled={testGoogleConnection.isPending || !googleClientEmail || !googlePrivateKey}
                variant="outline"
                className="flex-1"
              >
                {testGoogleConnection.isPending ? "Testing..." : "Test Connection"}
              </Button>
            </div>

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
                      : 'Enter your Google service account credentials above and test the connection'
                    }
                  </p>
                </div>
              </div>
              {hasGoogleAuth && (
                <Button 
                  onClick={() => disconnectGoogleCalendar.mutate()}
                  disabled={disconnectGoogleCalendar.isPending}
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                >
                  {disconnectGoogleCalendar.isPending ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              )}
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

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Google Calendar Setup Instructions</CardTitle>
            <CardDescription>
              Follow these steps to create a Google service account for calendar integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold">1. Create a Google Cloud Project</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Console</a></li>
                <li>• Create a new project or select an existing one</li>
                <li>• Enable the Google Calendar API for your project</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">2. Create a Service Account</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Go to IAM & Admin → Service Accounts</li>
                <li>• Click "Create Service Account"</li>
                <li>• Give it a name like "calendar-sync-service"</li>
                <li>• Skip the optional steps and click "Done"</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">3. Generate Private Key</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Click on your service account</li>
                <li>• Go to the "Keys" tab</li>
                <li>• Click "Add Key" → "Create new key"</li>
                <li>• Choose "JSON" format and click "Create"</li>
                <li>• The JSON file will download automatically</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">4. Extract Credentials</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Open the downloaded JSON file</li>
                <li>• Copy the "client_email" value (service account email)</li>
                <li>• Copy the "private_key" value (includes -----BEGIN PRIVATE KEY-----)</li>
                <li>• Paste these values in the fields above</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">5. Share Your Calendar</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Go to <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Calendar</a></li>
                <li>• Click the three dots next to your calendar</li>
                <li>• Select "Settings and sharing"</li>
                <li>• In "Share with specific people", add your service account email</li>
                <li>• Give it "Make changes to events" permission</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">6. Test Connection</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Save your credentials above</li>
                <li>• Click "Test Connection" to verify everything works</li>
                <li>• If successful, you can now sync tasks to Google Calendar</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}