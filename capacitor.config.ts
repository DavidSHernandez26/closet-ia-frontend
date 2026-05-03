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
  },
};

export default config;
