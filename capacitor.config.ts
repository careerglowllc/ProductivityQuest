import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.productivityquest.app',
  appName: 'ProductivityQuest',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    // For local development in iOS simulator
    // Comment out or remove for production builds
    url: 'http://localhost:5173',
    cleartext: true
  },
  ios: {
    contentInset: 'automatic'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: false
    }
  }
};

export default config;