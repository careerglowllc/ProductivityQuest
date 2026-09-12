import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * iOS-style swipe-down-to-close gesture for a Radix Dialog on mobile.
 *
 * Attach `swipeCallbackRef` to a wrapper div placed directly inside the
 * scrollable `DialogContent` (its parent is walked up to find the scrollable
 * container, so the gesture only starts when that container is scrolled to
 * the top — matches native iOS sheet behavior). Spread `style` onto
 * `DialogContent` itself so it can translate/fade as the user drags.
 *
 * Native `addEventListener` with `{ passive: false }` is required — iOS
 * WebView (Capacitor) registers React's synthetic onTouchMove as passive,
 * which can't call preventDefault() to stop the page from scrolling mid-drag.
 */
export function useSwipeDownToClose(
  open: boolean,
  onOpenChange: (open: boolean) => void,
  enabled: boolean,
) {
  const gestureRef = useRef<{
    startY: number;
    lastY: number;
    lastTime: number;
    velocity: number;
    dragging: boolean;
    startScrollTop: number;
    scrollEl: HTMLElement | null;
  }>({ startY: 0, lastY: 0, lastTime: 0, velocity: 0, dragging: false, startScrollTop: 0, scrollEl: null });
  const [offsetY, setOffsetY] = useState(0);
  const offsetYRef = useRef(0);
  const [closing, setClosing] = useState(false);
  const touchElRef = useRef<HTMLElement | null>(null);
  const listenersAttachedRef = useRef(false);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const el = touchElRef.current;
    let scrollEl: HTMLElement | null = el?.parentElement ?? null;
    while (scrollEl && scrollEl.scrollHeight <= scrollEl.clientHeight + 1) {
      scrollEl = scrollEl.parentElement;
    }
    gestureRef.current = {
      startY: e.touches[0].clientY,
      lastY: e.touches[0].clientY,
      lastTime: Date.now(),
      velocity: 0,
      dragging: false,
      startScrollTop: scrollEl?.scrollTop ?? 0,
      scrollEl,
    };
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const g = gestureRef.current;
    const touchY = e.touches[0].clientY;
    const deltaY = touchY - g.startY;
    const currentScrollTop = g.scrollEl?.scrollTop ?? 0;
    const now = Date.now();
    const dt = now - g.lastTime;
    if (dt > 0) {
      const instantVelocity = (touchY - g.lastY) / dt;
      g.velocity = 0.7 * g.velocity + 0.3 * instantVelocity;
    }
    g.lastY = touchY;
    g.lastTime = now;

    // Only start dragging once the scrollable content is at/near the top and pulling down.
    if (!g.dragging && g.startScrollTop <= 5 && currentScrollTop <= 5 && deltaY > 3) {
      g.dragging = true;
    }
    if (g.dragging && deltaY > 0) {
      const offset = deltaY * 0.85; // slight rubber-band resistance
      offsetYRef.current = offset;
      setOffsetY(offset);
      e.preventDefault();
    } else if (g.dragging && deltaY <= 0) {
      offsetYRef.current = 0;
      setOffsetY(0);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    const g = gestureRef.current;
    if (!g.dragging) {
      offsetYRef.current = 0;
      setOffsetY(0);
      return;
    }
    const offset = offsetYRef.current;
    const velocity = g.velocity; // px/ms, positive = downward
    const screenH = window.innerHeight;
    g.dragging = false;

    const shouldClose = velocity > 0.3 || offset > screenH * 0.25 || (offset > 80 && velocity > 0.05);
    if (shouldClose) {
      setClosing(true);
      offsetYRef.current = screenH;
      setOffsetY(screenH);
      setTimeout(() => {
        onOpenChangeRef.current(false);
        offsetYRef.current = 0;
        setOffsetY(0);
        setClosing(false);
      }, 220);
    } else {
      offsetYRef.current = 0;
      setOffsetY(0);
    }
  }, []);

  const detachListeners = useCallback(() => {
    if (touchElRef.current && listenersAttachedRef.current) {
      touchElRef.current.removeEventListener("touchstart", handleTouchStart as EventListener);
      touchElRef.current.removeEventListener("touchmove", handleTouchMove as EventListener);
      touchElRef.current.removeEventListener("touchend", handleTouchEnd as EventListener);
      listenersAttachedRef.current = false;
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const swipeCallbackRef = useCallback(
    (node: HTMLElement | null) => {
      detachListeners();
      touchElRef.current = node;
      if (node && enabled) {
        node.addEventListener("touchstart", handleTouchStart as EventListener, { passive: true });
        node.addEventListener("touchmove", handleTouchMove as EventListener, { passive: false });
        node.addEventListener("touchend", handleTouchEnd as EventListener, { passive: true });
        listenersAttachedRef.current = true;
      }
    },
    [enabled, handleTouchStart, handleTouchMove, handleTouchEnd, detachListeners],
  );

  // Reset when the dialog closes any other way (X button, Cancel, Escape, overlay click).
  useEffect(() => {
    if (!open) {
      offsetYRef.current = 0;
      setOffsetY(0);
      setClosing(false);
    }
    return detachListeners;
  }, [open, detachListeners]);

  const style: CSSProperties | undefined = enabled
    ? offsetY > 0
      ? {
          transform: `translateY(${offsetY}px)`,
          opacity: closing ? 0 : Math.max(1 - offsetY / (window.innerHeight * 0.6), 0.4),
          transition: closing ? "transform 0.22s ease-out, opacity 0.22s ease-out" : "none",
        }
      : {
          transform: "translateY(0)",
          opacity: 1,
          transition: "transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.25s ease-out",
        }
    : undefined;

  return { swipeCallbackRef, style };
}
