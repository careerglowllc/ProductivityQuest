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

createRoot(document.getElementById("root")!).render(<App />);
