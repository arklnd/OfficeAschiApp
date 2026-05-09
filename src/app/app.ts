import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { HyShellModule, HyShellSideNavModes } from '@hyland/ui-shell';
import { ApiService } from './booking.service';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterOutlet,
    MatIconModule,
    HyShellModule,
  ],
  template: `
    @if (backendDown()) {
      <div class="backend-down">
        <mat-icon>cloud_off</mat-icon>
        <span>Backend is unreachable. Some features may not work.</span>
      </div>
    }
    <hy-shell toolbarTitle="OfficeAschi" homeRoute="/">
      <hy-shell-nav [mode]="sideNavMode">
        <hy-shell-nav-item name="Teams" route="/"></hy-shell-nav-item>
        <hy-shell-nav-item name="Create Team" route="/team/create"></hy-shell-nav-item>
      </hy-shell-nav>
      <router-outlet />
    </hy-shell>
  `,
  styles: `
    :host {
      display: block;
      height: 100vh;
    }
    .backend-down {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 16px;
      background: #d32f2f;
      color: white;
      font-weight: 500;
      font-size: 14px;
      z-index: 1000;
    }
    .backend-down mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
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
