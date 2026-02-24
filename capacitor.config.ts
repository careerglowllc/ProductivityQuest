import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.productivityquest.app',
  appName: 'ProductivityQuest',
  webDir: 'dist/public',
  server: {
    // Point the iOS WebView to the production server
    // This avoids CORS issues since the app loads from the same origin as the API
    url: 'https://productivityquest.onrender.com',
    // Allow navigation to auth callback URLs
    allowNavigation: [
      'productivityquest.onrender.com',
      'accounts.google.com',
      '*.google.com'
    ]
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0f172a',
    // Allow mixed content for development
    allowsLinkPreview: false,
    // Scroll behavior
    scrollEnabled: true,
    // Use WKWebView (default in Capacitor 7)
    preferredContentMode: 'mobile'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      showSpinner: true,
      spinnerColor: '#eab308',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0f172a'
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    }
  }
};

export default config;