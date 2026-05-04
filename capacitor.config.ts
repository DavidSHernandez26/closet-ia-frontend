import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.closetia.app',
  appName: 'Closet IA',
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
      launchShowDuration: 1500,
      launchAutoHide: false,
      backgroundColor: '#0F0326',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resize: 'ionic' as any,
      resizeOnFullScreen: true,
    },
  },
};

export default config;
