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

import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { totpInterceptor } from './totp/totp.interceptor';

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
      useValue: {
        appInfo: {
          name: 'OfficeAschi',
          version: 'APP_VERSION_PLACEHOLDER',
          copyrightYear: 2026,
        },
      },
    },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
