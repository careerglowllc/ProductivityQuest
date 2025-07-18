import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Settings, Save, Eye, EyeOff, ArrowLeft, Home } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showApiKey, setShowApiKey] = useState(false);
  const [notionApiKey, setNotionApiKey] = useState("");
  const [notionDatabaseId, setNotionDatabaseId] = useState("");

  const { data: settings } = useQuery({
    queryKey: ["/api/user/settings"],
    onSuccess: (data) => {
      setNotionDatabaseId(data.notionDatabaseId || "");
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
                <li>• Verify the database ID is exactly 32 characters</li>
                <li>• Make sure your API key is correct</li>
                <li>• Try refreshing the database page and sharing again</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">⚠️ Common Issues</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• <strong>Database not found:</strong> Make sure you shared the database with your integration</li>
                <li>• <strong>Wrong ID:</strong> Use the database ID, not the page ID</li>
                <li>• <strong>Required fields:</strong> Your database must have these columns: Task, Details, Due, Min to Complete, Importance, Kanban - Stage, Life Domain</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}