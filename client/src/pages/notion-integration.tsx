import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, ArrowLeft, Link as LinkIcon, Database, Key, ExternalLink, Copy, AlertCircle, Loader2 } from "lucide-react";
import type { UserSettings } from "@/../../shared/schema";

export default function NotionIntegration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notionApiKey, setNotionApiKey] = useState("");
  const [notionDatabaseId, setNotionDatabaseId] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ["/api/user/settings"],
  });

  useEffect(() => {
    if (settings?.notionDatabaseId) {
      setNotionDatabaseId(settings.notionDatabaseId);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: { notionApiKey: string; notionDatabaseId: string }) => {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update settings');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
      toast({
        title: "Success!",
        description: "Your Notion integration has been configured.",
      });
      setNotionApiKey(""); // Clear the API key from state for security
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!notionApiKey || !notionDatabaseId) {
      toast({
        title: "Missing Information",
        description: "Please provide both API key and database ID",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate({ notionApiKey, notionDatabaseId });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const isConfigured = settings?.notionDatabaseId && settings?.notionApiKey;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/settings">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Notion Integration</h1>
              <p className="text-sm text-gray-600">Connect your personal Notion workspace</p>
            </div>
            {isConfigured && (
              <Badge className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Card */}
        {isConfigured ? (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Your Notion workspace is connected! Your tasks will sync from your personal database.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Connect your Notion workspace to sync tasks and stay productive!
            </AlertDescription>
          </Alert>
        )}

        {/* Setup Steps */}
        <div className="grid gap-6 mb-8">
          {/* Step 1: Create Integration */}
          <Card className={currentStep === 1 ? "border-purple-500 border-2" : ""}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= 1 ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-600"
                }`}>
                  1
                </div>
                <div>
                  <CardTitle>Create a Notion Integration</CardTitle>
                  <CardDescription>Set up an internal integration in your Notion workspace</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-3 text-sm text-gray-700">
                <li>Visit <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline inline-flex items-center gap-1">
                  Notion Integrations <ExternalLink className="h-3 w-3" />
                </a></li>
                <li>Click <strong>"+ New integration"</strong></li>
                <li>Give it a name (e.g., "ProductivityQuest")</li>
                <li>Select your workspace</li>
                <li>Under <strong>"Capabilities"</strong>, ensure:
                  <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                    <li>Read content ✓</li>
                    <li>Update content ✓</li>
                    <li>Insert content ✓</li>
                  </ul>
                </li>
                <li>Click <strong>"Submit"</strong></li>
                <li>Copy your <strong>"Internal Integration Secret"</strong> (starts with "ntn_")</li>
              </ol>
              
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://www.notion.so/my-integrations', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Notion Integrations
                </Button>
                <Button
                  size="sm"
                  onClick={() => setCurrentStep(2)}
                >
                  Next Step
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Create/Select Database */}
          <Card className={currentStep === 2 ? "border-purple-500 border-2" : ""}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= 2 ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-600"
                }`}>
                  2
                </div>
                <div>
                  <CardTitle>Set Up Your Task Database</CardTitle>
                  <CardDescription>Create or use an existing Notion database for your tasks</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 font-medium mb-2">📋 Required Database Properties (exact names):</p>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• <strong>Task</strong> (Name/Title) - Task name</li>
                  <li>• <strong>Due</strong> (Date) - When it's due</li>
                  <li>• <strong>Importance</strong> (Select) - Options: Pareto, High, Med-High, Medium, Med-Low, Low</li>
                  <li>• <strong>Kanban - Stage</strong> (Status) - Options: Not Started, In Progress, Incubate, Done</li>
                  <li>• <strong>Recur Type</strong> (Select) - Options: one-time, daily, every other day, 2x week, 3x week, weekly, 2x month, monthly, every 2 months, quarterly, every 6 months, yearly</li>
                </ul>
                <p className="text-xs text-yellow-600 mt-2">⚠️ Property names and options must match exactly (case-sensitive)</p>
              </div>

              <ol className="list-decimal list-inside space-y-3 text-sm text-gray-700">
                <li>In Notion, create a new <strong>Database</strong> (or use an existing one)</li>
                <li>Add the properties listed above with <strong>exact names and types</strong></li>
                <li>Click the <strong>"•••"</strong> menu in the top right of your database</li>
                <li>Click <strong>"+ Add connections"</strong></li>
                <li>Select your integration (e.g., "ProductivityQuest")</li>
                <li>Click <strong>"Confirm"</strong></li>
                <li><strong>Copy the entire URL</strong> from your browser address bar, or just the database ID:
                  <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono break-all">
                    https://notion.so/<span className="bg-yellow-200">32CharacterDatabaseID</span>?v=...
                  </div>
                  <p className="text-xs text-green-600 mt-1">✨ You can paste the full URL in Step 3 - we'll extract the ID automatically!</p>
                </li>
              </ol>
              
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep(1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  onClick={() => setCurrentStep(3)}
                >
                  Next Step
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Connect to ProductivityQuest */}
          <Card className={currentStep === 3 ? "border-purple-500 border-2" : ""}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= 3 ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-600"
                }`}>
                  3
                </div>
                <div>
                  <CardTitle>Connect Your Integration</CardTitle>
                  <CardDescription>Enter your credentials to complete the setup</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="apiKey" className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Notion API Key
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="apiKey"
                      type={showApiKey ? "text" : "password"}
                      placeholder="ntn_..."
                      value={notionApiKey}
                      onChange={(e) => setNotionApiKey(e.target.value)}
                      className="font-mono text-sm"
                      disabled={updateMutation.isPending}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowApiKey(!showApiKey)}
                      disabled={updateMutation.isPending}
                    >
                      {showApiKey ? "Hide" : "Show"}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {settings?.notionApiKey ? "✓ Currently configured (hidden for security)" : "Your integration secret from Step 1"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="databaseId" className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Database ID or URL
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="databaseId"
                      type="text"
                      placeholder="Paste full URL or just the 32-character ID"
                      value={notionDatabaseId}
                      onChange={(e) => setNotionDatabaseId(e.target.value)}
                      className="font-mono text-sm"
                      disabled={updateMutation.isPending}
                    />
                    {notionDatabaseId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => copyToClipboard(notionDatabaseId, "Database ID")}
                        disabled={updateMutation.isPending}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    💡 <strong>Pro tip:</strong> Just paste the entire database URL from your browser - we'll automatically extract the ID for you!
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div className="text-sm text-gray-700">
                      <p className="font-medium mb-1">Privacy & Security</p>
                      <p className="text-xs">
                        Your Notion credentials are encrypted and stored securely. They are only accessible by your account and used solely to sync your tasks. No one else can access your Notion data.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    disabled={updateMutation.isPending}
                  >
                    Previous
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={updateMutation.isPending || (!notionApiKey && !settings?.notionApiKey) || !notionDatabaseId}
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <LinkIcon className="h-4 w-4 mr-2" />
                        {isConfigured ? "Update Connection" : "Connect Notion"}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Help & Support */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700">
            <p>
              <strong>Can I just paste the URL?</strong> Yes! Just paste the entire database URL from your browser. We'll automatically extract the 32-character database ID for you.
            </p>
            <p>
              <strong>Integration not working?</strong> Make sure you've shared your database with the integration. Click "•••" → "Add connections" in your database.
            </p>
            <p>
              <strong>Required properties missing?</strong> Your database must have these exact properties: <strong>Task</strong> (Name), <strong>Due</strong> (Date), <strong>Importance</strong> (Select), <strong>Kanban - Stage</strong> (Status), and <strong>Recur Type</strong> (Select). Names are case-sensitive!
            </p>
            <p>
              <strong>Want to use multiple databases?</strong> Currently, each account can connect to one database. Choose the database where you want to manage your tasks.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
