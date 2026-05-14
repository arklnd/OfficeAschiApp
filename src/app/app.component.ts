import { Component, inject, NgZone } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { HyShellModule, HyShellSideNavModes } from '@hyland/ui-shell';
import { HyFeedbackBannerModule } from '@hyland/ui/feedback-banner';
import { HyTranslateModule } from '@hyland/ui/language';
import { HyThemingService } from '@hyland/ui/theming';
import { ApiService } from './services/booking.service';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

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
        <hy-shell-nav-item [name]="'app.nav.teams' | transloco" route="/teams"></hy-shell-nav-item>
        <hy-shell-nav-item [name]="'app.nav.totp-sync-check' | transloco" route="/totp-sync-check"></hy-shell-nav-item>
        <hy-shell-nav-item [name]="'app.nav.implant-secret' | transloco" route="/implant-secret"></hy-shell-nav-item>
        <hy-shell-nav-item [name]="'app.nav.set-active-member' | transloco" route="/set-active-member"></hy-shell-nav-item>
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
  private swUpdate = inject(SwUpdate);
  private router = inject(Router);
  private location = inject(Location);
  private ngZone = inject(NgZone);
  private themingService = inject(HyThemingService);

  constructor(public api: ApiService) {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
        .subscribe(() => document.location.reload());

      // Check for updates every 5 minutes for long-running sessions
      setInterval(() => this.swUpdate.checkForUpdate(), 5 * 60 * 1000);
    }

    this.registerBackButton();
    this.syncStatusBarWithTheme();
  }

  private syncStatusBarWithTheme() {
    if (!Capacitor.isNativePlatform()) return;

    this.themingService.currentColorScheme$.subscribe((scheme) => {
      const isDark = scheme === 'hy-dark-theme';
      // Allow DOM to update with new theme before reading computed styles
      setTimeout(() => this.applyStatusBarFromTheme(isDark), 0);
    });
  }

  private applyStatusBarFromTheme(isDark: boolean) {
    StatusBar.setBackgroundColor({ color: isDark ? '#374151' : '#d1d5db' });
    StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
  }

  private registerBackButton() {
    if (!Capacitor.isNativePlatform()) return;

    CapApp.addListener('backButton', ({ canGoBack }) => {
      this.ngZone.run(() => {
        if (canGoBack) {
          this.location.back();
        } else {
          CapApp.exitApp();
        }
      });
    });
  }
}
