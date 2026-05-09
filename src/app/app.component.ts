import { Component, isDevMode } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HyShellModule, HyShellSideNavModes } from '@hyland/ui-shell';
import { HyFeedbackBannerModule } from '@hyland/ui/feedback-banner';
import { ApiService } from './services/booking.service';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterOutlet,
    HyShellModule,
    HyFeedbackBannerModule,
  ],
  template: `
    @if (api.backendDown()) {
      <hy-feedback-banner type="error" message="Backend is unreachable. Some features may not work."></hy-feedback-banner>
    }
    <hy-shell toolbarTitle="OfficeAschi" homeRoute="/">
      <hy-shell-nav [mode]="sideNavMode">
        <hy-shell-nav-item name="Teams" route="/"></hy-shell-nav-item>
        @if (devMode) {
          <hy-shell-nav-item name="Dev Menu" route="/dev"></hy-shell-nav-item>
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
