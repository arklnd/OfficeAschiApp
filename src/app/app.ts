import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HyShellModule, HyShellSideNavModes } from '@hyland/ui-shell';
import { HyFeedbackBannerModule } from '@hyland/ui/feedback-banner';
import { ApiService } from './booking.service';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterOutlet,
    HyShellModule,
    HyFeedbackBannerModule,
  ],
  template: `
    @if (backendDown()) {
      <hy-feedback-banner type="error" message="Backend is unreachable. Some features may not work."></hy-feedback-banner>
    }
    <hy-shell toolbarTitle="OfficeAschi" homeRoute="/">
      <hy-shell-nav [mode]="sideNavMode">
        <hy-shell-nav-item name="Teams" route="/"></hy-shell-nav-item>
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
export class App implements OnInit, OnDestroy {
  sideNavMode = HyShellSideNavModes.Side;
  backendDown = signal(false);
  private healthTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.checkHealth();
    this.scheduleNext();
  }

  ngOnDestroy(): void {
    if (this.healthTimer) clearTimeout(this.healthTimer);
  }

  private scheduleNext(): void {
    // Poll faster (10s) when backend is down, slower (30s) when healthy
    const delay = this.backendDown() ? 10_000 : 30_000;
    this.healthTimer = setTimeout(() => {
      this.checkHealth();
      this.scheduleNext();
    }, delay);
  }

  private checkHealth(): void {
    this.api.checkHealth().subscribe({
      next: () => this.backendDown.set(false),
      error: () => this.backendDown.set(true),
    });
  }
}
