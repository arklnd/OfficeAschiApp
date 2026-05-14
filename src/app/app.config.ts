import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
  isDevMode,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideNativeDateAdapter } from '@angular/material/core';
import { HyShellModule, HY_SHELL_CONFIG_INITIALIZER } from '@hyland/ui-shell';
import { HyAuthService } from '@hyland/ui/auth';
import { HY_TRANSLATE_CONFIG } from '@hyland/ui/language';
import { NoopAuthService } from './services/noop-auth.service';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { totpInterceptor } from './totp/totp.interceptor';

async function shellConfigFactory() {
  let version = 'APP_VERSION_PLACEHOLDER';
  if (Capacitor.isNativePlatform()) {
    const info = await CapApp.getInfo();
    version = info.version;
  }
  return {
    appInfo: {
      name: 'OfficeAschi',
      version,
      copyrightYear: 2026,
      licensesUrl: 'https://github.com/arklnd/OfficeAschiApi',
      privacyPolicyUrl: 'https://github.com/arklnd/OfficeAschiApp',
    },
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([totpInterceptor])),
    provideAnimationsAsync(),
    provideNativeDateAdapter(),
    importProvidersFrom(HyShellModule.forRoot()),
    { provide: HyAuthService, useClass: NoopAuthService },
    {
      provide: HY_TRANSLATE_CONFIG,
      useValue: {
        availableLangs: [
          { id: 'en', label: 'English' },
          { id: 'bn', label: 'বাংলা' },
          { id: 'hi', label: 'हिन्दी' },
        ],
        defaultLang: 'en',
      },
    },
    {
      provide: HY_SHELL_CONFIG_INITIALIZER,
      useValue: shellConfigFactory,
    },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
