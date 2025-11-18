import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  duration?: number;
  source?: string;
  calendarColor?: string;
  calendarName?: string;
};

export default function Calendar() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | '3day' | 'week' | 'month'>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const dayViewRef = useRef<HTMLDivElement>(null);
  const threeDayViewRef = useRef<HTMLDivElement>(null);
  const weekViewRef = useRef<HTMLDivElement>(null);
  
  // Drag and resize state
  const [draggingEvent, setDraggingEvent] = useState<CalendarEvent | null>(null);
  const [resizingEvent, setResizingEvent] = useState<CalendarEvent | null>(null);
  const [resizeEdge, setResizeEdge] = useState<'top' | 'bottom' | null>(null);
  const [dragStartY, setDragStartY] = useState<number>(0);
  const [dragStartTime, setDragStartTime] = useState<Date | null>(null);
  const [tempEventTime, setTempEventTime] = useState<{ start: Date; end: Date } | null>(null);

  // Auto-scroll to current time in Day, 3-Day, and Week views
  useEffect(() => {
    const currentHour = new Date().getHours();
    // Scroll to current hour (each time slot is approximately 60px height)
    const scrollPosition = currentHour * 76; // 60px height + 16px padding
    
    if (view === 'day' && dayViewRef.current) {
      dayViewRef.current.scrollTo({
        top: scrollPosition - 100, // Offset to show some context above
        behavior: 'smooth'
      });
    } else if (view === '3day' && threeDayViewRef.current) {
      threeDayViewRef.current.scrollTo({
        top: scrollPosition - 100,
        behavior: 'smooth'
      });
    } else if (view === 'week' && weekViewRef.current) {
      weekViewRef.current.scrollTo({
        top: scrollPosition - 100,
        behavior: 'smooth'
      });
    }
  }, [view]);

  // Drag and drop handlers
  const handleEventMouseDown = (event: CalendarEvent, e: React.MouseEvent, edge?: 'top' | 'bottom') => {
    // Only allow dragging/resizing ProductivityQuest tasks, not external Google Calendar events
    if (event.source !== 'productivityquest') return;

    e.stopPropagation();
    e.preventDefault();

    if (edge) {
      // Resizing
      setResizingEvent(event);
      setResizeEdge(edge);
      setDragStartY(e.clientY);
      setDragStartTime(new Date(edge === 'top' ? event.start : event.end));
    } else {
      // Moving
      setDraggingEvent(event);
      setDragStartY(e.clientY);
      setDragStartTime(new Date(event.start));
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingEvent && !resizingEvent) return;

    const deltaY = e.clientY - dragStartY;
    // Each 60px (height of time slot) = 1 hour, snap to 5-minute intervals
    const minutesDelta = Math.round((deltaY / 60) * 60 / 5) * 5; // Round to nearest 5 minutes

    if (draggingEvent && dragStartTime) {
      // Calculate new start and end times
      const newStart = new Date(dragStartTime);
      newStart.setMinutes(newStart.getMinutes() + minutesDelta);

      const eventDuration = new Date(draggingEvent.end).getTime() - new Date(draggingEvent.start).getTime();
      const newEnd = new Date(newStart.getTime() + eventDuration);

      setTempEventTime({ start: newStart, end: newEnd });
    } else if (resizingEvent && dragStartTime && resizeEdge) {
      // Calculate new start or end time based on which edge is being dragged
      const currentStart = new Date(resizingEvent.start);
      const currentEnd = new Date(resizingEvent.end);

      if (resizeEdge === 'top') {
        const newStart = new Date(dragStartTime);
        newStart.setMinutes(newStart.getMinutes() + minutesDelta);

        // Ensure minimum duration of 5 minutes
        const minEnd = new Date(newStart.getTime() + 5 * 60000);
        if (currentEnd > minEnd) {
          setTempEventTime({ start: newStart, end: currentEnd });
        }
      } else {
        const newEnd = new Date(dragStartTime);
        newEnd.setMinutes(newEnd.getMinutes() + minutesDelta);

        // Ensure minimum duration of 5 minutes
        const minEnd = new Date(currentStart.getTime() + 5 * 60000);
        if (newEnd >= minEnd) {
          setTempEventTime({ start: currentStart, end: newEnd });
        }
      }
    }
  };

  const handleMouseUp = async () => {
    if ((draggingEvent || resizingEvent) && tempEventTime) {
      const eventToUpdate = draggingEvent || resizingEvent;
      
      if (eventToUpdate && eventToUpdate.source === 'productivityquest') {
        // Extract task ID from event ID (format: task-{id})
        const taskId = eventToUpdate.id.replace('task-', '');
        
        // Calculate duration in minutes
        const durationMs = tempEventTime.end.getTime() - tempEventTime.start.getTime();
        const durationMinutes = Math.round(durationMs / 60000);

        try {
          // Update task via API
          const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              dueDate: tempEventTime.start.toISOString(),
              duration: durationMinutes,
            }),
          });

          if (response.ok) {
            // Refetch calendar query to get updated data and wait for it to complete
            await queryClient.refetchQueries({ 
              queryKey: [`/api/google-calendar/events?year=${currentDate.getFullYear()}&month=${currentDate.getMonth()}`] 
            });
            // Also invalidate tasks query so task detail modals show updated data
            queryClient.invalidateQueries({ 
              queryKey: ['/api/tasks'] 
            });
          } else {
            console.error('Failed to update task:', await response.text());
          }
        } catch (error) {
          console.error('Failed to update task:', error);
        }
      }
    }

    // Reset drag state after query invalidation completes
    setDraggingEvent(null);
    setResizingEvent(null);
    setResizeEdge(null);
    setDragStartY(0);
    setDragStartTime(null);
    setTempEventTime(null);
  };

  const getEventDisplayTime = (event: CalendarEvent) => {
    if ((draggingEvent?.id === event.id || resizingEvent?.id === event.id) && tempEventTime) {
      return tempEventTime;
    }
    return { start: new Date(event.start), end: new Date(event.end) };
  };

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

  // Calculate absolute position and height for an event
  // Each hour slot is 60px tall
  const getEventPosition = (event: CalendarEvent) => {
    const displayTime = getEventDisplayTime(event);
    const startDate = new Date(displayTime.start);
    const endDate = new Date(displayTime.end);
    
    const startHour = startDate.getHours();
    const startMinute = startDate.getMinutes();
    const endHour = endDate.getHours();
    const endMinute = endDate.getMinutes();
    
    // Calculate top position: hour * 60px + (minute/60) * 60px
    const top = startHour * 60 + (startMinute / 60) * 60;
    
    // Calculate height: total minutes * (60px per hour / 60 minutes)
    const durationMinutes = (endDate.getTime() - startDate.getTime()) / 60000;
    const height = (durationMinutes / 60) * 60;
    
    return { top, height: Math.max(height, 20) }; // Minimum 20px height
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
            <div 
              ref={dayViewRef} 
              className="overflow-auto max-h-[600px]"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
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
                <div className="grid grid-cols-[80px_1fr] gap-px bg-purple-500/20">
                  <div className="bg-gray-900/20">
                    {/* Time labels column */}
                    {timeSlots.map(({ hour, label }) => (
                      <div key={hour} className="p-2 text-xs text-gray-500 text-right pr-3 h-[60px] border-b border-purple-500/10">
                        {label}
                      </div>
                    ))}
                  </div>
                  <div className="bg-gray-900/20 relative" style={{ height: '1440px' }}> {/* 24 hours * 60px */}
                    {/* Hour grid lines */}
                    {timeSlots.map(({ hour }) => (
                      <div 
                        key={hour}
                        className="absolute left-0 right-0 h-[60px] border-b border-purple-500/10"
                        style={{ top: `${hour * 60}px` }}
                      />
                    ))}
                    
                    {/* Current Time Indicator */}
                    {(() => {
                      const now = new Date();
                      const isToday = currentDate.toDateString() === now.toDateString();
                      if (isToday) {
                        const currentHour = now.getHours();
                        const currentMinute = now.getMinutes();
                        const topPosition = currentHour * 60 + (currentMinute / 60) * 60;
                        return (
                          <div 
                            className="absolute left-0 right-0 flex items-center z-20"
                            style={{ top: `${topPosition}px` }}
                          >
                            <div className="w-2 h-2 rounded-full bg-red-500 shadow-lg shadow-red-500/50 -ml-1"></div>
                            <div className="flex-1 h-0.5 bg-red-500 shadow-md shadow-red-500/50"></div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    {/* Events with absolute positioning */}
                    {getEventsForDate(currentDate).map((event, idx) => {
                      const eventStyle = getEventStyle(event);
                      const displayTime = getEventDisplayTime(event);
                      const position = getEventPosition(event);
                      const isDragging = draggingEvent?.id === event.id;
                      const isResizing = resizingEvent?.id === event.id;
                      const isDraggable = event.source === 'productivityquest';
                      
                      return (
                        <div
                          key={idx}
                          className={`absolute left-2 right-2 p-2 rounded text-xs border group ${
                            isDraggable ? 'cursor-move' : 'cursor-pointer'
                          } ${isDragging || isResizing ? 'opacity-50' : 'hover:opacity-80'} ${eventStyle.className || ''}`}
                          style={{ 
                            top: `${position.top}px`,
                            height: `${position.height}px`,
                            backgroundColor: eventStyle.backgroundColor,
                            borderColor: eventStyle.borderColor,
                            color: eventStyle.color,
                            zIndex: 10
                          }}
                          onMouseDown={(e) => isDraggable ? handleEventMouseDown(event, e) : undefined}
                          onClick={() => !isDragging && !isResizing && setSelectedEvent(event)}
                        >
                          {/* Top resize handle */}
                          {isDraggable && (
                            <div
                              className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-white/30 rounded-t"
                              onMouseDown={(e) => handleEventMouseDown(event, e, 'top')}
                            />
                          )}
                          
                          <div className="font-medium truncate">{event.title}</div>
                          {position.height > 30 && (
                            <div className="text-[10px] opacity-70">
                              {displayTime.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              {' - '}
                              {displayTime.end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                            </div>
                          )}
                          {position.height > 50 && event.description && (
                            <div className="opacity-80 truncate mt-1 text-[10px]">
                              {event.description}
                            </div>
                          )}
                          
                          {/* Bottom resize handle */}
                          {isDraggable && (
                            <div
                              className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-white/30 rounded-b"
                              onMouseDown={(e) => handleEventMouseDown(event, e, 'bottom')}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3-Day View */}
          {view === '3day' && (
            <div 
              ref={threeDayViewRef} 
              className="overflow-auto max-h-[600px]"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
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
                                const displayTime = getEventDisplayTime(event);
                                const isDragging = draggingEvent?.id === event.id;
                                const isResizing = resizingEvent?.id === event.id;
                                const isDraggable = event.source === 'productivityquest';
                                
                                return (
                                  <div
                                    key={eventIdx}
                                    className={`p-1.5 mb-1 rounded text-xs border relative group ${
                                      isDraggable ? 'cursor-move' : 'cursor-pointer'
                                    } ${isDragging || isResizing ? 'opacity-50' : 'hover:opacity-80'} ${eventStyle.className || ''}`}
                                    style={eventStyle.backgroundColor ? { 
                                      backgroundColor: eventStyle.backgroundColor,
                                      borderColor: eventStyle.borderColor,
                                      color: eventStyle.color
                                    } : undefined}
                                    onMouseDown={(e) => isDraggable ? handleEventMouseDown(event, e) : undefined}
                                    onClick={() => !isDragging && !isResizing && setSelectedEvent(event)}
                                  >
                                    {/* Top resize handle */}
                                    {isDraggable && (
                                      <div
                                        className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-white/30"
                                        onMouseDown={(e) => handleEventMouseDown(event, e, 'top')}
                                      />
                                    )}
                                    
                                    <div className="font-medium truncate">{event.title}</div>
                                    <div className="text-[9px] opacity-70">
                                      {displayTime.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                    </div>
                                    
                                    {/* Bottom resize handle */}
                                    {isDraggable && (
                                      <div
                                        className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-white/30"
                                        onMouseDown={(e) => handleEventMouseDown(event, e, 'bottom')}
                                      />
                                    )}
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
            <div 
              ref={weekViewRef} 
              className="overflow-auto max-h-[600px]"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
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
                                const displayTime = getEventDisplayTime(event);
                                const isDragging = draggingEvent?.id === event.id;
                                const isResizing = resizingEvent?.id === event.id;
                                const isDraggable = event.source === 'productivityquest';
                                
                                return (
                                  <div
                                    key={eventIdx}
                                    className={`p-1 mb-1 rounded text-xs border relative group ${
                                      isDraggable ? 'cursor-move' : 'cursor-pointer'
                                    } ${isDragging || isResizing ? 'opacity-50' : 'hover:opacity-80'} ${eventStyle.className || ''}`}
                                    style={eventStyle.backgroundColor ? { 
                                      backgroundColor: eventStyle.backgroundColor,
                                      borderColor: eventStyle.borderColor,
                                      color: eventStyle.color
                                    } : undefined}
                                    onMouseDown={(e) => isDraggable ? handleEventMouseDown(event, e) : undefined}
                                    onClick={() => !isDragging && !isResizing && setSelectedEvent(event)}
                                  >
                                    {/* Top resize handle */}
                                    {isDraggable && (
                                      <div
                                        className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-white/30"
                                        onMouseDown={(e) => handleEventMouseDown(event, e, 'top')}
                                      />
                                    )}
                                    
                                    <div className="font-medium truncate text-[10px]">{event.title}</div>
                                    
                                    {/* Bottom resize handle */}
                                    {isDraggable && (
                                      <div
                                        className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-white/30"
                                        onMouseDown={(e) => handleEventMouseDown(event, e, 'bottom')}
                                      />
                                    )}
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

        {/* Event Detail Modal */}
        {selectedEvent && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedEvent(null)}
          >
            <Card 
              className="bg-gray-900/95 border-purple-500/30 max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with colored accent */}
              <div 
                className="h-2 rounded-t-lg"
                style={{ 
                  backgroundColor: selectedEvent.calendarColor || '#9333ea'
                }}
              />
              
              <div className="p-6">
                {/* Title */}
                <h3 className="text-2xl font-bold text-white mb-4">
                  {selectedEvent.title}
                </h3>

                {/* Time */}
                <div className="flex items-start gap-3 mb-4">
                  <CalendarIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-white">
                      {new Date(selectedEvent.start).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-gray-400">
                      {new Date(selectedEvent.start).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                      {' - '}
                      {new Date(selectedEvent.end).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>
                </div>

                {/* Calendar Name */}
                {selectedEvent.calendarName && (
                  <div className="flex items-start gap-3 mb-4">
                    <div 
                      className="w-5 h-5 rounded-full mt-0.5"
                      style={{ backgroundColor: selectedEvent.calendarColor || '#9333ea' }}
                    />
                    <div>
                      <p className="text-sm text-gray-400">Calendar</p>
                      <p className="text-white">{selectedEvent.calendarName}</p>
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedEvent.description && (
                  <div className="mb-4 pb-4 border-b border-gray-700">
                    <p className="text-sm text-gray-400 mb-1">Description</p>
                    <p className="text-gray-300 whitespace-pre-wrap">
                      {selectedEvent.description}
                    </p>
                  </div>
                )}

                {/* ProductivityQuest specific fields */}
                {selectedEvent.source === 'productivityquest' && (
                  <div className="space-y-3 mb-4 pb-4 border-b border-gray-700">
                    {selectedEvent.importance && (
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Importance</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          selectedEvent.importance === 'urgent' ? 'bg-red-500/20 text-red-300' :
                          selectedEvent.importance === 'important' ? 'bg-orange-500/20 text-orange-300' :
                          'bg-blue-500/20 text-blue-300'
                        }`}>
                          {selectedEvent.importance.toUpperCase()}
                        </span>
                      </div>
                    )}

                    {selectedEvent.goldValue !== undefined && (
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Gold Reward</p>
                        <p className="text-yellow-400 font-bold">
                          🪙 {selectedEvent.goldValue} Gold
                        </p>
                      </div>
                    )}

                    {selectedEvent.campaign && (
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Questline</p>
                        <p className="text-white">{selectedEvent.campaign}</p>
                      </div>
                    )}

                    {selectedEvent.skillTags && selectedEvent.skillTags.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Skills</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedEvent.skillTags.map((skill, idx) => (
                            <span 
                              key={idx}
                              className="px-2 py-1 rounded bg-purple-500/20 text-purple-300 text-xs"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedEvent.completed !== undefined && (
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Status</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          selectedEvent.completed 
                            ? 'bg-green-500/20 text-green-300' 
                            : 'bg-gray-500/20 text-gray-300'
                        }`}>
                          {selectedEvent.completed ? '✓ Completed' : 'Pending'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Color Picker for ProductivityQuest tasks */}
                {selectedEvent.source === 'productivityquest' && (
                  <div className="mb-4">
                    <label className="text-sm text-gray-400 block mb-2">
                      Calendar Color
                    </label>
                    <div className="grid grid-cols-6 gap-2">
                      {[
                        '#9333ea', '#ef4444', '#f97316', '#eab308',
                        '#22c55e', '#3b82f6', '#ec4899', '#8b5cf6',
                        '#06b6d4', '#14b8a6', '#a855f7', '#6366f1',
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
                                setSelectedEvent({ ...selectedEvent, calendarColor: color });
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
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 justify-end">
                  {selectedEvent.source === 'google' && (
                    <Button
                      variant="outline"
                      className="border-purple-500/30"
                      onClick={() => {
                        // Open in Google Calendar
                        const googleCalendarUrl = `https://calendar.google.com/calendar/r/eventedit/${selectedEvent.id.replace('google-', '')}`;
                        window.open(googleCalendarUrl, '_blank');
                      }}
                    >
                      Open in Google Calendar
                    </Button>
                  )}
                  {selectedEvent.source === 'productivityquest' && (
                    <Button
                      variant="outline"
                      className="border-purple-500/30"
                      onClick={() => {
                        window.location.href = '/';
                      }}
                    >
                      View Task Details
                    </Button>
                  )}
                  <Button
                    onClick={() => setSelectedEvent(null)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
