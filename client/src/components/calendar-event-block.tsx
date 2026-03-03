/**
 * CalendarEventBlock — A shared component for rendering calendar events
 * across Day, 3-Day, and Week views.
 *
 * Handles:
 *   • Visual styling based on importance/color/completion
 *   • Drag & resize visual feedback (lift, pending, active drag)
 *   • Desktop mouse-down for drag/resize
 *   • Mobile touch-start for long-press-to-drag
 *   • Click/double-tap routing
 *   • Resize handles (top/bottom)
 *   • Compact rendering for small events
 */

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────

export type CalendarEvent = {
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

export interface EventBlockProps {
  event: CalendarEvent;
  /** Computed position (from getEventPosition) */
  position: { top: number; height: number };
  /** Column layout for overlapping events */
  layout: { column: number; totalColumns: number };
  /** Display times (may differ from event times if being dragged) */
  displayTime: { start: Date; end: Date };
  /** Whether this event is currently being dragged */
  isDragging: boolean;
  /** Whether this event is currently being resized */
  isResizing: boolean;
  /** Whether this event can be dragged/resized */
  isDraggable: boolean;
  /** Whether this event is multi-selected */
  isSelected: boolean;
  /** Whether this event shows the pending long-press hint */
  isPending: boolean;
  /** Are we on mobile? */
  isMobile: boolean;

  // ── Handlers ──

  /** Desktop: mousedown to start drag */
  onMouseDown: (event: CalendarEvent, e: React.MouseEvent, edge?: 'top' | 'bottom') => void;
  /** Mobile: touchstart to begin long-press detection */
  onTouchStart: (event: CalendarEvent, e: React.TouchEvent, edge?: 'top' | 'bottom') => void;
  /** Click handler (desktop = select, mobile = double-tap detection) */
  onClick: (event: CalendarEvent) => void;
  /** Ctrl/Cmd + click for multi-select (desktop) */
  onMetaClick?: (event: CalendarEvent) => void;

  // ── Optional: View-specific overrides ──

  /** 'absolute' for Day/3-Day positioned events, 'relative' for Week hour-cell events */
  positionMode?: 'absolute' | 'relative';
  /** Custom className additions */
  className?: string;
}

// ─── Style helper ─────────────────────────────────────────────────────────

export function getEventStyle(event: CalendarEvent) {
  if (event.calendarColor) {
    return {
      backgroundColor: event.calendarColor + '40',
      borderColor: event.calendarColor,
      color: '#fff',
      className: '',
    };
  }

  if (event.completed) {
    return { className: 'bg-gray-700/50 text-gray-400 line-through border-gray-600', backgroundColor: undefined, borderColor: undefined, color: undefined };
  }
  
  const map: Record<string, string> = {
    'Pareto': 'bg-red-500/20 text-red-300 border-red-500/30',
    'High': 'bg-red-500/20 text-red-300 border-red-500/30',
    'Med-High': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    'Medium': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    'Med-Low': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'Low': 'bg-green-500/20 text-green-300 border-green-500/30',
  };

  return {
    className: map[event.importance || ''] || 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    backgroundColor: undefined,
    borderColor: undefined,
    color: undefined,
  };
}

// ─── Component ────────────────────────────────────────────────────────────

export const CalendarEventBlock = React.memo(function CalendarEventBlock({
  event,
  position,
  layout,
  displayTime,
  isDragging,
  isResizing,
  isDraggable,
  isSelected,
  isPending,
  isMobile,
  onMouseDown,
  onTouchStart,
  onClick,
  onMetaClick,
  positionMode = 'absolute',
  className: extraClassName,
}: EventBlockProps) {
  const style = getEventStyle(event);
  const isActive = isDragging || isResizing;

  // ── Position/sizing ──
  const columnWidth = 100 / layout.totalColumns;
  const leftPercent = layout.column * columnWidth;
  const gapPx = layout.totalColumns > 1 ? 2 : 0;

  const isAbsolute = positionMode === 'absolute';

  const containerStyle: React.CSSProperties = isAbsolute
    ? {
        position: 'absolute',
        top: `${position.top}px`,
        left: layout.totalColumns > 1
          ? `calc(${leftPercent}% + ${layout.column > 0 ? gapPx : 0}px)`
          : '0.5rem',
        width: layout.totalColumns > 1
          ? `calc(${columnWidth}% - ${gapPx}px)`
          : 'calc(100% - 1rem)',
        height: `${position.height}px`,
        ...(style.backgroundColor ? { backgroundColor: style.backgroundColor, borderColor: style.borderColor, color: style.color } : {}),
        zIndex: isActive ? 30 : isSelected ? 15 : 10,
        padding: position.height < 25 ? '2px 8px' : position.height < 40 ? '4px 10px' : '8px 14px',
        overflow: 'hidden',
      }
    : {
        width: '100%',
        maxWidth: '100%',
        ...(style.backgroundColor ? { backgroundColor: style.backgroundColor, borderColor: style.borderColor, color: style.color } : {}),
        zIndex: isActive ? 30 : 10,
        overflow: 'hidden',
        padding: isMobile ? '2px 4px' : position.height < 25 ? '2px 6px' : '4px 8px',
      };

  if (isSelected && style.borderColor === undefined) {
    containerStyle.borderColor = '#a855f7';
  }

  // On mobile, draggable events need touch-action:none so iOS doesn't commit
  // to scrolling before our long-press timer fires. Also prevent context menu
  // and text selection which iOS triggers on long-press.
  if (isMobile && isDraggable) {
    containerStyle.touchAction = 'none';
    (containerStyle as any).WebkitTouchCallout = 'none';
    containerStyle.userSelect = 'none';
    (containerStyle as any).WebkitUserSelect = 'none';
  }

  // ── CSS classes ──
  const baseClass = [
    'rounded border group',
    // Transition for smooth visual feedback
    'transition-[transform,box-shadow,ring-color,opacity] duration-150 ease-out',
    isDraggable ? 'cursor-move' : 'cursor-pointer',
    // Active drag state: lifted appearance
    isActive
      ? 'opacity-90 scale-[1.03] shadow-xl shadow-purple-500/30 z-30 ring-2 ring-purple-400/60'
      : 'hover:brightness-110',
    // Multi-selected
    isSelected && !isActive ? 'ring-2 ring-purple-400 ring-offset-1 ring-offset-gray-900' : '',
    // Pending long-press hint
    isPending && !isActive ? 'scale-[1.01] ring-2 ring-yellow-400/50 shadow-md shadow-yellow-400/15' : '',
    // Base color class
    style.className || '',
    // Position mode
    isAbsolute ? '' : 'relative mb-1',
    // Extra
    extraClassName || '',
  ].filter(Boolean).join(' ');

  // ── Resize handle component ──
  const ResizeHandle = ({ edge }: { edge: 'top' | 'bottom' }) => {
    if (!isDraggable || position.height <= 20) return null;
    const isTop = edge === 'top';
    return (
      <div
        className={`absolute ${isTop ? 'top-0' : 'bottom-0'} left-0 right-0 ${
          isMobile ? 'h-3' : 'h-2'
        } cursor-ns-resize ${
          isMobile ? 'opacity-30' : 'opacity-0 group-hover:opacity-100'
        } bg-white/30 ${isTop ? 'rounded-t' : 'rounded-b'}`}
        onMouseDown={(e) => {
          if (isMobile) return; // Block synthesized mouse events on mobile
          e.stopPropagation();
          onMouseDown(event, e, edge);
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          onTouchStart(event, e, edge);
        }}
        onContextMenu={(e) => {
          if (isMobile && isDraggable) e.preventDefault();
        }}
      />
    );
  };

  return (
    <div
      data-event-id={event.id}
      data-draggable={isDraggable ? 'true' : undefined}
      className={baseClass}
      style={containerStyle}
      onMouseDown={(e) => {
        if (isMobile) return; // Block synthesized mouse events on mobile
        // Ctrl/Cmd + click = toggle multi-select
        if ((e.metaKey || e.ctrlKey) && onMetaClick) {
          e.stopPropagation();
          onMetaClick(event);
          return;
        }
        if (isDraggable) onMouseDown(event, e);
      }}
      onTouchStart={(e) => {
        if (isDraggable) onTouchStart(event, e);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(event);
      }}
      onContextMenu={(e) => {
        if (isMobile && isDraggable) e.preventDefault();
      }}
    >
      {/* Selection checkmark */}
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold z-20">
          ✓
        </div>
      )}

      {/* Top resize handle */}
      <ResizeHandle edge="top" />

      {/* Title */}
      <div className={`font-medium truncate flex items-center gap-1 ${
        position.height < 25 ? 'text-[9px]' : position.height < 40 ? 'text-[10px]' : 'text-xs'
      }`}>
        {event.completed && <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />}
        <span className={event.completed ? 'line-through opacity-60' : ''}>{event.title}</span>
      </div>

      {/* Time range (if enough height) */}
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

      {/* Description (if enough height) */}
      {position.height > 60 && event.description && (
        <div className="opacity-80 truncate mt-1 text-[10px]">
          {event.description}
        </div>
      )}

      {/* Bottom resize handle */}
      <ResizeHandle edge="bottom" />
    </div>
  );
});
