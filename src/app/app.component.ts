import { Component, isDevMode } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HyShellModule, HyShellSideNavModes } from '@hyland/ui-shell';
import { HyFeedbackBannerModule } from '@hyland/ui/feedback-banner';
import { HyTranslateModule } from '@hyland/ui/language';
import { ApiService } from './services/booking.service';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterOutlet,
    HyShellModule,
    HyFeedbackBannerModule,
    HyTranslateModule,
  ],
  template: `
    @if (api.backendDown()) {
      <hy-feedback-banner type="error" [message]="'app.banner.backend-down' | transloco"></hy-feedback-banner>
    }
    <hy-shell toolbarTitle="OfficeAschi" homeRoute="/" logo="icons/icon-96x96.png">
      <hy-shell-nav [mode]="sideNavMode">
        <hy-shell-nav-item [name]="'app.nav.teams' | transloco" route="/"></hy-shell-nav-item>
        @if (devMode) {
          <hy-shell-nav-item [name]="'app.nav.dev-menu' | transloco" route="/dev"></hy-shell-nav-item>
        }
      </hy-shell-nav>
      <router-outlet />
    </hy-shell>
  `,
  styles: `
    :host {
      display: block;
      height: 100vh;
    }
  `,
})
export class App {
  sideNavMode = HyShellSideNavModes.Side;
  devMode = isDevMode();
  constructor(public api: ApiService) {}
}
