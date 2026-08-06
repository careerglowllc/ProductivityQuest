import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';

// Initialize Capacitor plugins when running as a native app
if (Capacitor.isNativePlatform()) {
  // Configure status bar for dark theme
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  StatusBar.setBackgroundColor({ color: '#0f172a' }).catch(() => {});

  // Configure keyboard behavior
  Keyboard.setAccessoryBarVisible({ isVisible: true }).catch(() => {});

  // Hide splash screen only after the browser has actually painted a frame of
  // our app. Hiding it immediately (or on a fixed timer, see capacitor.config.ts)
  // can reveal the WebView's raw white background for a moment before our dark
  // UI paints, causing a jarring "flash" mid-transition into the loading screen.
  // Double rAF guarantees at least one real paint has occurred first.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {});
    });
  });

  // Add safe area CSS variables for iOS notch handling
  document.documentElement.classList.add('capacitor-ios');
}

// ── Prevent pinch-to-zoom on iOS ──────────────────────────────────────
// iOS Safari/WKWebView ignores the viewport meta maximum-scale since iOS 10.
// Reliable prevention uses JS event interception:
// 1. Block the proprietary 'gesturestart' event (iOS-only, fires on pinch)
// 2. Block multi-touch touchmove (catches edge cases gesturestart misses)

document.addEventListener('gesturestart', (e) => {
  e.preventDefault();
}, { passive: false } as any);

document.addEventListener('gesturechange', (e) => {
  e.preventDefault();
}, { passive: false } as any);

document.addEventListener('gestureend', (e) => {
  e.preventDefault();
}, { passive: false } as any);

// Also catch double-tap zoom by preventing rapid-fire touchend
// and multi-finger touchmove (pinch) at document level
document.addEventListener('touchmove', (e) => {
  // If more than one finger, it's a pinch — block it
  if (e.touches.length > 1) {
    e.preventDefault();
  }
}, { passive: false });

// ── Global crash logger ─────────────────────────────────────────────────────
// React's <ErrorBoundary> only catches errors thrown during render/lifecycle —
// NOT errors thrown inside useEffect bodies, event handlers, or promise chains.
// Those instead surface here as a plain 'error' or 'unhandledrejection' event and,
// if unhandled, can leave the page effectively dead (blank/black) with no clue why.
// We persist the last one to sessionStorage so it survives a reload/crash and can
// be inspected (e.g. via Safari's remote inspector or by checking storage).
function persistCrash(source: string, message: string, stack?: string) {
  try {
    sessionStorage.setItem("pq-last-crash", JSON.stringify({
      source, message, stack: stack ?? null, url: location.href, at: new Date().toISOString(),
    }));
  } catch {}
  // eslint-disable-next-line no-console
  console.error(`[GlobalCrash:${source}]`, message, stack ?? "");
}

window.addEventListener("error", (event) => {
  persistCrash("error", event.message, event.error?.stack);
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  persistCrash("unhandledrejection", message, stack);
});

createRoot(document.getElementById("root")!).render(<App />);

