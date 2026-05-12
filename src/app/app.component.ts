import { Component, inject, isDevMode, NgZone } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { HyShellModule, HyShellSideNavModes } from '@hyland/ui-shell';
import { HyFeedbackBannerModule } from '@hyland/ui/feedback-banner';
import { HyTranslateModule } from '@hyland/ui/language';
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
  private swUpdate = inject(SwUpdate);
  private router = inject(Router);
  private location = inject(Location);
  private ngZone = inject(NgZone);

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

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    // Wait for the shell toolbar to render, then read its computed background
    setTimeout(() => this.applyStatusBarFromTheme(prefersDark.matches), 0);
    prefersDark.addEventListener('change', (e) => {
      this.applyStatusBarFromTheme(e.matches);
    });
  }

  private applyStatusBarFromTheme(isDark: boolean) {
    const toolbar = document.querySelector('.hy-shell-header.mat-toolbar');
    if (toolbar) {
      const bg = getComputedStyle(toolbar).backgroundColor;
      const hex = this.rgbToHex(bg);
      StatusBar.setBackgroundColor({ color: hex });
    }
    StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
  }

  private rgbToHex(rgb: string): string {
    const match = rgb.match(/\d+/g);
    if (!match || match.length < 3) return '#ffffff';
    const [r, g, b] = match.map(Number);
    return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
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
