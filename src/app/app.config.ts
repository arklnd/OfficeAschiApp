import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
  isDevMode,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideNativeDateAdapter } from '@angular/material/core';
import { HyShellModule, HY_SHELL_CONFIG_INITIALIZER } from '@hyland/ui-shell';
import { HyAuthService } from '@hyland/ui/auth';
import { NoopAuthService } from './noop-auth.service';

import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    provideAnimationsAsync(),
    provideNativeDateAdapter(),
    importProvidersFrom(HyShellModule.forRoot()),
    { provide: HyAuthService, useClass: NoopAuthService },
    {
      provide: HY_SHELL_CONFIG_INITIALIZER,
      useValue: {
        appInfo: {
          name: 'OfficeAschi',
          version: '1.0.0',
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
