import { useQuery } from "@tanstack/react-query";
import { Calendar as CalendarIcon, Settings, Plus } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState, useEffect, useRef } from "react";
import React from "react";

type UserSettings = {
  googleCalendarSyncEnabled?: boolean;
  googleCalendarClientId?: string | null;
  googleCalendarClientSecret?: string | null;
  googleCalendarAccessToken?: string | null;
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
  source?: string;
  calendarColor?: string;
  calendarName?: string;
};

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | '3day' | 'week' | 'month'>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const dayViewRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current time in Day view
  useEffect(() => {
    if (view === 'day' && dayViewRef.current) {
      const currentHour = new Date().getHours();
      // Scroll to current hour (each time slot is approximately 60px height)
      const scrollPosition = currentHour * 76; // 60px height + 16px padding
      dayViewRef.current.scrollTo({
        top: scrollPosition - 100, // Offset to show some context above
        behavior: 'smooth'
      });
    }
  }, [view]);

  // Helper function to get event background style
  const getEventStyle = (event: CalendarEvent) => {
    // If event has a calendar color, use it
    if (event.calendarColor) {
      return {
        backgroundColor: event.calendarColor + '40', // Add transparency
        borderColor: event.calendarColor,
        color: '#fff'
      };
    }
    
    // Otherwise use importance-based colors
    if (event.completed) {
      return { className: 'bg-gray-700/50 text-gray-400 line-through border-gray-600' };
    } else if (event.importance === 'Pareto' || event.importance === 'High') {
      return { className: 'bg-red-500/20 text-red-300 border-red-500/30' };
    } else {
      return { className: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
    }
  };

  // Fetch user settings to check if Google Calendar is connected
  const { data: settings } = useQuery<UserSettings>({
    queryKey: ['/api/user/settings'],
  });

  const googleConnected = settings?.googleCalendarSyncEnabled && 
                          settings?.googleCalendarClientId && 
                          settings?.googleCalendarClientSecret &&
                          settings?.googleCalendarAccessToken; // Must have access token from OAuth

  // Fetch calendar events for current month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const { data: calendarData } = useQuery<{ events: CalendarEvent[] }>({
    queryKey: [`/api/google-calendar/events?year=${year}&month=${month}`],
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
    if (view === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (view === 'day') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 1);
      setCurrentDate(newDate);
    } else if (view === '3day') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 3);
      setCurrentDate(newDate);
    } else if (view === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
    }
  };

  const nextMonth = () => {
    if (view === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (view === 'day') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 1);
      setCurrentDate(newDate);
    } else if (view === '3day') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 3);
      setCurrentDate(newDate);
    } else if (view === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    }
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

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.getDate() === date.getDate() &&
             eventDate.getMonth() === date.getMonth() &&
             eventDate.getFullYear() === date.getFullYear();
    });
  };

  // Generate time slots (24 hours)
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i;
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return { hour, label: `${displayHour}:00 ${ampm}` };
  });

  // Get events for a specific hour on a specific date
  const getEventsForHour = (date: Date, hour: number) => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      const eventHour = eventDate.getHours();
      return eventDate.getDate() === date.getDate() &&
             eventDate.getMonth() === date.getMonth() &&
             eventDate.getFullYear() === date.getFullYear() &&
             eventHour === hour;
    });
  };

  // Get dates for 3-day view
  const get3DayDates = () => {
    const dates = [];
    for (let i = 0; i < 3; i++) {
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // Get dates for week view
  const getWeekDates = () => {
    const dates = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Start on Sunday
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
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
          {dayEvents.slice(0, 3).map(event => {
            const eventStyle = getEventStyle(event);
            return (
              <div
                key={event.id}
                className={`text-xs p-1 rounded truncate border cursor-pointer hover:opacity-80 ${eventStyle.className || ''}`}
                style={eventStyle.backgroundColor ? { 
                  backgroundColor: eventStyle.backgroundColor,
                  borderColor: eventStyle.borderColor,
                  color: eventStyle.color
                } : undefined}
                title={`${event.title}${event.calendarName ? ` (${event.calendarName})` : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEvent(event);
                }}
              >
                {event.title}
              </div>
            );
          })}
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

              <Link href="/google-calendar-integration">
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
          {/* View Selector and Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-white">
                {monthNames[month]} {year}
              </h2>
              
              {/* View Selector */}
              <div className="flex gap-1 bg-gray-800/60 p-1 rounded-lg border border-purple-500/20">
                <button
                  onClick={() => setView('day')}
                  className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                    view === 'day' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setView('3day')}
                  className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                    view === '3day' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  3 Days
                </button>
                <button
                  onClick={() => setView('week')}
                  className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                    view === 'week' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setView('month')}
                  className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                    view === 'month' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  Month
                </button>
              </div>
            </div>
            
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

          {/* Day Headers - Only show for month view */}
          {view === 'month' && (
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
          )}

          {/* Calendar Grid - Month View */}
          {view === 'month' && (
            <div className="grid grid-cols-7 gap-px bg-purple-500/20">
              {calendarDays}
            </div>
          )}

          {/* Day View */}
          {view === 'day' && (
            <div ref={dayViewRef} className="overflow-auto max-h-[600px]">
              <div className="min-w-[600px]">
                {/* Day Header */}
                <div className="grid grid-cols-[80px_1fr] gap-px bg-purple-500/20 sticky top-0 z-10">
                  <div className="bg-gray-800/60 p-3"></div>
                  <div className="bg-gray-800/60 p-3 text-center">
                    <div className="font-semibold text-purple-300">
                      {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {currentDate.getDate()}
                    </div>
                    <div className="text-sm text-gray-400">
                      {currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                {/* Time Slots */}
                <div className="grid grid-cols-[80px_1fr] gap-px bg-purple-500/20 relative">
                  {timeSlots.map(({ hour, label }) => {
                    const hourEvents = getEventsForHour(currentDate, hour);
                    const now = new Date();
                    const isToday = currentDate.toDateString() === now.toDateString();
                    const currentHour = now.getHours();
                    const currentMinute = now.getMinutes();
                    
                    // Calculate if current time indicator should appear in this hour slot
                    const showTimeIndicator = isToday && hour === currentHour;
                    const timeIndicatorPosition = (currentMinute / 60) * 100; // Percentage through the hour
                    
                    return (
                      <React.Fragment key={hour}>
                        <div className="bg-gray-900/20 p-2 text-xs text-gray-500 text-right pr-3">
                          {label}
                        </div>
                        <div className="bg-gray-900/20 p-2 min-h-[60px] relative">
                          {/* Current Time Indicator */}
                          {showTimeIndicator && (
                            <div 
                              className="absolute left-0 right-0 flex items-center z-20"
                              style={{ top: `${timeIndicatorPosition}%` }}
                            >
                              <div className="w-2 h-2 rounded-full bg-red-500 shadow-lg shadow-red-500/50 -ml-1"></div>
                              <div className="flex-1 h-0.5 bg-red-500 shadow-md shadow-red-500/50"></div>
                            </div>
                          )}
                          
                          {hourEvents.map((event, idx) => {
                            const eventStyle = getEventStyle(event);
                            return (
                              <div
                                key={idx}
                                className={`p-2 mb-1 rounded text-xs border cursor-pointer hover:opacity-80 ${eventStyle.className || ''}`}
                                style={eventStyle.backgroundColor ? { 
                                  backgroundColor: eventStyle.backgroundColor,
                                  borderColor: eventStyle.borderColor,
                                  color: eventStyle.color
                                } : undefined}
                                onClick={() => setSelectedEvent(event)}
                              >
                                <div className="font-medium truncate">{event.title}</div>
                                {event.description && (
                                  <div className="opacity-80 truncate mt-1">
                                    {event.description}
                                  </div>
                                )}
                                {event.calendarName && (
                                  <div className="text-[10px] opacity-60 mt-1">
                                    {event.calendarName}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 3-Day View */}
          {view === '3day' && (
            <div className="overflow-auto max-h-[600px]">
              <div className="min-w-[800px]">
                {/* Day Headers */}
                <div className="grid gap-px bg-purple-500/20 sticky top-0 z-10" style={{ gridTemplateColumns: '80px repeat(3, 1fr)' }}>
                  <div className="bg-gray-800/60 p-3"></div>
                  {get3DayDates().map((date, idx) => (
                    <div key={idx} className="bg-gray-800/60 p-3 text-center">
                      <div className="font-semibold text-purple-300">
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="text-xl font-bold text-white">
                        {date.getDate()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Time Slots */}
                <div className="grid gap-px bg-purple-500/20" style={{ gridTemplateColumns: '80px repeat(3, 1fr)' }}>
                  {timeSlots.map(({ hour, label }) => {
                    const now = new Date();
                    const currentHour = now.getHours();
                    const currentMinute = now.getMinutes();
                    const timeIndicatorPosition = (currentMinute / 60) * 100;
                    
                    return (
                      <React.Fragment key={hour}>
                        <div className="bg-gray-900/20 p-2 text-xs text-gray-500 text-right pr-3">
                          {label}
                        </div>
                        {get3DayDates().map((date, idx) => {
                          const hourEvents = getEventsForHour(date, hour);
                          const isToday = date.toDateString() === now.toDateString();
                          const showTimeIndicator = isToday && hour === currentHour;
                          
                          return (
                            <div key={idx} className="bg-gray-900/20 p-2 min-h-[60px] relative">
                              {/* Current Time Indicator */}
                              {showTimeIndicator && (
                                <div 
                                  className="absolute left-0 right-0 flex items-center z-20"
                                  style={{ top: `${timeIndicatorPosition}%` }}
                                >
                                  <div className="w-2 h-2 rounded-full bg-red-500 shadow-lg shadow-red-500/50 -ml-1"></div>
                                  <div className="flex-1 h-0.5 bg-red-500 shadow-md shadow-red-500/50"></div>
                                </div>
                              )}
                              
                              {hourEvents.map((event, eventIdx) => {
                                const eventStyle = getEventStyle(event);
                                return (
                                  <div
                                    key={eventIdx}
                                    className={`p-1.5 mb-1 rounded text-xs border cursor-pointer hover:opacity-80 ${eventStyle.className || ''}`}
                                    style={eventStyle.backgroundColor ? { 
                                      backgroundColor: eventStyle.backgroundColor,
                                      borderColor: eventStyle.borderColor,
                                      color: eventStyle.color
                                    } : undefined}
                                    onClick={() => setSelectedEvent(event)}
                                  >
                                    <div className="font-medium truncate">{event.title}</div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Week View */}
          {view === 'week' && (
            <div className="overflow-auto max-h-[600px]">
              <div className="min-w-[1200px]">
                {/* Day Headers */}
                <div className="grid gap-px bg-purple-500/20 sticky top-0 z-10" style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}>
                  <div className="bg-gray-800/60 p-3"></div>
                  {getWeekDates().map((date, idx) => {
                    const isCurrentDay = date.toDateString() === today.toDateString();
                    return (
                      <div key={idx} className={`bg-gray-800/60 p-3 text-center ${isCurrentDay ? 'border-2 border-purple-500' : ''}`}>
                        <div className="font-semibold text-purple-300">
                          {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className={`text-xl font-bold ${isCurrentDay ? 'text-purple-400' : 'text-white'}`}>
                          {date.getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Time Slots */}
                <div className="grid gap-px bg-purple-500/20" style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}>
                  {timeSlots.map(({ hour, label }) => {
                    const now = new Date();
                    const currentHour = now.getHours();
                    const currentMinute = now.getMinutes();
                    const timeIndicatorPosition = (currentMinute / 60) * 100;
                    
                    return (
                      <React.Fragment key={hour}>
                        <div className="bg-gray-900/20 p-2 text-xs text-gray-500 text-right pr-3">
                          {label}
                        </div>
                        {getWeekDates().map((date, idx) => {
                          const hourEvents = getEventsForHour(date, hour);
                          const isToday = date.toDateString() === now.toDateString();
                          const showTimeIndicator = isToday && hour === currentHour;
                          
                          return (
                            <div key={idx} className="bg-gray-900/20 p-1 min-h-[50px] relative">
                              {/* Current Time Indicator */}
                              {showTimeIndicator && (
                                <div 
                                  className="absolute left-0 right-0 flex items-center z-20"
                                  style={{ top: `${timeIndicatorPosition}%` }}
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-lg shadow-red-500/50 -ml-1"></div>
                                  <div className="flex-1 h-0.5 bg-red-500 shadow-md shadow-red-500/50"></div>
                                </div>
                              )}
                              
                              {hourEvents.map((event, eventIdx) => {
                                const eventStyle = getEventStyle(event);
                                return (
                                  <div
                                    key={eventIdx}
                                    className={`p-1 mb-1 rounded text-xs border cursor-pointer hover:opacity-80 ${eventStyle.className || ''}`}
                                    style={eventStyle.backgroundColor ? { 
                                      backgroundColor: eventStyle.backgroundColor,
                                      borderColor: eventStyle.borderColor,
                                      color: eventStyle.color
                                    } : undefined}
                                    onClick={() => setSelectedEvent(event)}
                                  >
                                    <div className="font-medium truncate text-[10px]">{event.title}</div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
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

        {/* Color Picker Modal */}
        {selectedEvent && selectedEvent.source === 'productivityquest' && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setSelectedEvent(null)}
          >
            <Card 
              className="bg-gray-900/95 border-purple-500/30 p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-4">
                {selectedEvent.title}
              </h3>
              
              {selectedEvent.calendarName && (
                <p className="text-sm text-gray-400 mb-2">
                  From: {selectedEvent.calendarName}
                </p>
              )}
              
              {selectedEvent.description && (
                <p className="text-gray-300 mb-4">
                  {selectedEvent.description}
                </p>
              )}

              <div className="mb-4">
                <label className="text-sm text-gray-400 block mb-2">
                  Calendar Color
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {[
                    '#9333ea', // Purple (default)
                    '#ef4444', // Red
                    '#f97316', // Orange
                    '#eab308', // Yellow
                    '#22c55e', // Green
                    '#3b82f6', // Blue
                    '#ec4899', // Pink
                    '#8b5cf6', // Violet
                    '#06b6d4', // Cyan
                    '#14b8a6', // Teal
                    '#a855f7', // Purple Light
                    '#6366f1', // Indigo
                  ].map(color => (
                    <button
                      key={color}
                      className={`w-10 h-10 rounded border-2 transition-transform hover:scale-110 ${
                        selectedEvent.calendarColor === color ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={async () => {
                        try {
                          const response = await fetch(`/api/tasks/${selectedEvent.id.replace('google-', '')}/color`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ color })
                          });
                          
                          if (response.ok) {
                            // Update the local event
                            setSelectedEvent({ ...selectedEvent, calendarColor: color });
                            // Refresh calendar data
                            window.location.reload();
                          }
                        } catch (error) {
                          console.error('Failed to update color:', error);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => setSelectedEvent(null)}
                  variant="outline"
                  className="border-purple-500/30"
                >
                  Close
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
