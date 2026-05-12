import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.officeAschi.app',
  appName: 'Office Aschi',
  webDir: 'dist/office-aschi/browser',
  server: {
    cleartext: true,
  },
};

export default config;
