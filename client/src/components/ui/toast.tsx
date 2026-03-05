import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col pt-[calc(env(safe-area-inset-top)+0.75rem)] px-4 pb-4 sm:right-0 sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-3 overflow-hidden rounded-xl border p-4 pr-7 shadow-lg backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-top-full data-[state=open]:slide-in-from-top-full data-[state=open]:duration-300 data-[state=closed]:duration-200",
  {
    variants: {
      variant: {
        default: "border-yellow-600/30 bg-slate-800/95 text-yellow-100 shadow-xl",
        destructive:
          "destructive group border-red-600/40 bg-slate-900/95 text-red-100 shadow-xl",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, onOpenChange, ...props }, ref) => {
  const touchRef = React.useRef<{ startY: number; currentY: number } | null>(null);
  const [offsetY, setOffsetY] = React.useState(0);
  const [dismissing, setDismissing] = React.useState(false);
  const [isTouching, setIsTouching] = React.useState(false);
  const elRef = React.useRef<HTMLLIElement | null>(null);
  const listenersRef = React.useRef(false);
  const onOpenChangeRef = React.useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const handleTouchStart = React.useCallback((e: TouchEvent) => {
    touchRef.current = { startY: e.touches[0].clientY, currentY: e.touches[0].clientY };
    setIsTouching(true);
  }, []);

  const handleTouchMove = React.useCallback((e: TouchEvent) => {
    if (!touchRef.current) return;
    const deltaY = e.touches[0].clientY - touchRef.current.startY;
    touchRef.current.currentY = e.touches[0].clientY;
    // Only allow upward swipe (negative delta) — clamp downward to slight rubber band
    if (deltaY < 0) {
      e.preventDefault(); // prevent page scroll while swiping toast
      setOffsetY(deltaY);
    } else {
      setOffsetY(Math.pow(deltaY, 0.6)); // slight rubber band downward
    }
  }, []);

  const handleTouchEnd = React.useCallback(() => {
    if (!touchRef.current) return;
    const deltaY = touchRef.current.currentY - touchRef.current.startY;
    touchRef.current = null;
    setIsTouching(false);
    // If swiped up more than 40px, dismiss
    if (deltaY < -40) {
      setDismissing(true);
      setOffsetY(-200);
      setTimeout(() => {
        onOpenChangeRef.current?.(false);
      }, 200);
    } else {
      setOffsetY(0);
    }
  }, []);

  // Block Radix's internal pointer capture which interferes with touch-based swipe
  // We use gotpointercapture to release AFTER Radix captures, ensuring touch events flow normally
  const handleGotPointerCapture = React.useCallback((e: PointerEvent) => {
    if (e.pointerType === 'touch') {
      const target = e.currentTarget as HTMLElement;
      try { target.releasePointerCapture(e.pointerId); } catch (_) {}
    }
  }, []);

  // Native touch listeners via callback ref (iOS Capacitor needs { passive: false })
  const callbackRef = React.useCallback((node: HTMLLIElement | null) => {
    // Clean up old
    if (elRef.current && listenersRef.current) {
      elRef.current.removeEventListener('touchstart', handleTouchStart);
      elRef.current.removeEventListener('touchmove', handleTouchMove);
      elRef.current.removeEventListener('touchend', handleTouchEnd);
      elRef.current.removeEventListener('gotpointercapture', handleGotPointerCapture as EventListener);
      listenersRef.current = false;
    }
    elRef.current = node;
    if (node) {
      node.addEventListener('touchstart', handleTouchStart, { passive: true });
      node.addEventListener('touchmove', handleTouchMove, { passive: false });
      node.addEventListener('touchend', handleTouchEnd, { passive: true });
      // Release pointer capture immediately when Radix sets it, so touch events keep flowing
      node.addEventListener('gotpointercapture', handleGotPointerCapture as EventListener);
      listenersRef.current = true;
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleGotPointerCapture]);

  // Merge refs
  const mergedRef = React.useCallback((node: HTMLLIElement | null) => {
    callbackRef(node);
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLLIElement | null>).current = node;
  }, [ref, callbackRef]);

  return (
    <ToastPrimitives.Root
      ref={mergedRef}
      className={cn(toastVariants({ variant }), className)}
      onOpenChange={onOpenChange}
      style={{
        transform: offsetY !== 0 ? `translateY(${offsetY}px)` : undefined,
        transition: isTouching ? 'none' : 'transform 0.2s ease-out, opacity 0.2s ease-out',
        opacity: dismissing ? 0 : 1,
        touchAction: 'none', // prevent browser handling of touch gestures
      }}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, onClick, ...props }, ref) => {
  // Guard: fire the onClick exactly once per toast instance.
  // On iOS Capacitor, multiple events (touchEnd, click, pointerUp) can fire
  // from a single tap due to touchAction:'none' + gotpointercapture on the toast root.
  const firedRef = React.useRef(false);

  const fireOnce = React.useCallback((e: React.SyntheticEvent) => {
    if (firedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    firedRef.current = true;
    onClick?.(e as React.MouseEvent<HTMLButtonElement>);
  }, [onClick]);

  const handleTouchEnd = React.useCallback((e: React.TouchEvent) => {
    e.preventDefault(); // Prevent synthesized click
    fireOnce(e);
  }, [fireOnce]);

  const handleClick = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    fireOnce(e);
  }, [fireOnce]);

  return (
    <ToastPrimitives.Action
      ref={ref}
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
        className
      )}
      onClick={handleClick}
      onTouchEnd={handleTouchEnd}
      {...props}
    />
  );
})
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-yellow-200/60 opacity-0 transition-opacity hover:text-yellow-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-yellow-600 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
