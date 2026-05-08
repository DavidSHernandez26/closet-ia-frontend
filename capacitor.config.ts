import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.closetia.app',
  appName: 'Be: Confident',
  webDir: 'build',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Camera: {
      presentationStyle: 'popover',
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'dark',
      backgroundColor: '#00000000',
    },
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#0F0326',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resize: 'none' as any,
      resizeOnFullScreen: false,
    },
  },
};

export default config;
