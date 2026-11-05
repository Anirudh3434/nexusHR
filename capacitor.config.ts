import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexushr.app',
  appName: 'NexusHR',
  webDir: 'public',
  server: {
    // By default for Android emulator: 10.0.2.2 connects to localhost:3000 on host PC
    // For physical phone or production: set CAPACITOR_SERVER_URL=https://your-domain.com
    url: process.env.CAPACITOR_SERVER_URL || 'http://10.0.2.2:3000',
    cleartext: true,
    androidScheme: 'https',
  },
  plugins: {
    Geolocation: {
      // High-accuracy configuration
    },
  },
};

export default config;

