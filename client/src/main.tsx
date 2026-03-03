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

  // Hide splash screen after app loads
  SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {});

  // Add safe area CSS variables for iOS notch handling
  document.documentElement.classList.add('capacitor-ios');
}

// ── Prevent pinch-to-zoom on iOS ──────────────────────────────────────
// iOS Safari/WKWebView ignores the viewport meta maximum-scale since iOS 10.
// The only reliable way to prevent zoom is:
// 1. CSS touch-action: pan-x pan-y (on html/body, done in index.css)
// 2. Block the proprietary 'gesturestart' event (iOS-only, fires on pinch)
// 3. Block multi-touch touchmove (catches edge cases gesturestart misses)

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

createRoot(document.getElementById("root")!).render(<App />);
