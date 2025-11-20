import { Link } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, ArrowLeft, Check } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Timezone options
const TIMEZONES = [
  // US Timezones
  { value: "America/New_York", label: "Eastern Time (ET)", offset: "UTC-5/-4" },
  { value: "America/Chicago", label: "Central Time (CT)", offset: "UTC-6/-5" },
  { value: "America/Denver", label: "Mountain Time (MT)", offset: "UTC-7/-6" },
  { value: "America/Phoenix", label: "Arizona Time (MST)", offset: "UTC-7" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)", offset: "UTC-8/-7" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)", offset: "UTC-9/-8" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)", offset: "UTC-10" },
  
  // Asia
  { value: "Asia/Shanghai", label: "China Standard Time (CST)", offset: "UTC+8" },
  { value: "Asia/Ho_Chi_Minh", label: "Vietnam Time (ICT)", offset: "UTC+7" },
];

export default function TimezoneSettingsPage() {
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/settings"],
  });

  // Get current timezone from settings or browser default
  const currentTimezone = settings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [selectedTimezone, setSelectedTimezone] = useState(currentTimezone);

  // Update selected timezone when settings load
  useEffect(() => {
    if (settings?.timezone) {
      setSelectedTimezone(settings.timezone);
    }
  }, [settings?.timezone]);

  const updateTimezoneMutation = useMutation({
    mutationFn: async (timezone: string) => {
      return await apiRequest("POST", "/api/settings/timezone", { timezone });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({
        title: "Timezone updated",
        description: "Your timezone preference has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating timezone",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveTimezone = () => {
    if (selectedTimezone !== currentTimezone) {
      updateTimezoneMutation.mutate(selectedTimezone);
    }
  };

  const hasChanges = selectedTimezone !== currentTimezone;

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
            <Link href="/settings/calendar">
              <Button
                variant="ghost"
                className="mb-4 text-yellow-200/70 hover:text-yellow-100 hover:bg-yellow-500/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Calendar Settings
              </Button>
            </Link>
            
            <div className="flex items-center gap-3 mb-2">
              <Clock className="h-8 w-8 text-yellow-400" />
              <h1 className="text-3xl font-serif font-bold text-yellow-100">Timezone Settings</h1>
            </div>
            <p className="text-yellow-200/70">Select your timezone for calendar events and scheduling</p>
          </div>

          {/* Current Timezone Info */}
          <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-blue-500/30 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="h-5 w-5 text-blue-400" />
                <h3 className="text-lg font-serif font-bold text-yellow-100">Current Timezone</h3>
              </div>
              <p className="text-yellow-200/70">
                {TIMEZONES.find(tz => tz.value === currentTimezone)?.label || currentTimezone}
              </p>
              <p className="text-sm text-yellow-200/50 mt-1">
                Current time: {new Date().toLocaleTimeString('en-US', { 
                  timeZone: currentTimezone,
                  hour: 'numeric',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true 
                })}
              </p>
            </CardContent>
          </Card>

          {/* Timezone Selection */}
          <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30">
            <CardContent className="p-6">
              <h3 className="text-lg font-serif font-bold text-yellow-100 mb-4">Select Timezone</h3>
              
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {TIMEZONES.map((timezone) => (
                  <button
                    key={timezone.value}
                    onClick={() => setSelectedTimezone(timezone.value)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedTimezone === timezone.value
                        ? 'bg-purple-500/20 border-purple-500/50'
                        : 'bg-slate-700/30 border-slate-600/30 hover:border-purple-500/30 hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-yellow-100">{timezone.label}</div>
                        <div className="text-sm text-yellow-200/60 mt-1">
                          {timezone.offset} • {timezone.value}
                        </div>
                        <div className="text-xs text-yellow-200/40 mt-1">
                          Current time: {new Date().toLocaleTimeString('en-US', { 
                            timeZone: timezone.value,
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </div>
                      </div>
                      {selectedTimezone === timezone.value && (
                        <Check className="h-5 w-5 text-purple-400 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Save Button */}
              {hasChanges && (
                <div className="mt-6 pt-6 border-t border-slate-600/50">
                  <Button
                    onClick={handleSaveTimezone}
                    disabled={updateTimezoneMutation.isPending}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {updateTimezoneMutation.isPending ? 'Saving...' : 'Save Timezone'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-yellow-600/30 mt-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-serif font-bold text-yellow-100 mb-3">About Timezone Settings</h3>
              <ul className="space-y-2 text-sm text-yellow-200/70">
                <li className="flex gap-2">
                  <span className="text-purple-400">•</span>
                  <span>All calendar events will be displayed in your selected timezone</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-purple-400">•</span>
                  <span>Tasks without a specific time will default to 12 PM (noon) in your timezone</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-purple-400">•</span>
                  <span>Google Calendar events will sync with the correct timezone conversion</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
