import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CornerDownRight, CheckCircle2, Circle, Clock, Eye } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface QuestlineTask {
  id: number;
  title: string;
  description?: string | null;
  completed: boolean;
  recycled?: boolean | null;
  goldValue: number;
  duration?: number | null;
  importance?: string | null;
  indentLevel?: number | null;
  parentTaskId?: number | null;
  questlineOrder?: number | null;
  emoji?: string | null;
}

interface QuestlineData {
  id: number;
  title: string;
  description?: string | null;
  icon?: string | null;
  tasks: QuestlineTask[];
}

interface QuestlineTreeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questline: QuestlineData | null;
  focusTaskId: number | null;
  onViewTask?: (taskId: number) => void;
}

const depthColors: Record<number, { border: string; bg: string; text: string; badge: string }> = {
  0: { border: "border-purple-500/50", bg: "bg-purple-900/20", text: "text-purple-200", badge: "bg-purple-500/20 text-purple-300" },
  1: { border: "border-blue-500/40", bg: "bg-blue-900/15", text: "text-blue-200", badge: "bg-blue-500/20 text-blue-300" },
  2: { border: "border-cyan-500/30", bg: "bg-cyan-900/10", text: "text-cyan-200", badge: "bg-cyan-500/20 text-cyan-300" },
  3: { border: "border-teal-500/25", bg: "bg-teal-900/8", text: "text-teal-200", badge: "bg-teal-500/20 text-teal-300" },
  4: { border: "border-slate-500/25", bg: "bg-slate-800/10", text: "text-slate-300", badge: "bg-slate-500/20 text-slate-300" },
};

const depthLabels = ["Stage", "Quest", "Sub-quest", "Task", "Sub-task"];

function getDepthStyle(level: number) {
  return depthColors[Math.min(level, 4)];
}

function formatDuration(mins?: number | null) {
  if (!mins) return null;
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function QuestlineTreeModal({ open, onOpenChange, questline, focusTaskId, onViewTask }: QuestlineTreeModalProps) {
  const isMobile = useIsMobile();

  // ── Mobile bottom-sheet: slide-up entrance + swipe-down-to-close ──
  const [dragOffset, setDragOffset] = useState(0);
  const [isTouching, setIsTouching] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const contentElRef = useRef<HTMLDivElement | null>(null);
  const listenersAttachedRef = useRef(false);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const dragRef = useRef<{ startY: number; startScrollTop: number; dragging: boolean }>({
    startY: 0, startScrollTop: 0, dragging: false,
  });

  // Animate in from below the screen whenever the sheet opens on mobile
  useEffect(() => {
    if (!isMobile) return;
    if (open) {
      setDragOffset(typeof window !== "undefined" ? window.innerHeight : 800);
      const raf1 = requestAnimationFrame(() => {
        requestAnimationFrame(() => setDragOffset(0));
      });
      return () => cancelAnimationFrame(raf1);
    }
    setDragOffset(0);
  }, [open, isMobile]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    dragRef.current = {
      startY: e.touches[0].clientY,
      startScrollTop: listRef.current?.scrollTop ?? 0,
      dragging: false,
    };
    setIsTouching(true);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const s = dragRef.current;
    const deltaY = e.touches[0].clientY - s.startY;
    const currentScrollTop = listRef.current?.scrollTop ?? 0;
    // Only start dragging the sheet when the list is scrolled to the top and pulling down
    if (!s.dragging && s.startScrollTop <= 2 && currentScrollTop <= 2 && deltaY > 5) {
      s.dragging = true;
    }
    if (s.dragging && deltaY > 0) {
      setDragOffset(deltaY);
      e.preventDefault();
    } else if (s.dragging && deltaY <= 0) {
      setDragOffset(0);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    const s = dragRef.current;
    setIsTouching(false);
    if (!s.dragging) {
      setDragOffset(0);
      return;
    }
    setDragOffset((offset) => {
      const screenH = typeof window !== "undefined" ? window.innerHeight : 800;
      if (offset > 100 || offset > screenH * 0.25) {
        setTimeout(() => onOpenChangeRef.current(false), 200);
        return screenH;
      }
      return 0;
    });
    s.dragging = false;
  }, []);

  const swipeCallbackRef = useCallback((node: HTMLDivElement | null) => {
    if (contentElRef.current && listenersAttachedRef.current) {
      contentElRef.current.removeEventListener('touchstart', handleTouchStart as any);
      contentElRef.current.removeEventListener('touchmove', handleTouchMove as any);
      contentElRef.current.removeEventListener('touchend', handleTouchEnd as any);
      listenersAttachedRef.current = false;
    }
    contentElRef.current = node;
    if (node && isMobile) {
      node.addEventListener('touchstart', handleTouchStart as any, { passive: true });
      node.addEventListener('touchmove', handleTouchMove as any, { passive: false });
      node.addEventListener('touchend', handleTouchEnd as any, { passive: true });
      listenersAttachedRef.current = true;
    }
  }, [isMobile, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const mobileSheetStyle = isMobile
    ? {
        transform: dragOffset !== 0 ? `translateY(${dragOffset}px)` : undefined,
        transition: isTouching ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        willChange: 'transform',
      }
    : undefined;

  if (!questline) return null;

  // Sort tasks by questlineOrder
  const sorted = [...questline.tasks].sort((a, b) => (a.questlineOrder ?? 0) - (b.questlineOrder ?? 0));

  // Build ancestor set for focusTaskId (to highlight the path)
  const taskById = new Map(sorted.map((t) => [t.id, t]));
  const ancestorIds = new Set<number>();
  if (focusTaskId) {
    let cur = taskById.get(focusTaskId);
    while (cur?.parentTaskId) {
      ancestorIds.add(cur.parentTaskId);
      cur = taskById.get(cur.parentTaskId);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={swipeCallbackRef}
        style={mobileSheetStyle}
        className={`${isMobile ? "!top-auto !bottom-0 !left-0 !right-0 !translate-x-0 !translate-y-0 !mx-0 w-full max-w-full max-h-[88vh] rounded-t-2xl rounded-b-none !animate-none pb-[env(safe-area-inset-bottom)]" : "max-w-2xl max-h-[85vh]"} flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-purple-950 border-2 border-purple-500/40 text-yellow-100 overflow-hidden`}
      >
        {isMobile && (
          <div className="flex justify-center pt-1 pb-2 -mt-1 shrink-0">
            <div className="w-12 h-1.5 rounded-full bg-purple-300/40" />
          </div>
        )}
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl font-serif text-purple-200 flex items-center gap-2">
            <span>{questline.icon || "⚔️"}</span>
            <span>{questline.title}</span>
          </DialogTitle>
          {questline.description && (
            <p className="text-sm text-purple-300/60 mt-0.5">{questline.description}</p>
          )}
          <p className="text-xs text-purple-400/40 mt-1">
            {sorted.filter((t) => t.completed || t.recycled).length}/{sorted.length} completed
          </p>
        </DialogHeader>

        <div ref={listRef} className="flex-1 overflow-y-auto min-h-0 space-y-1.5 py-2 pr-1" style={{ WebkitOverflowScrolling: "touch" }}>
          {sorted.map((task) => {
            const indent = task.indentLevel ?? 0;
            const style = getDepthStyle(indent);
            const label = depthLabels[Math.min(indent, 4)];
            const done = task.completed || task.recycled;
            const isFocus = task.id === focusTaskId;
            const isAncestor = ancestorIds.has(task.id);

            return (
              <div
                key={task.id}
                id={isFocus ? "ql-tree-focus" : undefined}
                className={`
                  flex items-start gap-2 px-3 py-2 rounded-lg border transition-all
                  ${style.border} ${style.bg}
                  ${isFocus ? "ring-2 ring-purple-400 ring-offset-1 ring-offset-slate-900 shadow-lg shadow-purple-500/20" : ""}
                  ${isAncestor ? "opacity-90" : done ? "opacity-50" : "opacity-100"}
                `}
                style={{ marginLeft: `${indent * 18}px` }}
              >
                {/* Indent connector */}
                {indent > 0 && (
                  <CornerDownRight className="w-3 h-3 text-purple-400/30 shrink-0 mt-0.5" />
                )}

                {/* Completion icon */}
                <div className="shrink-0 mt-0.5">
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400/70" />
                  ) : (
                    <Circle className={`w-4 h-4 ${isFocus ? "text-purple-300" : "text-slate-500"}`} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${style.badge}`}>
                      {label}
                    </span>
                    {isFocus && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-400/30 text-purple-200 ring-1 ring-purple-400/50">
                        ← this task
                      </span>
                    )}
                  </div>
                  <p className={`text-sm mt-0.5 font-medium leading-tight ${done ? "line-through opacity-60" : style.text} ${isFocus ? "text-purple-100 font-semibold" : ""}`}>
                    {task.emoji && <span className="mr-1">{task.emoji}</span>}
                    {task.title}
                  </p>
                  {task.description && !isFocus && (
                    <p className="text-xs text-slate-400/60 mt-0.5 line-clamp-1">{task.description}</p>
                  )}
                  {task.description && isFocus && (
                    <p className="text-xs text-purple-300/70 mt-0.5">{task.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400/50">
                    {task.duration && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {formatDuration(task.duration)}
                      </span>
                    )}
                    <span>🪙 {task.goldValue}</span>
                    {task.importance && task.importance !== "Medium" && (
                      <span className="text-yellow-400/50">{task.importance}</span>
                    )}
                    {onViewTask && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onViewTask(task.id); }}
                        className="ml-auto flex items-center gap-1 text-[10px] text-purple-400/60 hover:text-purple-300 transition-colors px-1.5 py-0.5 rounded hover:bg-purple-500/10"
                        title="View full task"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
