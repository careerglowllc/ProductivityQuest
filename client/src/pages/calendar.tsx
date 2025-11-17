import { useQuery } from "@tanstack/react-query";
import { Calendar as CalendarIcon, Settings, Plus } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";

type UserSettings = {
  googleCalendarSyncEnabled?: boolean;
  googleCalendarClientId?: string | null;
  googleCalendarClientSecret?: string | null;
  googleCalendarLastSync?: Date | null;
};

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  completed?: boolean;
  importance?: string;
  goldValue?: number;
  campaign?: string;
  skillTags?: string[];
};

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Fetch user settings to check if Google Calendar is connected
  const { data: settings } = useQuery<UserSettings>({
    queryKey: ['/api/user/settings'],
  });

  const googleConnected = settings?.googleCalendarSyncEnabled && 
                          settings?.googleCalendarClientId && 
                          settings?.googleCalendarClientSecret;

  // Fetch calendar events for current month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const { data: calendarData } = useQuery<{ events: CalendarEvent[] }>({
    queryKey: ['/api/google-calendar/events', { year, month }],
    enabled: !!googleConnected,
  });

  const events = calendarData?.events || [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const today = new Date();
  const isToday = (day: number) => {
    return day === today.getDate() && 
           month === today.getMonth() && 
           year === today.getFullYear();
  };

  // Get events for a specific day
  const getEventsForDay = (day: number) => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.getDate() === day &&
             eventDate.getMonth() === month &&
             eventDate.getFullYear() === year;
    });
  };

  // Generate calendar grid
  const calendarDays = [];
  
  // Empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="min-h-24 p-2 bg-gray-900/20" />);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEvents = getEventsForDay(day);
    
    calendarDays.push(
      <div
        key={day}
        className={`min-h-24 p-2 border border-purple-500/20 bg-gray-900/40 hover:bg-gray-800/60 transition-colors cursor-pointer ${
          isToday(day) ? 'ring-2 ring-yellow-400/50 bg-yellow-400/10' : ''
        }`}
      >
        <div className={`text-sm font-medium mb-1 ${
          isToday(day) ? 'text-yellow-400' : 'text-purple-300'
        }`}>
          {day}
        </div>
        {/* Display events for this day */}
        <div className="space-y-1">
          {dayEvents.slice(0, 3).map(event => (
            <div
              key={event.id}
              className={`text-xs p-1 rounded truncate ${
                event.completed 
                  ? 'bg-gray-700/50 text-gray-400 line-through' 
                  : event.importance === 'Pareto' || event.importance === 'High'
                    ? 'bg-red-500/20 text-red-300'
                    : 'bg-purple-500/20 text-purple-300'
              }`}
              title={event.title}
            >
              {event.title}
            </div>
          ))}
          {dayEvents.length > 3 && (
            <div className="text-xs text-gray-500">
              +{dayEvents.length - 3} more
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!googleConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <CalendarIcon className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                  Calendar
                </h1>
                <p className="text-gray-400 text-sm">Sync your tasks with Google Calendar</p>
              </div>
            </div>
          </div>

          {/* Not Connected Card */}
          <Card className="p-12 text-center bg-gray-900/60 border-purple-500/20">
            <div className="max-w-md mx-auto">
              <div className="mb-6 inline-flex p-4 bg-purple-500/10 rounded-full">
                <CalendarIcon className="w-16 h-16 text-purple-400" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-3">
                Google Calendar Not Connected
              </h2>
              
              <p className="text-gray-400 mb-8">
                Connect your Google Calendar to sync your tasks and view them here. 
                Follow our easy setup guide to get started.
              </p>

              <Link href="/settings/google-calendar">
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500">
                  <Settings className="w-4 h-4 mr-2" />
                  Set Up Google Calendar
                </Button>
              </Link>

              <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-left">
                <h3 className="text-sm font-semibold text-blue-400 mb-2">What you'll need:</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• A Google account</li>
                  <li>• Google Cloud Console access</li>
                  <li>• 5 minutes to set up OAuth credentials</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <CalendarIcon className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                Calendar
              </h1>
              <p className="text-gray-400 text-sm">Synced with Google Calendar</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Link href="/settings/google-calendar">
              <Button variant="outline" className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </Link>
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500">
              <Plus className="w-4 h-4 mr-2" />
              New Event
            </Button>
          </div>
        </div>

        {/* Calendar Card */}
        <Card className="p-6 bg-gray-900/60 border-purple-500/20">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">
              {monthNames[month]} {year}
            </h2>
            <div className="flex gap-2">
              <Button
                onClick={previousMonth}
                variant="outline"
                className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
              >
                ← Previous
              </Button>
              <Button
                onClick={() => setCurrentDate(new Date())}
                variant="outline"
                className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
              >
                Today
              </Button>
              <Button
                onClick={nextMonth}
                variant="outline"
                className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
              >
                Next →
              </Button>
            </div>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-px mb-px">
            {dayNames.map(day => (
              <div
                key={day}
                className="p-3 text-center font-semibold text-purple-300 bg-gray-800/60"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-px bg-purple-500/20">
            {calendarDays}
          </div>
        </Card>

        {/* Status Bar */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
            <span>Synced with Google Calendar</span>
          </div>
          <div>
            Last sync: {settings?.googleCalendarLastSync 
              ? new Date(settings.googleCalendarLastSync).toLocaleString()
              : 'Never'}
          </div>
        </div>
      </div>
    </div>
  );
}
