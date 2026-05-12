import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.officeAschi.app',
  appName: 'Office Aschi',
  webDir: 'dist/office-aschi/browser',
  server: {
    hostname: 'officeaschi.app',
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
