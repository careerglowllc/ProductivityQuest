import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, ArrowLeft, Calendar, Key, ExternalLink, Copy, AlertCircle, Loader2, RefreshCw, Download, Trash2, Link as LinkIcon } from "lucide-react";
import type { UserSettings } from "@/../../shared/schema";

export default function GoogleCalendarIntegration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncDirection, setSyncDirection] = useState<'import' | 'export' | 'both'>('both');
  const [instantSync, setInstantSync] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ["/api/user/settings"],
  });

  useEffect(() => {
    if (settings) {
      setSyncEnabled(settings.googleCalendarSyncEnabled || false);
      setSyncDirection((settings.googleCalendarSyncDirection as any) || 'both');
      setInstantSync(settings.googleCalendarInstantSync || false);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: { 
      googleCalendarClientId?: string; 
      googleCalendarClientSecret?: string;
      googleCalendarSyncEnabled?: boolean;
      googleCalendarSyncDirection?: string;
      googleCalendarInstantSync?: boolean;
    }) => {
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
        description: "Your Google Calendar integration has been configured.",
      });
      setClientId("");
      setClientSecret("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const syncNowMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/google-calendar/sync', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync calendar');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/google-calendar/events"] });
      
      // Build a descriptive message based on what was synced
      const parts = [];
      if (data.exported > 0) parts.push(`Exported ${data.exported} tasks to Google Calendar`);
      if (data.exportFailed > 0) parts.push(`${data.exportFailed} exports failed`);
      if (data.imported > 0) parts.push(`Imported ${data.imported} events`);
      
      toast({
        title: "Sync Complete!",
        description: parts.length > 0 ? parts.join('. ') : 'Sync completed successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/google-calendar/clear-all', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to clear calendar events');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/google-calendar/events"] });
      toast({
        title: "Calendar Cleared!",
        description: `Deleted ${data.deletedFromGoogle} events from Google Calendar, cleared ${data.clearedFromTasks} task references.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Clear Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/google-calendar/disconnect', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to disconnect');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
      toast({
        title: "Disconnected",
        description: "Google Calendar has been disconnected. You can reconnect anytime.",
      });
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
    
    if (!clientId || !clientSecret) {
      toast({
        title: "Missing Information",
        description: "Please provide both Client ID and Client Secret",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate({ 
      googleCalendarClientId: clientId, 
      googleCalendarClientSecret: clientSecret,
      googleCalendarSyncEnabled: true // Enable sync when credentials are saved
    });
  };

  const handleSyncToggle = (enabled: boolean) => {
    setSyncEnabled(enabled);
    updateMutation.mutate({ googleCalendarSyncEnabled: enabled });
  };

  const handleSyncDirectionChange = (direction: 'import' | 'export' | 'both') => {
    setSyncDirection(direction);
    updateMutation.mutate({ googleCalendarSyncDirection: direction });
  };

  const handleInstantSyncToggle = (enabled: boolean) => {
    setInstantSync(enabled);
    updateMutation.mutate({ googleCalendarInstantSync: enabled });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const isConfigured = settings?.googleCalendarClientId && settings?.googleCalendarClientSecret;
  const isAuthorized = settings?.googleCalendarAccessToken;
  const isFullyConnected = isConfigured && isAuthorized;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center pb-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-20 px-4">
      {/* Header */}
      <div className="max-w-4xl mx-auto pt-8">
        <Link href="/settings">
          <Button variant="ghost" className="mb-6 text-yellow-200 hover:text-yellow-100 hover:bg-slate-800/50">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Settings
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-yellow-100 mb-2 flex items-center gap-2 sm:gap-3">
            <Calendar className="h-7 w-7 sm:h-10 sm:w-10 text-purple-400 flex-shrink-0" />
            <span>Google Calendar Integration</span>
          </h1>
          <p className="text-sm sm:text-base text-yellow-200/70">
            Sync your tasks with Google Calendar to keep everything in one place
          </p>
        </div>

        {/* Status Card */}
        {isFullyConnected ? (
          <Alert className="mb-6 border-green-600/40 bg-green-900/20">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <AlertDescription className="text-green-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
                <span>Google Calendar is fully connected and ready to sync</span>
                <Button
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                  variant="outline"
                  size="sm"
                  className="border-red-500/40 text-red-400 hover:bg-red-900/20 hover:text-red-300 flex-shrink-0 w-fit"
                >
                {disconnectMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-3 w-3" />
                    Disconnect
                  </>
                )}
              </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : isConfigured ? (
          <Alert className="mb-6 border-yellow-600/40 bg-yellow-900/20">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <AlertDescription className="text-yellow-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
              <span>Credentials saved — authorization required to complete setup</span>
              <Button
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                variant="outline"
                size="sm"
                className="border-red-500/40 text-red-400 hover:bg-red-900/20 hover:text-red-300 flex-shrink-0 w-fit"
              >
                {disconnectMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-3 w-3" />
                    Disconnect
                  </>
                )}
              </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-6 border-yellow-600/40 bg-yellow-900/20">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <AlertDescription className="text-yellow-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
              <span>Google Calendar is not connected</span>
              <Button
                onClick={() => setShowConnectModal(true)}
                variant="outline"
                size="sm"
                className="border-green-500/40 text-green-400 hover:bg-green-900/20 hover:text-green-300 flex-shrink-0 w-fit"
              >
                <LinkIcon className="mr-2 h-3 w-3" />
                Connect
              </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Sync Controls (if configured) */}
        {isConfigured && (
          <Card className="mb-6 bg-slate-800/60 backdrop-blur-md border-2 border-purple-600/30">
            <CardHeader>
              <CardTitle className="text-yellow-100">Sync Controls</CardTitle>
              <CardDescription className="text-yellow-200/70">
                Manage how your tasks sync with Google Calendar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Authorization Status */}
              {!settings?.googleCalendarAccessToken && (
                <Alert className="border-yellow-600/40 bg-yellow-900/20">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <AlertDescription className="text-yellow-100">
                    <div className="space-y-3">
                      <p>You need to authorize access to your Google Calendar to complete the setup.</p>
                      <Button
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/google-calendar/authorize-url', {
                              credentials: 'include'
                            });
                            
                            if (!response.ok) {
                              const error = await response.json();
                              throw new Error(error.error || error.details || 'Failed to get authorization URL');
                            }
                            
                            const data = await response.json();
                            if (data.authUrl) {
                              window.location.href = data.authUrl;
                            } else {
                              throw new Error('No authorization URL received');
                            }
                          } catch (error: any) {
                            console.error('Authorization error:', error);
                            toast({
                              title: "Authorization Error",
                              description: error.message || "Failed to get authorization URL",
                              variant: "destructive",
                            });
                          }
                        }}
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        <Key className="mr-2 h-4 w-4" />
                        Authorize Google Account
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Enable/Disable Sync */}
              <div className="flex items-center justify-between p-4 bg-slate-900/40 rounded-lg border border-purple-500/20">
                <div>
                  <Label htmlFor="sync-enabled" className="text-yellow-100 font-semibold">
                    Enable Automatic Sync
                  </Label>
                  <p className="text-sm text-yellow-200/60 mt-1">
                    Automatically sync tasks and calendar events
                  </p>
                </div>
                <Switch
                  id="sync-enabled"
                  checked={syncEnabled}
                  onCheckedChange={handleSyncToggle}
                />
              </div>

              {/* Sync Direction */}
              {syncEnabled && (
                <div className="space-y-3">
                  <Label className="text-yellow-100 font-semibold">Sync Direction</Label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <Button
                      variant={syncDirection === 'import' ? 'default' : 'outline'}
                      onClick={() => handleSyncDirectionChange('import')}
                      className={`text-xs sm:text-sm px-2 sm:px-4 ${syncDirection === 'import' 
                        ? 'bg-purple-600 hover:bg-purple-700' 
                        : 'border-purple-500/40 text-yellow-200 hover:bg-purple-900/20'}`}
                    >
                      <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="truncate">Import</span>
                    </Button>
                    <Button
                      variant={syncDirection === 'export' ? 'default' : 'outline'}
                      onClick={() => handleSyncDirectionChange('export')}
                      className={`text-xs sm:text-sm px-2 sm:px-4 ${syncDirection === 'export' 
                        ? 'bg-purple-600 hover:bg-purple-700' 
                        : 'border-purple-500/40 text-yellow-200 hover:bg-purple-900/20'}`}
                    >
                      <RefreshCw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="truncate">Export</span>
                    </Button>
                    <Button
                      variant={syncDirection === 'both' ? 'default' : 'outline'}
                      onClick={() => handleSyncDirectionChange('both')}
                      className={`text-xs sm:text-sm px-2 sm:px-4 ${syncDirection === 'both' 
                        ? 'bg-purple-600 hover:bg-purple-700' 
                        : 'border-purple-500/40 text-yellow-200 hover:bg-purple-900/20'}`}
                    >
                      <RefreshCw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="truncate">Two-Way</span>
                    </Button>
                  </div>
                  <p className="text-xs text-yellow-200/60">
                    {syncDirection === 'import' && 'Tasks from Google Calendar will be imported to ProductivityQuest'}
                    {syncDirection === 'export' && 'Tasks from ProductivityQuest will be exported to Google Calendar'}
                    {syncDirection === 'both' && 'Tasks will sync in both directions automatically'}
                  </p>
                </div>
              )}

              {/* Instant Calendar Sync Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-900/40 rounded-lg border border-emerald-500/20">
                <div>
                  <Label htmlFor="instant-sync" className="text-yellow-100 font-semibold">
                    Instant Calendar Sync
                  </Label>
                  <p className="text-sm text-yellow-200/60 mt-1">
                    Automatically add new quests to calendar when created
                  </p>
                </div>
                <Switch
                  id="instant-sync"
                  checked={instantSync}
                  onCheckedChange={handleInstantSyncToggle}
                  disabled={!syncEnabled}
                />
              </div>

              {/* Manual Sync Button */}
              <Button
                onClick={() => syncNowMutation.mutate()}
                disabled={syncNowMutation.isPending || !syncEnabled}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400"
              >
                {syncNowMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Now
                  </>
                )}
              </Button>

              {/* Clear All Events Button */}
              <Button
                onClick={() => {
                  if (window.confirm('This will delete ALL synced events from Google Calendar and clear all task references. Are you sure?')) {
                    clearAllMutation.mutate();
                  }
                }}
                disabled={clearAllMutation.isPending || !syncEnabled}
                variant="outline"
                className="w-full border-orange-500/40 text-orange-400 hover:bg-orange-900/20 hover:text-orange-300"
              >
                {clearAllMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear All Synced Events
                  </>
                )}
              </Button>

              {/* Disconnect Button */}
              <div className="pt-4 border-t border-red-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-400">Disconnect Google Calendar</p>
                    <p className="text-xs text-yellow-200/60">Remove connection and clear stored tokens</p>
                  </div>
                  <Button
                    onClick={() => disconnectMutation.mutate()}
                    disabled={disconnectMutation.isPending}
                    variant="outline"
                    className="border-red-500/40 text-red-400 hover:bg-red-900/20 hover:text-red-300"
                  >
                    {disconnectMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Disconnect
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Setup Instructions */}
        <Card className="mb-6 bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30">
          <CardHeader>
            <CardTitle className="text-yellow-100">Setup Instructions</CardTitle>
            <CardDescription className="text-yellow-200/70">
              Follow these steps to connect your Google Calendar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1 */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 1 ? 'bg-purple-600' : 'bg-slate-700'} flex-shrink-0`}>
                  <span className="text-white font-bold">1</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-100 mb-2">Create a Google Cloud Project</h3>
                  <ol className="space-y-2 text-sm text-yellow-200/80 list-decimal list-inside">
                    <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline inline-flex items-center gap-1">
                      Google Cloud Console <ExternalLink className="h-3 w-3" />
                    </a></li>
                    <li>Create a new project or select an existing one</li>
                    <li>Name it something like "ProductivityQuest Calendar Sync"</li>
                  </ol>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 border-purple-500/40 text-purple-300 hover:bg-purple-900/20"
                    onClick={() => setCurrentStep(Math.max(currentStep, 2))}
                  >
                    Next Step
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 2 ? 'bg-purple-600' : 'bg-slate-700'} flex-shrink-0`}>
                  <span className="text-white font-bold">2</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-100 mb-2">Enable Google Calendar API</h3>
                  <ol className="space-y-2 text-sm text-yellow-200/80 list-decimal list-inside">
                    <li>In your Google Cloud Project, go to "APIs & Services" → "Enable APIs and Services"</li>
                    <li>Search for "Google Calendar API"</li>
                    <li>Click on it and press "Enable"</li>
                  </ol>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 border-purple-500/40 text-purple-300 hover:bg-purple-900/20"
                    onClick={() => setCurrentStep(Math.max(currentStep, 3))}
                    disabled={currentStep < 2}
                  >
                    Next Step
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 3 ? 'bg-purple-600' : 'bg-slate-700'} flex-shrink-0`}>
                  <span className="text-white font-bold">3</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-100 mb-2">Create OAuth 2.0 Credentials</h3>
                  <ol className="space-y-2 text-sm text-yellow-200/80 list-decimal list-inside">
                    <li>Go to "APIs & Services" → "Credentials"</li>
                    <li>Click "Create Credentials" → "OAuth client ID"</li>
                    <li>Application type: "Web application"</li>
                    <li>Add Authorized redirect URI:
                      <div className="mt-2 flex items-center gap-2">
                        <code className="flex-1 bg-slate-900/60 border border-purple-500/30 px-3 py-2 rounded text-xs text-purple-300">
                          {window.location.origin}/api/google-calendar/callback
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(`${window.location.origin}/api/google-calendar/callback`, "Redirect URI")}
                          className="border-purple-500/40 text-purple-300 hover:bg-purple-900/20"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </li>
                    <li>Click "Create" and you'll receive your Client ID and Client Secret</li>
                  </ol>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 border-purple-500/40 text-purple-300 hover:bg-purple-900/20"
                    onClick={() => setCurrentStep(4)}
                    disabled={currentStep < 3}
                  >
                    Next Step
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 4 - Enter Credentials */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 4 ? 'bg-purple-600' : 'bg-slate-700'} flex-shrink-0`}>
                  <span className="text-white font-bold">4</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-100 mb-2">Enter Your Credentials</h3>
                  <p className="text-sm text-yellow-200/70 mb-4">
                    Paste the Client ID and Client Secret from Google Cloud Console
                  </p>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="client-id" className="text-yellow-100">
                        Client ID
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="client-id"
                          type="text"
                          value={clientId}
                          onChange={(e) => setClientId(e.target.value)}
                          placeholder="1234567890-abcdefghijk.apps.googleusercontent.com"
                          className="flex-1 bg-slate-900/60 border-purple-500/30 text-yellow-100"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="client-secret" className="text-yellow-100">
                        Client Secret
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="client-secret"
                          type={showClientSecret ? "text" : "password"}
                          value={clientSecret}
                          onChange={(e) => setClientSecret(e.target.value)}
                          placeholder="GOCSPX-xxxxxxxxxxxxx"
                          className="flex-1 bg-slate-900/60 border-purple-500/30 text-yellow-100"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowClientSecret(!showClientSecret)}
                          className="border-purple-500/40 text-purple-300 hover:bg-purple-900/20"
                        >
                          {showClientSecret ? "Hide" : "Show"}
                        </Button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={updateMutation.isPending}
                      className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400"
                    >
                      {updateMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Save Credentials
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-blue-600/30">
          <CardHeader>
            <CardTitle className="text-yellow-100 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-400" />
              Important Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-yellow-200/80">
            <p>
              <strong className="text-yellow-100">🔒 Security:</strong> Your credentials are encrypted and stored securely. ProductivityQuest never has access to your Google account password.
            </p>
            <p>
              <strong className="text-yellow-100">📅 Sync Behavior:</strong> Tasks with due dates will be synced as calendar events. Changes made in either system will be reflected in the other.
            </p>
            <p>
              <strong className="text-yellow-100">⏱️ Sync Frequency:</strong> Automatic sync occurs every 15 minutes when enabled. You can also trigger manual sync anytime.
            </p>
            <p>
              <strong className="text-yellow-100">🗑️ Deletion Handling:</strong> Deleting a task in ProductivityQuest will remove it from Google Calendar and vice versa (in two-way sync mode).
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Connect Modal */}
      {showConnectModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowConnectModal(false)}
        >
          <Card 
            className="bg-slate-900/95 border-purple-500/30 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="text-yellow-100 flex items-center gap-2">
                <Key className="h-5 w-5 text-purple-400" />
                Connect Google Calendar
              </CardTitle>
              <CardDescription className="text-yellow-200/70">
                Enter your Google Cloud OAuth credentials to connect
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!clientId || !clientSecret) {
                  toast({
                    title: "Missing Information",
                    description: "Please provide both Client ID and Client Secret",
                    variant: "destructive",
                  });
                  return;
                }
                updateMutation.mutate({ 
                  googleCalendarClientId: clientId, 
                  googleCalendarClientSecret: clientSecret,
                  googleCalendarSyncEnabled: true
                });
                setShowConnectModal(false);
              }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="modal-clientId" className="text-yellow-100">Client ID</Label>
                  <Input
                    id="modal-clientId"
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                    className="bg-slate-800/60 border-purple-500/30 text-yellow-100 placeholder:text-yellow-200/40"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modal-clientSecret" className="text-yellow-100">Client Secret</Label>
                  <Input
                    id="modal-clientSecret"
                    type={showClientSecret ? "text" : "password"}
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="bg-slate-800/60 border-purple-500/30 text-yellow-100 placeholder:text-yellow-200/40"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowClientSecret(!showClientSecret)}
                    className="text-xs text-purple-400 hover:text-purple-300"
                  >
                    {showClientSecret ? "Hide" : "Show"} secret
                  </button>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowConnectModal(false)}
                    className="flex-1 border-gray-500/40 text-gray-300 hover:bg-gray-800/50"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending || !clientId || !clientSecret}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Connect
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
