import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.officeAschi.app',
  appName: 'Office Aschi',
  webDir: 'dist/office-aschi/browser',
  server: {
    url: 'CAPACITOR_SERVER_URL_PLACEHOLDER',
    cleartext: true,
  },
};

export default config;
