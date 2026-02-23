import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar as CalendarIcon, Settings, Plus, Trash2, Clock, Undo2, Sparkles, CalendarX2, CalendarMinus, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ToastAction } from "@/components/ui/toast";
import { useState, useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { MLSortFeedbackModal } from "@/components/ml-sort-feedback-modal";
import { apiRequest } from "@/lib/queryClient";
import React from "react";

type UserSettings = {
  googleCalendarSyncEnabled?: boolean;
  googleCalendarSyncDirection?: string;
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
  recurType?: string;
};

export default function Calendar() {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Load saved view preference from localStorage, default to 'month'
  const [view, setView] = useState<'day' | '3day' | 'week' | 'month'>(() => {
    const savedView = localStorage.getItem('calendarView');
    if (savedView === 'day' || savedView === '3day' || savedView === 'week' || savedView === 'month') {
      return savedView;
    }
    return 'month';
  });
  
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const dayViewRef = useRef<HTMLDivElement>(null);
  const threeDayViewRef = useRef<HTMLDivElement>(null);
  const weekViewRef = useRef<HTMLDivElement>(null);
  const autoScrollInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Drag and resize state
  const [draggingEvent, setDraggingEvent] = useState<CalendarEvent | null>(null);
  const [resizingEvent, setResizingEvent] = useState<CalendarEvent | null>(null);
  const [resizeEdge, setResizeEdge] = useState<'top' | 'bottom' | null>(null);
  const [dragStartY, setDragStartY] = useState<number>(0);
  const [dragStartScrollTop, setDragStartScrollTop] = useState<number>(0);
  const [dragStartTime, setDragStartTime] = useState<Date | null>(null);
  const [tempEventTime, setTempEventTime] = useState<{ start: Date; end: Date } | null>(null);
  const [hasDragged, setHasDragged] = useState(false);
  const [hasResized, setHasResized] = useState(false);

  // Multi-select state for drag selection
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const calendarContainerRef = useRef<HTMLDivElement>(null);

  // Undo state - stores the last change for undo functionality
  const [undoStack, setUndoStack] = useState<{
    taskId: string;
    previousState: {
      start: string;
      end: string;
      duration: number;
      dueDate?: string;
      scheduledTime?: string;
    };
    currentState: {
      start: string;
      end: string;
      duration: number;
      dueDate?: string;
      scheduledTime?: string;
    };
  } | null>(null);

  // ML Sorting state
  const [showMLFeedback, setShowMLFeedback] = useState(false);
  const [mlSortData, setMLSortData] = useState<{
    originalSchedule: any[];
    sortedSchedule: any[];
    taskMetadata: any[];
  } | null>(null);
  const [isSorting, setIsSorting] = useState(false);

  // Save view preference whenever it changes
  useEffect(() => {
    localStorage.setItem('calendarView', view);
  }, [view]);

  // Keyboard shortcuts: Undo (Cmd+Z) and Delete selected events (Delete/Backspace)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Check for Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
      
      // Delete/Backspace to delete selected events
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEventIds.size > 0) {
        // Don't delete if user is typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        e.preventDefault();
        await handleDeleteSelectedEvents();
      }
      
      // Escape to clear selection
      if (e.key === 'Escape') {
        setSelectedEventIds(new Set());
        setSelectedEvent(null);
        setShowDeleteMenu(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack]); // Re-attach listener when undoStack changes

  // Cleanup auto-scroll interval on unmount
  useEffect(() => {
    return () => {
      if (autoScrollInterval.current) {
        clearInterval(autoScrollInterval.current);
      }
    };
  }, []);

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

  // Undo function - reverts the last drag/resize change
  const handleUndo = async () => {
    if (!undoStack) {
      toast({
        title: "Nothing to Undo",
        description: "No recent calendar changes to undo",
      });
      return;
    }

    const { taskId, previousState } = undoStack;

    // OPTIMISTIC UPDATE: Revert UI immediately
    const queryKey = [`/api/google-calendar/events?year=${currentDate.getFullYear()}&month=${currentDate.getMonth()}`];
    const currentData = queryClient.getQueryData<{ events: CalendarEvent[] }>(queryKey);

    if (currentData?.events) {
      const revertedData = {
        events: currentData.events.map(event => 
          event.id === `task-${taskId}`
            ? {
                ...event,
                start: previousState.start,
                end: previousState.end,
                duration: previousState.duration
              }
            : event
        )
      };
      queryClient.setQueryData(queryKey, revertedData);
    }

    // Show toast notification
    toast({
      title: "Undone",
      description: "Event reverted to previous state",
    });

    // Clear undo stack
    setUndoStack(null);

    // Update backend
    try {
      const updatePayload: any = {
        scheduledTime: previousState.scheduledTime || previousState.start,
        duration: previousState.duration,
      };

      // If dueDate was changed, restore it
      if (previousState.dueDate) {
        updatePayload.dueDate = previousState.dueDate;
      }

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatePayload),
      });

      if (response.ok) {
        // Refetch to ensure data consistency
        queryClient.invalidateQueries({ queryKey });
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      } else {
        toast({
          title: "Undo Failed",
          description: "Failed to revert changes on server",
          variant: "destructive",
        });
        console.error('Failed to undo task update:', await response.text());
      }
    } catch (error) {
      toast({
        title: "Undo Failed",
        description: "Failed to revert changes on server",
        variant: "destructive",
      });
      console.error('Failed to undo task update:', error);
    }
  };

  // ML Smart Sort handler
  const handleMLSort = async () => {
    if (view !== 'day') {
      toast({
        title: "Day View Required",
        description: "ML sorting works best in Day view. Switch to Day view first.",
        variant: "destructive",
      });
      return;
    }

    setIsSorting(true);
    try {
      // Step 1: Get the sorted schedule from ML
      // Send the local date components and timezone offset
      // The offset helps the server find tasks that display on this local date
      const localDateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      const timezoneOffset = new Date().getTimezoneOffset(); // minutes offset from UTC (e.g., PST = 480)
      const response = await apiRequest('POST', '/api/ml/sort-tasks', {
        date: localDateString,
        timezoneOffset: timezoneOffset,
      });

      const data = await response.json();

      if (data.success && data.sortedSchedule?.length > 0) {
        // Step 2: APPLY the sort immediately
        const applyResponse = await apiRequest('POST', '/api/ml/apply-sort', {
          sortedSchedule: data.sortedSchedule,
        });

        const applyData = await applyResponse.json();

        if (applyData.success) {
          // Refresh calendar to show new order - use the correct query key with year/month
          const calendarQueryKey = `/api/google-calendar/events?year=${currentDate.getFullYear()}&month=${currentDate.getMonth()}`;
          await queryClient.refetchQueries({ queryKey: [calendarQueryKey] });
          await queryClient.refetchQueries({ queryKey: ['/api/tasks'] });

          toast({
            title: "✨ Day Sorted!",
            description: `Rearranged ${data.sortedSchedule.length} tasks by priority`,
          });

          // Step 3: Show small feedback modal
          setMLSortData({
            originalSchedule: data.originalSchedule,
            sortedSchedule: data.sortedSchedule,
            taskMetadata: data.taskMetadata,
          });
          setShowMLFeedback(true);
        } else {
          throw new Error('Failed to apply sorted schedule');
        }
      } else {
        toast({
          title: "No Tasks to Sort",
          description: "No tasks found for this day. Add some tasks first!",
        });
      }
    } catch (error: any) {
      toast({
        title: "Sorting Failed",
        description: error.message || "Failed to sort tasks",
        variant: "destructive",
      });
    } finally {
      setIsSorting(false);
    }
  };

  // Drag and drop handlers
  const handleEventMouseDown = (event: CalendarEvent, e: React.MouseEvent, edge?: 'top' | 'bottom') => {
    // Only allow dragging/resizing ProductivityQuest tasks, not external Google Calendar events
    if (event.source !== 'productivityquest') return;

    e.stopPropagation();
    e.preventDefault();

    // Get current scroll container
    const scrollContainer = view === 'day' ? dayViewRef.current : 
                           view === '3day' ? threeDayViewRef.current :
                           view === 'week' ? weekViewRef.current : null;

    if (edge) {
      // Resizing
      setResizingEvent(event);
      setResizeEdge(edge);
      setDragStartY(e.clientY);
      setDragStartScrollTop(scrollContainer?.scrollTop || 0);
      setDragStartTime(new Date(edge === 'top' ? event.start : event.end));
    } else {
      // Moving
      setDraggingEvent(event);
      setDragStartY(e.clientY);
      setDragStartScrollTop(scrollContainer?.scrollTop || 0);
      setDragStartTime(new Date(event.start));
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingEvent && !resizingEvent) return;

    // Set dragging/resizing flag when mouse actually moves
    if (draggingEvent && !hasDragged) {
      setHasDragged(true);
    }
    if (resizingEvent && !hasResized) {
      setHasResized(true);
    }

    // Auto-scroll logic when dragging near edges
    const scrollContainer = view === 'day' ? dayViewRef.current : 
                           view === '3day' ? threeDayViewRef.current :
                           view === 'week' ? weekViewRef.current : null;

    if (scrollContainer) {
      const rect = scrollContainer.getBoundingClientRect();
      const scrollThreshold = 50; // Pixels from edge to trigger scroll
      const scrollSpeed = 10; // Pixels to scroll per frame
      
      // Clear any existing auto-scroll
      if (autoScrollInterval.current) {
        clearInterval(autoScrollInterval.current);
        autoScrollInterval.current = null;
      }

      // Check if mouse is near top edge
      if (e.clientY < rect.top + scrollThreshold) {
        autoScrollInterval.current = setInterval(() => {
          if (scrollContainer.scrollTop > 0) {
            scrollContainer.scrollTop -= scrollSpeed;
          }
        }, 16); // ~60fps
      }
      // Check if mouse is near bottom edge
      else if (e.clientY > rect.bottom - scrollThreshold) {
        autoScrollInterval.current = setInterval(() => {
          if (scrollContainer.scrollTop < scrollContainer.scrollHeight - scrollContainer.clientHeight) {
            scrollContainer.scrollTop += scrollSpeed;
          }
        }, 16); // ~60fps
      }
    }

    // Calculate delta including scroll offset
    const currentScrollTop = scrollContainer?.scrollTop || 0;
    const scrollDelta = currentScrollTop - dragStartScrollTop;
    const deltaY = (e.clientY - dragStartY) + scrollDelta;
    
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
    // Clear auto-scroll interval
    if (autoScrollInterval.current) {
      clearInterval(autoScrollInterval.current);
      autoScrollInterval.current = null;
    }

    if ((draggingEvent || resizingEvent) && tempEventTime) {
      const eventToUpdate = draggingEvent || resizingEvent;
      
      if (eventToUpdate && eventToUpdate.source === 'productivityquest') {
        // Extract task ID from event ID (format: task-{id})
        const taskId = eventToUpdate.id.replace('task-', '');
        
        // Calculate duration in minutes
        const durationMs = tempEventTime.end.getTime() - tempEventTime.start.getTime();
        const durationMinutes = Math.round(durationMs / 60000);

        // Get the original event start time
        const originalStart = new Date(eventToUpdate.start);
        const newStart = tempEventTime.start;
        
        // Check if we're moving within the same day (same date, different time)
        const isSameDay = 
          originalStart.getFullYear() === newStart.getFullYear() &&
          originalStart.getMonth() === newStart.getMonth() &&
          originalStart.getDate() === newStart.getDate();
        
        let updatePayload: any;
        
        if (isSameDay && draggingEvent) {
          // Moving within the same day - only update scheduledTime (keep dueDate)
          updatePayload = {
            scheduledTime: newStart.toISOString(),
            duration: durationMinutes,
          };
        } else {
          // Moving across days or resizing - update both dueDate and scheduledTime
          updatePayload = {
            dueDate: newStart.toISOString(),
            scheduledTime: newStart.toISOString(),
            duration: durationMinutes,
          };
        }

        // OPTIMISTIC UPDATE: Update cache immediately
        const queryKey = [`/api/google-calendar/events?year=${currentDate.getFullYear()}&month=${currentDate.getMonth()}`];
        const previousData = queryClient.getQueryData<{ events: CalendarEvent[] }>(queryKey);
        
        // Store undo state BEFORE making changes
        const originalEvent = previousData?.events.find(e => e.id === eventToUpdate.id);
        if (originalEvent) {
          setUndoStack({
            taskId,
            previousState: {
              start: originalEvent.start,
              end: originalEvent.end,
              duration: originalEvent.duration || 30,
              dueDate: originalEvent.start, // Store original dueDate
              scheduledTime: originalEvent.start,
            },
            currentState: {
              start: newStart.toISOString(),
              end: tempEventTime.end.toISOString(),
              duration: durationMinutes,
              dueDate: updatePayload.dueDate,
              scheduledTime: updatePayload.scheduledTime,
            }
          });
        }
        
        // Show instant toast notification with Undo button
        toast({
          title: draggingEvent ? "Event Rescheduled" : "Duration Updated",
          description: `Updated to ${newStart.toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true 
          })} (${durationMinutes} min)`,
          action: (
            <ToastAction 
              altText="Undo change" 
              onClick={handleUndo}
              className="border-yellow-500/30 hover:bg-yellow-600/20 hover:border-yellow-400/50"
            >
              <Undo2 className="w-3 h-3 mr-1" />
              Undo
            </ToastAction>
          ),
          duration: 5000, // Keep toast visible for 5 seconds
        });

        // Optimistically update the UI
        if (previousData?.events) {
          const optimisticData = {
            events: previousData.events.map(event => 
              event.id === eventToUpdate.id
                ? {
                    ...event,
                    start: newStart.toISOString(),
                    end: tempEventTime.end.toISOString(),
                    duration: durationMinutes
                  }
                : event
            )
          };
          queryClient.setQueryData(queryKey, optimisticData);
        }

        // Reset drag state immediately for instant UI feedback
        setDraggingEvent(null);
        setResizingEvent(null);
        setResizeEdge(null);
        setDragStartY(0);
        setDragStartTime(null);
        setTempEventTime(null);
        
        // Use setTimeout to reset dragging flags after event handlers complete
        setTimeout(() => {
          setHasDragged(false);
          setHasResized(false);
        }, 100);

        // Then update backend in the background
        try {
          const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(updatePayload),
          });

          if (response.ok) {
            const result = await response.json();
            
            // Check Google Calendar sync result
            if (result.calendarSynced === true) {
              console.log('✅ Google Calendar updated for task', taskId);
            } else if (result.calendarSynced === false) {
              console.warn('⚠️ Google Calendar sync failed:', result.calendarSyncError);
              toast({
                title: "⚠️ Google Calendar Not Updated",
                description: result.calendarSyncError || "Failed to sync change to Google Calendar",
                variant: "destructive",
                duration: 4000,
              });
            }
            
            // Refetch to ensure data consistency
            queryClient.invalidateQueries({ queryKey });
            queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
          } else {
            // Revert on error
            if (previousData) {
              queryClient.setQueryData(queryKey, previousData);
            }
            toast({
              title: "Update Failed",
              description: "Failed to save changes. Reverting...",
              variant: "destructive",
            });
            console.error('Failed to update task:', await response.text());
          }
        } catch (error) {
          // Revert on error
          if (previousData) {
            queryClient.setQueryData(queryKey, previousData);
          }
          toast({
            title: "Update Failed",
            description: "Failed to save changes. Reverting...",
            variant: "destructive",
          });
          console.error('Failed to update task:', error);
        }
        
        return; // Exit early since we handled everything
      }
    }

    // Reset drag state for non-ProductivityQuest events or if no temp time
    setDraggingEvent(null);
    setResizingEvent(null);
    setResizeEdge(null);
    setDragStartY(0);
    setDragStartTime(null);
    setTempEventTime(null);
    
    // Use setTimeout to reset dragging flags after event handlers complete
    setTimeout(() => {
      setHasDragged(false);
      setHasResized(false);
    }, 100);
  };

  const getEventDisplayTime = (event: CalendarEvent) => {
    if ((draggingEvent?.id === event.id || resizingEvent?.id === event.id) && tempEventTime) {
      return tempEventTime;
    }
    return { start: new Date(event.start), end: new Date(event.end) };
  };

  // Complete a task from the calendar view
  const handleCompleteTask = async () => {
    if (!selectedEvent || selectedEvent.source !== 'productivityquest' || selectedEvent.completed) return;

    const taskId = selectedEvent.id;
    const eventTitle = selectedEvent.title;
    const isRecurring = selectedEvent.recurType && selectedEvent.recurType !== 'one-time';

    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to complete task');
      }

      const data = await response.json();
      const goldEarned = data.task?.goldValue || selectedEvent.goldValue || 0;
      const skillGains = data.skillXPGains || [];

      // Update the event in cache to show completed state
      const queryKey = [`/api/google-calendar/events?year=${currentDate.getFullYear()}&month=${currentDate.getMonth()}`];
      const previousData = queryClient.getQueryData<{ events: CalendarEvent[] }>(queryKey);

      if (previousData) {
        if (isRecurring) {
          // For recurring tasks, remove from current calendar view (it's been rescheduled)
          queryClient.setQueryData(queryKey, {
            ...previousData,
            events: previousData.events.filter(e => e.id !== taskId)
          });
        } else {
          // For one-time tasks, mark as completed visually
          queryClient.setQueryData(queryKey, {
            ...previousData,
            events: previousData.events.map(e =>
              e.id === taskId ? { ...e, completed: true } : e
            )
          });
        }
      }

      // Close modal
      setSelectedEvent(null);
      setShowDeleteMenu(false);

      // Build skill XP description
      const skillDesc = skillGains.length > 0
        ? ` | ${skillGains.map((s: any) => `${s.skillName} +${s.xpGained} XP`).join(', ')}`
        : '';

      toast({
        title: isRecurring
          ? `🔄 Routine Quest Complete!`
          : `⚔️ Quest Complete!`,
        description: isRecurring
          ? `"${eventTitle}" — Earned ${goldEarned} gold${skillDesc}. Rescheduled to next occurrence.`
          : `"${eventTitle}" — Earned ${goldEarned} gold${skillDesc}. Moved to recycling bin.`,
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/google-calendar/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/progress'] });
    } catch (error) {
      console.error('Failed to complete task:', error);
      toast({
        title: "Error",
        description: "Failed to complete quest. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Remove event from calendar handler (does NOT delete the quest!)
  const handleRemoveFromCalendar = async (removeFromGoogleToo: boolean) => {
    if (!selectedEvent) return;

    try {
      // For Google Calendar events (not from ProductivityQuest)
      if (selectedEvent.source === 'google') {
        if (removeFromGoogleToo) {
          // Open Google Calendar to delete (already handled in the button onClick)
          return;
        } else {
          // For app-only removal of Google events, explain that we can't hide them
          toast({
            title: "Cannot Hide Google Calendar Events",
            description: "Google Calendar events sync automatically. To remove this event, delete it from Google Calendar or disable calendar sync in Settings.",
            variant: "destructive",
          });
          
          // Close modals
          setSelectedEvent(null);
          setShowDeleteMenu(false);
          return;
        }
      }

      // For ProductivityQuest tasks - UNSCHEDULE (not delete!)
      // This removes from calendar but keeps the quest in Quests page
      const taskId = selectedEvent.id;
      const eventToRemove = selectedEvent;
      
      // OPTIMISTIC UPDATE: Immediately remove from UI
      const queryKey = [`/api/google-calendar/events?year=${currentDate.getFullYear()}&month=${currentDate.getMonth()}`];
      const previousData = queryClient.getQueryData<{ events: CalendarEvent[] }>(queryKey);
      
      // Remove from cache immediately
      if (previousData) {
        queryClient.setQueryData(queryKey, {
          ...previousData,
          events: previousData.events.filter(e => e.id !== eventToRemove.id)
        });
      }
      
      // Close modals immediately for snappy feel
      setSelectedEvent(null);
      setShowDeleteMenu(false);
      
      // Show immediate feedback
      toast({
        title: "Removed from Calendar",
        description: removeFromGoogleToo 
          ? "Event removed from calendar. Quest still available in Quests page." 
          : "Event removed from app calendar. Quest still available in Quests page.",
      });
      
      // Now do the backend call
      const response = await fetch(`/api/tasks/${taskId}/unschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          removeFromGoogleCalendar: removeFromGoogleToo 
        })
      });

      if (!response.ok) {
        // Revert optimistic update on failure
        if (previousData) {
          queryClient.setQueryData(queryKey, previousData);
        }
        throw new Error('Failed to remove from calendar');
      }
      
      // Refresh to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['/api/google-calendar/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      
    } catch (error) {
      console.error('Failed to remove from calendar:', error);
      toast({
        title: "Error",
        description: "Failed to remove from calendar. Please try again.",
        variant: "destructive",
      });
      // Refresh to restore correct state
      queryClient.invalidateQueries({ queryKey: ['/api/google-calendar/events'] });
    }
  };

  // Handle delete of multiple selected events
  const handleDeleteSelectedEvents = async () => {
    if (selectedEventIds.size === 0) return;
    
    const eventsToDelete = Array.from(selectedEventIds);
    let successCount = 0;
    let failCount = 0;
    
    for (const eventId of eventsToDelete) {
      // Only delete ProductivityQuest events (not Google Calendar events)
      if (eventId.startsWith('google-')) {
        failCount++;
        continue;
      }
      
      try {
        const response = await fetch(`/api/tasks/${eventId}/unschedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ removeFromGoogleCalendar: true })
        });
        
        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Failed to delete event ${eventId}:`, error);
        failCount++;
      }
    }
    
    // Clear selection
    setSelectedEventIds(new Set());
    
    // Refresh calendar data
    queryClient.invalidateQueries({ queryKey: ['/api/google-calendar/events'] });
    queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    
    // Show result toast
    if (successCount > 0) {
      toast({
        title: `Removed ${successCount} Event${successCount > 1 ? 's' : ''}`,
        description: failCount > 0 
          ? `${failCount} event(s) could not be removed (Google Calendar events must be deleted from Google Calendar)`
          : "Events removed from calendar. Quests still available in Quests page.",
      });
    } else if (failCount > 0) {
      toast({
        title: "Cannot Remove",
        description: "Google Calendar events must be deleted from Google Calendar directly.",
        variant: "destructive",
      });
    }
  };

  // Multi-select: Start selection box when clicking empty space
  const handleSelectionStart = (e: React.MouseEvent) => {
    // Only start selection if clicking on empty space (not an event)
    if ((e.target as HTMLElement).closest('[data-event-id]')) return;
    // Don't start selection if we're already dragging an event
    if (draggingEvent || resizingEvent) return;
    
    const container = calendarContainerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left + container.scrollLeft;
    const y = e.clientY - rect.top + container.scrollTop;
    
    setIsSelecting(true);
    setSelectionBox({ startX: x, startY: y, currentX: x, currentY: y });
    
    // Clear previous selection if not holding shift
    if (!e.shiftKey) {
      setSelectedEventIds(new Set());
    }
  };

  // Multi-select: Update selection box as mouse moves
  const handleSelectionMove = (e: React.MouseEvent) => {
    if (!isSelecting || !selectionBox) return;
    
    const container = calendarContainerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left + container.scrollLeft;
    const y = e.clientY - rect.top + container.scrollTop;
    
    setSelectionBox(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
  };

  // Multi-select: Finish selection and determine which events are selected
  const handleSelectionEnd = () => {
    if (!isSelecting || !selectionBox) {
      setIsSelecting(false);
      setSelectionBox(null);
      return;
    }
    
    // Calculate selection rectangle (normalized for drag direction)
    const minX = Math.min(selectionBox.startX, selectionBox.currentX);
    const maxX = Math.max(selectionBox.startX, selectionBox.currentX);
    const minY = Math.min(selectionBox.startY, selectionBox.currentY);
    const maxY = Math.max(selectionBox.startY, selectionBox.currentY);
    
    // Only select if box is larger than 10px (prevents accidental selections)
    if (maxX - minX > 10 && maxY - minY > 10) {
      // Find all event elements and check if they intersect with selection box
      const container = calendarContainerRef.current;
      if (container) {
        const eventElements = container.querySelectorAll('[data-event-id]');
        const newSelected = new Set(selectedEventIds);
        
        eventElements.forEach(el => {
          const eventRect = el.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          
          // Get event position relative to container (accounting for scroll)
          const eventLeft = eventRect.left - containerRect.left + container.scrollLeft;
          const eventTop = eventRect.top - containerRect.top + container.scrollTop;
          const eventRight = eventLeft + eventRect.width;
          const eventBottom = eventTop + eventRect.height;
          
          // Check if event intersects with selection box
          const intersects = !(
            eventRight < minX ||
            eventLeft > maxX ||
            eventBottom < minY ||
            eventTop > maxY
          );
          
          if (intersects) {
            const eventId = el.getAttribute('data-event-id');
            if (eventId) {
              newSelected.add(eventId);
            }
          }
        });
        
        setSelectedEventIds(newSelected);
      }
    }
    
    setIsSelecting(false);
    setSelectionBox(null);
  };

  // Reschedule event handler
  const handleReschedule = () => {
    setShowRescheduleModal(true);
    setShowDeleteMenu(false);
    setShowColorPicker(false);
  };

  // Calendar color options (Apple Calendar style)
  const calendarColors = [
    { name: 'Purple', value: '#9333ea' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Fuchsia', value: '#d946ef' },
  ];

  // Handle color change
  const handleColorChange = async (color: string) => {
    if (!selectedEvent) return;

    // For ProductivityQuest tasks, update the task color in the database
    if (selectedEvent.source === 'productivityquest') {
      const taskId = selectedEvent.id.replace('task-', '');

      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ calendarColor: color }),
        });

        if (response.ok) {
          toast({
            title: "Color Updated",
            description: "Event color changed successfully",
          });

          // Update local state
          setSelectedEvent({ ...selectedEvent, calendarColor: color });

          // Refresh calendar data
          queryClient.invalidateQueries({ 
            queryKey: [`/api/google-calendar/events?year=${currentDate.getFullYear()}&month=${currentDate.getMonth()}`] 
          });
          queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });

          setShowColorPicker(false);
        } else {
          throw new Error('Failed to update color');
        }
      } catch (error) {
        console.error('Failed to update color:', error);
        toast({
          title: "Error",
          description: "Failed to update event color. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      // For Google Calendar events, just update the local state (display only)
      // The color change won't persist to Google Calendar, but will show in ProductivityQuest
      toast({
        title: "Color Updated",
        description: "Display color changed (local only, not synced to Google Calendar)",
      });

      setSelectedEvent({ ...selectedEvent, calendarColor: color });
      setShowColorPicker(false);
    }
  };

  // Helper function to get hex color from importance
  const getColorHexFromImportance = (importance: string | null | undefined): string => {
    switch (importance) {
      case 'Pareto':
      case 'High':
        return '#ef4444'; // Red
      case 'Med-High':
        return '#f97316'; // Orange
      case 'Medium':
        return '#eab308'; // Yellow
      case 'Med-Low':
        return '#3b82f6'; // Blue
      case 'Low':
        return '#22c55e'; // Green
      default:
        return '#9333ea'; // Purple (default)
    }
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
    } else if (event.importance === 'Med-High') {
      return { className: 'bg-orange-500/20 text-orange-300 border-orange-500/30' };
    } else if (event.importance === 'Medium') {
      return { className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' };
    } else if (event.importance === 'Med-Low') {
      return { className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    } else if (event.importance === 'Low') {
      return { className: 'bg-green-500/20 text-green-300 border-green-500/30' };
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

  const isTwoWaySync = settings?.googleCalendarSyncDirection === 'both';

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

  // Detect overlapping events and calculate their layout columns
  const getEventLayout = (events: CalendarEvent[]) => {
    const layout: Map<string, { column: number; totalColumns: number }> = new Map();
    
    // Sort events by start time, then by duration (longer first)
    const sortedEvents = [...events].sort((a, b) => {
      const aStart = new Date(getEventDisplayTime(a).start).getTime();
      const bStart = new Date(getEventDisplayTime(b).start).getTime();
      if (aStart !== bStart) return aStart - bStart;
      
      // If same start time, longer events first
      const aDuration = new Date(getEventDisplayTime(a).end).getTime() - aStart;
      const bDuration = new Date(getEventDisplayTime(b).end).getTime() - bStart;
      return bDuration - aDuration;
    });
    
    // Track which columns are occupied at which time ranges
    const columns: Array<{ start: number; end: number; eventId: string }[]> = [];
    
    sortedEvents.forEach(event => {
      const displayTime = getEventDisplayTime(event);
      const eventStart = new Date(displayTime.start).getTime();
      const eventEnd = new Date(displayTime.end).getTime();
      
      // Find the first available column
      let columnIndex = 0;
      while (true) {
        if (!columns[columnIndex]) {
          columns[columnIndex] = [];
        }
        
        // Check if this column has any overlapping events
        const hasOverlap = columns[columnIndex].some(occupiedEvent => {
          return !(eventEnd <= occupiedEvent.start || eventStart >= occupiedEvent.end);
        });
        
        if (!hasOverlap) {
          // This column is free, use it
          columns[columnIndex].push({ start: eventStart, end: eventEnd, eventId: event.id });
          break;
        }
        
        columnIndex++;
      }
      
      // Find all events that overlap with this one to determine total columns
      let maxColumn = columnIndex;
      sortedEvents.forEach(otherEvent => {
        const otherTime = getEventDisplayTime(otherEvent);
        const otherStart = new Date(otherTime.start).getTime();
        const otherEnd = new Date(otherTime.end).getTime();
        
        // Check if events overlap
        if (!(eventEnd <= otherStart || eventStart >= otherEnd)) {
          const otherLayout = layout.get(otherEvent.id);
          if (otherLayout && otherLayout.column > maxColumn) {
            maxColumn = otherLayout.column;
          }
        }
      });
      
      layout.set(event.id, { column: columnIndex, totalColumns: maxColumn + 1 });
    });
    
    // Update all overlapping events to have the same totalColumns
    layout.forEach((value, eventId) => {
      const event = sortedEvents.find(e => e.id === eventId);
      if (!event) return;
      
      const displayTime = getEventDisplayTime(event);
      const eventStart = new Date(displayTime.start).getTime();
      const eventEnd = new Date(displayTime.end).getTime();
      
      let maxColumns = value.totalColumns;
      layout.forEach((otherValue, otherEventId) => {
        if (eventId === otherEventId) return;
        
        const otherEvent = sortedEvents.find(e => e.id === otherEventId);
        if (!otherEvent) return;
        
        const otherTime = getEventDisplayTime(otherEvent);
        const otherStart = new Date(otherTime.start).getTime();
        const otherEnd = new Date(otherTime.end).getTime();
        
        // Check if events overlap
        if (!(eventEnd <= otherStart || eventStart >= otherEnd)) {
          maxColumns = Math.max(maxColumns, otherValue.totalColumns);
        }
      });
      
      value.totalColumns = maxColumns;
    });
    
    return layout;
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
    calendarDays.push(<div key={`empty-${i}`} className={`${isMobile ? 'min-h-12 p-0.5' : 'min-h-24 p-2'} bg-gray-900/20`} />);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEvents = getEventsForDay(day);
    
    calendarDays.push(
      <div
        key={day}
        className={`${isMobile ? 'min-h-12 p-0.5' : 'min-h-24 p-2'} border border-purple-500/20 bg-gray-900/40 hover:bg-gray-800/60 transition-colors cursor-pointer overflow-hidden ${
          isToday(day) ? 'ring-2 ring-yellow-400/50 bg-yellow-400/10' : ''
        }`}
      >
        <div className={`${isMobile ? 'text-[10px]' : 'text-sm'} font-medium mb-1 ${
          isToday(day) ? 'text-yellow-400' : 'text-purple-300'
        }`}>
          {day}
        </div>
        {/* Display events for this day */}
        <div className="space-y-0.5">
          {dayEvents.slice(0, isMobile ? 1 : 3).map(event => {
            const eventStyle = getEventStyle(event);
            return (
              <div
                key={event.id}
                className={`${isMobile ? 'text-[8px] p-0.5' : 'text-xs p-1'} rounded truncate border cursor-pointer hover:opacity-80 overflow-hidden leading-tight ${eventStyle.className || ''}`}
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
                <span className="flex items-center gap-0.5">
                  {event.completed && <CheckCircle2 className={`${isMobile ? 'w-2 h-2' : 'w-2.5 h-2.5'} text-green-400 flex-shrink-0`} />}
                  <span className={event.completed ? 'line-through opacity-60' : ''}>{event.title}</span>
                </span>
              </div>
            );
          })}
          {dayEvents.length > (isMobile ? 1 : 3) && (
            <div className={`${isMobile ? 'text-[8px]' : 'text-xs'} text-gray-500`}>
              +{dayEvents.length - (isMobile ? 1 : 3)}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!googleConnected) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 ${isMobile ? 'pt-1 pb-20 px-2' : 'pt-24 pb-8 px-8'}`}>
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
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 ${isMobile ? 'pt-1 pb-20 px-1' : 'pt-24 pb-8 px-8'}`}>
      <div className={`${isMobile ? 'max-w-full' : 'max-w-7xl'} mx-auto ${isMobile ? 'h-[calc(100vh-84px)]' : ''}`}>
        {/* Calendar Card */}
        <Card className={`${isMobile ? 'p-2 h-full flex flex-col' : 'p-6'} bg-gray-900/60 border-purple-500/20`}>
          {/* View Selector and Month Navigation */}
          <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center justify-between'} ${isMobile ? 'mb-2' : 'mb-6'} flex-shrink-0`}>
            <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center gap-4'}`}>
              {/* Settings and New Event buttons */}
              <div className="flex gap-2">
                <Link href="/settings/google-calendar">
                  <Button variant="outline" size={isMobile ? "sm" : "default"} className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10">
                    <Settings className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} ${isMobile ? '' : 'mr-2'}`} />
                    {!isMobile && 'Settings'}
                  </Button>
                </Link>
                <Button size={isMobile ? "sm" : "default"} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500">
                  <Plus className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} ${isMobile ? '' : 'mr-2'}`} />
                  {!isMobile && 'New Event'}
                </Button>
                {/* ML Smart Sort Button - Only show in day view */}
                {view === 'day' && (
                  <Button 
                    size={isMobile ? "sm" : "default"} 
                    onClick={handleMLSort}
                    disabled={isSorting}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white"
                    title="AI-powered smart sorting for your day"
                  >
                    <Sparkles className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} ${isMobile ? '' : 'mr-2'} ${isSorting ? 'animate-spin' : ''}`} />
                    {!isMobile && (isSorting ? 'Sorting...' : 'Sort')}
                  </Button>
                )}
              </div>

              {/* Multi-select toolbar - shows when events are selected */}
              {selectedEventIds.size > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 border border-purple-500/40 rounded-lg">
                  <span className="text-sm text-purple-300">
                    {selectedEventIds.size} selected
                  </span>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDeleteSelectedEvents}
                    className="h-7 px-2 text-xs"
                    title="Remove from calendar (quests will remain in Quests page)"
                  >
                    <CalendarMinus className="w-3 h-3 mr-1" />
                    Remove from Calendar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedEventIds(new Set())}
                    className="h-7 px-2 text-xs text-gray-400 hover:text-white"
                  >
                    Clear
                  </Button>
                </div>
              )}

              <h2 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-white`}>
                {monthNames[month]} {year}
              </h2>
              
              {/* View Selector */}
              <div className={`flex gap-1 bg-gray-800/60 p-1 rounded-lg border border-purple-500/20 ${isMobile ? 'w-full' : ''}`}>
                <button
                  onClick={() => setView('day')}
                  className={`${isMobile ? 'flex-1 px-2 py-1.5 text-xs' : 'px-4 py-1.5'} rounded text-sm font-medium transition-colors ${
                    view === 'day' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setView('3day')}
                  className={`${isMobile ? 'flex-1 px-2 py-1.5 text-xs' : 'px-4 py-1.5'} rounded text-sm font-medium transition-colors ${
                    view === '3day' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  3 Days
                </button>
                <button
                  onClick={() => setView('week')}
                  className={`${isMobile ? 'flex-1 px-2 py-1.5 text-xs' : 'px-4 py-1.5'} rounded text-sm font-medium transition-colors ${
                    view === 'week' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setView('month')}
                  className={`${isMobile ? 'flex-1 px-2 py-1.5 text-xs' : 'px-4 py-1.5'} rounded text-sm font-medium transition-colors ${
                    view === 'month' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  Month
                </button>
              </div>
            </div>
            
            <div className={`flex gap-2 ${isMobile ? 'w-full' : ''}`}>
              <Button
                onClick={previousMonth}
                variant="outline"
                className={`border-purple-500/30 text-purple-300 hover:bg-purple-500/10 ${isMobile ? 'flex-1 text-xs h-8' : ''}`}
              >
                {isMobile ? '←' : '← Previous'}
              </Button>
              <Button
                onClick={() => setCurrentDate(new Date())}
                variant="outline"
                className={`border-purple-500/30 text-purple-300 hover:bg-purple-500/10 ${isMobile ? 'flex-1 text-xs h-8' : ''}`}
              >
                Today
              </Button>
              <Button
                onClick={nextMonth}
                variant="outline"
                className={`border-purple-500/30 text-purple-300 hover:bg-purple-500/10 ${isMobile ? 'flex-1 text-xs h-8' : ''}`}
              >
                {isMobile ? '→' : 'Next →'}
              </Button>
            </div>
          </div>

          {/* Day Headers - Only show for month view */}
          {view === 'month' && (
            <div className="grid grid-cols-7 gap-px mb-px">
              {dayNames.map(day => (
                <div
                  key={day}
                  className={`${isMobile ? 'p-1.5 text-xs' : 'p-3'} text-center font-semibold text-purple-300 bg-gray-800/60`}
                >
                  {isMobile ? day.slice(0, 3) : day}
                </div>
              ))}
            </div>
          )}

          {/* Calendar Grid - Month View */}
          {view === 'month' && (
            <div className={`grid grid-cols-7 gap-px bg-purple-500/20 ${isMobile ? 'flex-1 min-h-0 overflow-auto' : ''}`}>
              {calendarDays}
            </div>
          )}

          {/* Day View */}
          {view === 'day' && (
            <div 
              ref={dayViewRef} 
              className={`overflow-auto ${isMobile ? 'flex-1 min-h-0' : 'max-h-[calc(100vh-280px)]'}`}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div className={isMobile ? 'min-w-full' : 'min-w-[600px]'}>
                {/* Day Header */}
                <div className={`grid ${isMobile ? 'grid-cols-[60px_1fr]' : 'grid-cols-[80px_1fr]'} gap-px bg-purple-500/20 sticky top-0 z-10`}>
                  <div className="bg-gray-800/60 p-3"></div>
                  <div className={`bg-gray-800/60 ${isMobile ? 'p-2' : 'p-3'} text-center`}>
                    <div className={`font-semibold text-purple-300 ${isMobile ? 'text-xs' : ''}`}>
                      {currentDate.toLocaleDateString('en-US', { weekday: isMobile ? 'short' : 'long' })}
                    </div>
                    <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white`}>
                      {currentDate.getDate()}
                    </div>
                    <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-400`}>
                      {currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                {/* Time Slots */}
                <div className={`grid ${isMobile ? 'grid-cols-[60px_1fr]' : 'grid-cols-[80px_1fr]'} gap-px bg-purple-500/20`}>
                  <div className="bg-gray-900/20">
                    {/* Time labels column */}
                    {timeSlots.map(({ hour, label }) => (
                      <div key={hour} className={`${isMobile ? 'p-1 text-[10px] pr-2' : 'p-2 text-xs pr-3'} text-gray-500 text-right h-[60px] border-b border-purple-500/10`}>
                        {label}
                      </div>
                    ))}
                  </div>
                  <div 
                    ref={calendarContainerRef}
                    className="bg-gray-900/20 relative select-none" 
                    style={{ height: '1440px' }}
                    onMouseDown={handleSelectionStart}
                    onMouseMove={(e) => {
                      handleMouseMove(e as any);
                      handleSelectionMove(e);
                    }}
                    onMouseUp={() => {
                      handleMouseUp();
                      handleSelectionEnd();
                    }}
                    onMouseLeave={() => {
                      handleMouseUp();
                      handleSelectionEnd();
                    }}
                  > {/* 24 hours * 60px */}
                    {/* Hour grid lines */}
                    {timeSlots.map(({ hour }) => (
                      <div 
                        key={hour}
                        className="absolute left-0 right-0 h-[60px] border-b border-purple-500/10"
                        style={{ top: `${hour * 60}px` }}
                      />
                    ))}
                    
                    {/* Selection Box */}
                    {isSelecting && selectionBox && (
                      <div
                        className="absolute bg-purple-500/20 border-2 border-purple-400 rounded pointer-events-none z-30"
                        style={{
                          left: Math.min(selectionBox.startX, selectionBox.currentX),
                          top: Math.min(selectionBox.startY, selectionBox.currentY),
                          width: Math.abs(selectionBox.currentX - selectionBox.startX),
                          height: Math.abs(selectionBox.currentY - selectionBox.startY),
                        }}
                      />
                    )}
                    
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
                    {(() => {
                      const dayEvents = getEventsForDate(currentDate);
                      const eventLayout = getEventLayout(dayEvents);
                      
                      return dayEvents.map((event, idx) => {
                        const eventStyle = getEventStyle(event);
                        const displayTime = getEventDisplayTime(event);
                        const position = getEventPosition(event);
                        const layout = eventLayout.get(event.id) || { column: 0, totalColumns: 1 };
                        const isDragging = draggingEvent?.id === event.id;
                        const isResizing = resizingEvent?.id === event.id;
                        const isDraggable = event.source === 'productivityquest';
                        const isSelected = selectedEventIds.has(event.id);
                        
                        // Calculate left and width based on column layout
                        const columnWidth = 100 / layout.totalColumns;
                        const leftPercent = layout.column * columnWidth;
                        const widthPercent = columnWidth;
                        
                        return (
                          <div
                            key={idx}
                            data-event-id={event.id}
                            className={`absolute rounded border group ${
                              isDraggable ? 'cursor-move' : 'cursor-pointer'
                            } ${isDragging || isResizing ? 'opacity-50' : 'hover:opacity-80'} ${eventStyle.className || ''} ${
                              isSelected ? 'ring-2 ring-purple-400 ring-offset-1 ring-offset-gray-900' : ''
                            }`}
                            style={{ 
                              top: `${position.top}px`,
                              left: `calc(0.5rem + ${leftPercent}%)`,
                              maxWidth: `calc(${widthPercent}% - ${layout.totalColumns > 1 ? '0.25rem' : '1rem'})`,
                              width: 'fit-content',
                              minWidth: position.height < 25 ? '60px' : '80px',
                              height: `${position.height}px`,
                              backgroundColor: eventStyle.backgroundColor,
                              borderColor: isSelected ? '#a855f7' : eventStyle.borderColor,
                              color: eventStyle.color,
                              zIndex: isSelected ? 15 : 10,
                              padding: position.height < 25 ? '2px 8px' : position.height < 40 ? '4px 10px' : '8px 14px',
                              overflow: 'hidden',
                            }}
                            onMouseDown={(e) => {
                              // If clicking with Ctrl/Cmd, toggle selection instead of dragging
                              if (e.metaKey || e.ctrlKey) {
                                e.stopPropagation();
                                setSelectedEventIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(event.id)) {
                                    next.delete(event.id);
                                  } else {
                                    next.add(event.id);
                                  }
                                  return next;
                                });
                                return;
                              }
                              if (isDraggable) handleEventMouseDown(event, e);
                            }}
                            onClick={() => !hasDragged && !hasResized && setSelectedEvent(event)}
                          >
                            {/* Selection indicator */}
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold z-20">
                                ✓
                              </div>
                            )}
                            
                            {/* Top resize handle */}
                            {isDraggable && position.height > 20 && (
                              <div
                                className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-white/30 rounded-t"
                                onMouseDown={(e) => handleEventMouseDown(event, e, 'top')}
                              />
                            )}
                            
                            <div className={`font-medium truncate ${position.height < 25 ? 'text-[9px]' : position.height < 40 ? 'text-[10px]' : 'text-xs'} flex items-center gap-1`}>
                              {event.completed && <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />}
                              <span className={event.completed ? 'line-through opacity-60' : ''}>{event.title}</span>
                            </div>
                            {position.height > 35 && (
                              <div className="text-[10px] opacity-70 truncate">
                                {displayTime.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                {position.height > 45 && (
                                  <>
                                    {' - '}
                                    {displayTime.end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                  </>
                                )}
                              </div>
                            )}
                            {position.height > 60 && event.description && (
                              <div className="opacity-80 truncate mt-1 text-[10px]">
                                {event.description}
                              </div>
                            )}
                            
                            {/* Bottom resize handle */}
                            {isDraggable && position.height > 20 && (
                              <div
                                className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-white/30 rounded-b"
                                onMouseDown={(e) => handleEventMouseDown(event, e, 'bottom')}
                              />
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3-Day View */}
          {view === '3day' && (
            <div 
              ref={threeDayViewRef} 
              className={`overflow-y-auto overflow-x-hidden ${isMobile ? 'flex-1 min-h-0' : 'max-h-[calc(100vh-280px)]'}`}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div className="w-full">
                {/* Day Headers */}
                <div className={`grid gap-px bg-purple-500/20 sticky top-0 z-10`} style={{ gridTemplateColumns: isMobile ? '40px repeat(3, 1fr)' : '60px repeat(3, 1fr)' }}>
                  <div className="bg-gray-800/60 p-2"></div>
                  {get3DayDates().map((date, idx) => (
                    <div key={idx} className={`bg-gray-800/60 ${isMobile ? 'p-1' : 'p-2'} text-center`}>
                      <div className={`font-semibold text-purple-300 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold text-white`}>
                        {date.getDate()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Time Slots */}
                <div className="grid gap-px bg-purple-500/20" style={{ gridTemplateColumns: isMobile ? '40px repeat(3, 1fr)' : '60px repeat(3, 1fr)' }}>
                  {timeSlots.map(({ hour, label }) => {
                    const now = new Date();
                    const currentHour = now.getHours();
                    const currentMinute = now.getMinutes();
                    const timeIndicatorPosition = (currentMinute / 60) * 100;
                    
                    return (
                      <React.Fragment key={hour}>
                        <div className={`bg-gray-900/20 ${isMobile ? 'p-0.5 text-[9px] pr-0.5' : 'p-2 text-xs pr-2'} text-gray-500 text-right`}>
                          {isMobile ? label.replace(' ', '').slice(0, -1) : label}
                        </div>
                        {get3DayDates().map((date, idx) => {
                          const hourEvents = getEventsForHour(date, hour);
                          const isToday = date.toDateString() === now.toDateString();
                          const showTimeIndicator = isToday && hour === currentHour;
                          
                          return (
                            <div key={idx} className={`bg-gray-900/20 ${isMobile ? 'p-0.5' : 'p-2'} min-h-[60px] relative overflow-hidden`} style={{ minWidth: 0 }}>
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
                                    className={`${isMobile ? 'p-1 mb-0.5 text-[10px]' : 'p-1.5 mb-1 text-xs'} rounded border relative group overflow-hidden w-full max-w-full ${
                                      isDraggable ? 'cursor-move' : 'cursor-pointer'
                                    } ${isDragging || isResizing ? 'opacity-50' : 'hover:opacity-80'} ${eventStyle.className || ''}`}
                                    style={eventStyle.backgroundColor ? { 
                                      backgroundColor: eventStyle.backgroundColor,
                                      borderColor: eventStyle.borderColor,
                                      color: eventStyle.color
                                    } : undefined}
                                    onMouseDown={(e) => isDraggable ? handleEventMouseDown(event, e) : undefined}
                                    onClick={() => !hasDragged && !hasResized && setSelectedEvent(event)}
                                  >
                                    {/* Top resize handle */}
                                    {isDraggable && !isMobile && (
                                      <div
                                        className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-white/30"
                                        onMouseDown={(e) => handleEventMouseDown(event, e, 'top')}
                                      />
                                    )}
                                    
                                    <div className="font-medium truncate leading-tight flex items-center gap-1">
                                      {event.completed && <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />}
                                      <span className={event.completed ? 'line-through opacity-60' : ''}>{event.title}</span>
                                    </div>
                                    {!isMobile && (
                                      <div className="text-[9px] opacity-70 truncate leading-tight">
                                        {displayTime.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                      </div>
                                    )}
                                    
                                    {/* Bottom resize handle */}
                                    {isDraggable && !isMobile && (
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
              className={`overflow-auto ${isMobile ? 'flex-1 min-h-0' : 'max-h-[calc(100vh-280px)]'}`}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div className={isMobile ? 'min-w-full overflow-x-auto' : 'min-w-[1200px]'}>
                {/* Day Headers */}
                <div className="grid gap-px bg-purple-500/20 sticky top-0 z-10" style={{ gridTemplateColumns: isMobile ? '40px repeat(7, minmax(60px, 1fr))' : '80px repeat(7, 1fr)' }}>
                  <div className="bg-gray-800/60 p-3"></div>
                  {getWeekDates().map((date, idx) => {
                    const isCurrentDay = date.toDateString() === today.toDateString();
                    return (
                      <div key={idx} className={`bg-gray-800/60 ${isMobile ? 'p-1' : 'p-3'} text-center ${isCurrentDay ? 'border-2 border-purple-500' : ''}`}>
                        <div className={`font-semibold text-purple-300 ${isMobile ? 'text-[10px]' : ''}`}>
                          {isMobile ? date.toLocaleDateString('en-US', { weekday: 'narrow' }) : date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className={`${isMobile ? 'text-sm' : 'text-xl'} font-bold ${isCurrentDay ? 'text-purple-400' : 'text-white'}`}>
                          {date.getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Time Slots */}
                <div className="grid gap-px bg-purple-500/20" style={{ gridTemplateColumns: isMobile ? '40px repeat(7, minmax(60px, 1fr))' : '80px repeat(7, 1fr)' }}>
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
                            <div key={idx} className="bg-gray-900/20 p-1 min-h-[50px] relative overflow-hidden" style={{ minWidth: 0 }}>
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
                                    className={`p-1 mb-1 rounded text-xs border relative group overflow-hidden w-full max-w-full ${
                                      isDraggable ? 'cursor-move' : 'cursor-pointer'
                                    } ${isDragging || isResizing ? 'opacity-50' : 'hover:opacity-80'} ${eventStyle.className || ''}`}
                                    style={eventStyle.backgroundColor ? { 
                                      backgroundColor: eventStyle.backgroundColor,
                                      borderColor: eventStyle.borderColor,
                                      color: eventStyle.color
                                    } : undefined}
                                    onMouseDown={(e) => isDraggable ? handleEventMouseDown(event, e) : undefined}
                                    onClick={() => !hasDragged && !hasResized && setSelectedEvent(event)}
                                  >
                                    {/* Top resize handle */}
                                    {isDraggable && (
                                      <div
                                        className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-white/30"
                                        onMouseDown={(e) => handleEventMouseDown(event, e, 'top')}
                                      />
                                    )}
                                    
                                    <div className="font-medium truncate text-[10px] leading-tight flex items-center gap-0.5">
                                      {event.completed && <CheckCircle2 className="w-2.5 h-2.5 text-green-400 flex-shrink-0" />}
                                      <span className={event.completed ? 'line-through opacity-60' : ''}>{event.title}</span>
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
            className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-12 overflow-y-auto"
            onClick={() => {
              setSelectedEvent(null);
              setShowColorPicker(false);
            }}
          >
            <Card 
              className="bg-gray-900/95 border-purple-500/30 max-w-lg w-full relative mb-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with colored accent */}
              <div 
                className="h-2 rounded-t-lg"
                style={{ 
                  backgroundColor: selectedEvent.calendarColor || getColorHexFromImportance(selectedEvent.importance)
                }}
              />
              
              {/* Color Picker Button - Available for all events */}
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="w-8 h-8 rounded-full border-2 border-white/20 hover:border-white/40 transition-colors shadow-lg"
                  style={{ backgroundColor: selectedEvent.calendarColor || getColorHexFromImportance(selectedEvent.importance) }}
                  title="Change color"
                />
                
                {/* Color Picker Dropdown */}
                {showColorPicker && (
                  <div 
                    className="absolute top-10 right-0 bg-gray-800/95 border border-purple-500/30 rounded-lg shadow-xl p-3 backdrop-blur-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="grid grid-cols-4 gap-2 w-40">
                      {calendarColors.map((color) => {
                        const currentColor = selectedEvent.calendarColor || getColorHexFromImportance(selectedEvent.importance);
                        return (
                          <button
                            key={color.value}
                            onClick={() => handleColorChange(color.value)}
                            className="w-8 h-8 rounded-full border-2 hover:border-white/60 transition-all hover:scale-110"
                            style={{ 
                              backgroundColor: color.value,
                              borderColor: currentColor === color.value ? '#fff' : 'transparent'
                            }}
                            title={color.name}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-6">
                {/* Title */}
                <h3 className="text-2xl font-bold text-white mb-4 pr-8">
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
                    <div className="text-gray-300 whitespace-pre-wrap max-h-96 overflow-y-auto">
                      {selectedEvent.description.length > 1000 ? (
                        <>
                          {selectedEvent.description.substring(0, 1000)}
                          <span className="text-gray-500">... (truncated)</span>
                          <p className="text-xs text-blue-400 mt-2 italic">
                            Click "View Details" below to see the full description
                          </p>
                        </>
                      ) : (
                        selectedEvent.description
                      )}
                    </div>
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

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  {/* First row - Main actions */}
                  <div className="flex gap-2 flex-wrap">
                    {/* Complete Quest Button - For ProductivityQuest events that aren't already completed */}
                    {selectedEvent.source === 'productivityquest' && !selectedEvent.completed && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-green-500/30 hover:bg-green-500/10 text-green-400 text-xs"
                        onClick={handleCompleteTask}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Complete Quest
                      </Button>
                    )}

                    {/* Reschedule Button - For all events */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-blue-500/30 hover:bg-blue-500/10 text-xs"
                      onClick={handleReschedule}
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      Reschedule
                    </Button>
                    
                    {/* Remove from Calendar Button - For ProductivityQuest events only */}
                    {selectedEvent.source === 'productivityquest' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-orange-500/30 hover:bg-orange-500/10 text-orange-400 text-xs"
                        onClick={() => handleRemoveFromCalendar(isTwoWaySync)}
                      >
                        <CalendarX2 className="w-3 h-3 mr-1" />
                        Remove from Calendar
                      </Button>
                    )}
                    
                    {/* Delete Button - For ProductivityQuest events only (permanently deletes quest) */}
                    {selectedEvent.source === 'productivityquest' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500/30 hover:bg-red-500/10 text-red-400 text-xs"
                        onClick={() => {
                          setShowDeleteMenu(!showDeleteMenu);
                          setShowColorPicker(false);
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete Quest
                      </Button>
                    )}
                    
                    {/* Delete Button - For Google Calendar events */}
                    {selectedEvent.source === 'google' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500/30 hover:bg-red-500/10 text-red-400 text-xs"
                        onClick={() => {
                          // Open in Google Calendar for deletion
                          const googleCalendarUrl = `https://calendar.google.com/calendar/r/eventedit/${selectedEvent.id.replace('google-', '')}`;
                          window.open(googleCalendarUrl, '_blank');
                          toast({
                            title: "Delete in Google Calendar",
                            description: "Please delete this event in Google Calendar. It will sync automatically.",
                          });
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    )}

                    {selectedEvent.source === 'google' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-purple-500/30 text-xs"
                        onClick={() => {
                          // Open in Google Calendar
                          const googleCalendarUrl = `https://calendar.google.com/calendar/r/eventedit/${selectedEvent.id.replace('google-', '')}`;
                          window.open(googleCalendarUrl, '_blank');
                        }}
                      >
                        Open in Google
                      </Button>
                    )}
                    {selectedEvent.source === 'productivityquest' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-purple-500/30 text-xs"
                        onClick={() => {
                          window.location.href = '/';
                        }}
                      >
                        View Details
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedEvent(null);
                        setShowDeleteMenu(false);
                        setShowRescheduleModal(false);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-xs ml-auto"
                    >
                      Close
                    </Button>
                  </div>
                </div>

                {/* Delete Options Menu */}
                {showDeleteMenu && (
                  <div className="mt-4 p-3 bg-gray-800/50 border border-red-500/30 rounded-lg space-y-2">
                    <p className="text-xs text-gray-400 mb-2">Choose delete option:</p>
                    
                    {/* Show different options based on event source */}
                    {selectedEvent.source === 'google' ? (
                      // For Google Calendar events - show both options
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`w-full justify-start text-xs ${
                            !isTwoWaySync 
                              ? 'opacity-50 cursor-not-allowed border-gray-600' 
                              : 'border-red-500/30 hover:bg-red-500/10'
                          }`}
                          disabled={!isTwoWaySync}
                          onClick={() => {
                            if (isTwoWaySync) {
                              // Delete from Google Calendar
                              const googleCalendarUrl = `https://calendar.google.com/calendar/r/eventedit/${selectedEvent.id.replace('google-', '')}`;
                              window.open(googleCalendarUrl, '_blank');
                              toast({
                                title: "Delete in Google Calendar",
                                description: "Please delete this event in Google Calendar. It will sync automatically.",
                              });
                              setSelectedEvent(null);
                              setShowDeleteMenu(false);
                            }
                          }}
                        >
                          <Trash2 className="w-3 h-3 mr-2 shrink-0" />
                          <div className="text-left flex-1">
                            <div className="text-xs font-medium">Delete from Google Calendar</div>
                            {!isTwoWaySync ? (
                              <div className="text-[10px] text-gray-500 mt-0.5">
                                Enable Two-Way Sync to use this
                              </div>
                            ) : (
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                Opens Google Calendar to delete
                              </div>
                            )}
                          </div>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start border-orange-500/30 hover:bg-orange-500/10 text-xs"
                          onClick={() => handleRemoveFromCalendar(false)}
                        >
                          <Trash2 className="w-3 h-3 mr-2 shrink-0" />
                          <div className="text-left flex-1">
                            <div className="text-xs font-medium">Remove from App Only</div>
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              Keeps in Google Calendar
                            </div>
                          </div>
                        </Button>

                        <div className="text-[10px] text-gray-500 mt-1 p-1.5 bg-gray-800/30 rounded">
                          Google Calendar event - choose where to delete
                        </div>
                      </>
                    ) : (
                      // For ProductivityQuest events - Delete Quest permanently
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start border-red-500/30 hover:bg-red-500/10 text-xs text-red-400"
                          onClick={async () => {
                            // Delete the task permanently
                            const taskId = selectedEvent.id;
                            try {
                              const response = await fetch(`/api/tasks/${taskId}`, {
                                method: 'DELETE',
                                credentials: 'include',
                              });
                              
                              if (response.ok) {
                                toast({
                                  title: "Quest Deleted",
                                  description: "The quest has been permanently deleted.",
                                  variant: "destructive",
                                });
                                
                                // Refresh data
                                queryClient.invalidateQueries({ queryKey: ['/api/google-calendar/events'] });
                                queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
                                
                                // Close modals
                                setSelectedEvent(null);
                                setShowDeleteMenu(false);
                              } else {
                                throw new Error('Failed to delete quest');
                              }
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: "Failed to delete quest. Please try again.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Trash2 className="w-3 h-3 mr-2 shrink-0" />
                          <div className="text-left flex-1">
                            <div className="text-xs font-medium">Delete Quest Permanently</div>
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              Removes quest from everywhere
                            </div>
                          </div>
                        </Button>

                        <div className="text-[10px] text-red-400/80 mt-1 p-1.5 bg-red-900/20 rounded border border-red-500/20">
                          ⚠️ This will permanently delete the quest. Use "Remove from Calendar" to keep the quest.
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Reschedule Modal */}
        {showRescheduleModal && selectedEvent && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowRescheduleModal(false)}
          >
            <Card 
              className="bg-gray-900/95 border-purple-500/30 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-4">
                  <Clock className="w-5 h-5 inline mr-2" />
                  Reschedule Event
                </h3>
                
                <p className="text-gray-300 mb-4">
                  {selectedEvent.title}
                </p>

                {selectedEvent.source === 'google' ? (
                  <>
                    <p className="text-sm text-gray-400 mb-6">
                      This is a Google Calendar event. You can drag it in the calendar view to reschedule, or use Google Calendar directly for more options.
                    </p>

                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        className="border-purple-500/30"
                        onClick={() => {
                          const googleCalendarUrl = `https://calendar.google.com/calendar/r/eventedit/${selectedEvent.id.replace('google-', '')}`;
                          window.open(googleCalendarUrl, '_blank');
                        }}
                      >
                        Open in Google Calendar
                      </Button>
                      <Button
                        onClick={() => setShowRescheduleModal(false)}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        Close
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-400 mb-6">
                      Drag the event in the calendar view to reschedule it, or click below to view the task details page for more options.
                    </p>

                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        className="border-purple-500/30"
                        onClick={() => {
                          window.location.href = '/';
                        }}
                      >
                        Go to Task Details
                      </Button>
                      <Button
                        onClick={() => setShowRescheduleModal(false)}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        Close
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ML Sort Feedback Modal */}
        {mlSortData && (
          <MLSortFeedbackModal
            isOpen={showMLFeedback}
            onClose={() => {
              setShowMLFeedback(false);
              setMLSortData(null);
            }}
            date={currentDate}
            originalSchedule={mlSortData.originalSchedule}
            sortedSchedule={mlSortData.sortedSchedule}
            taskMetadata={mlSortData.taskMetadata}
          />
        )}
      </div>
    </div>
  );
}
