import { Injectable, inject } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { Router } from '@angular/router';
import { Subject, Observable, merge } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { HyToastService } from '@hyland/ui/toast';
import { SignalRService, SignalRNotification } from './signalr.service';

export interface AppNotification {
  title: string;
  body: string;
  url?: string;
  eventType: string;
  notificationId?: string;
  source: 'signalr' | 'push';
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private signalR = inject(SignalRService);
  private swPush = inject(SwPush);
  private toastService = inject(HyToastService);
  private router = inject(Router);

  private seenIds = new Set<string>();

  /** Unified notification stream (deduplicated) */
  readonly notifications$: Observable<AppNotification> = merge(
    this.signalR.notifications.pipe(
      map((n: SignalRNotification): AppNotification => ({
        ...n,
        source: 'signalr',
      })),
    ),
    this.swPush.messages.pipe(
      filter((msg): msg is { notification: SignalRNotification } =>
        !!(msg as any)?.notification),
      map((msg): AppNotification => ({
        ...msg.notification,
        source: 'push',
      })),
    ),
  ).pipe(
    filter(n => {
      if (!n.notificationId) return true;
      if (this.seenIds.has(n.notificationId)) return false;
      this.seenIds.add(n.notificationId);
      // Clean up old IDs to prevent memory leak
      if (this.seenIds.size > 200) {
        const iter = this.seenIds.values();
        for (let i = 0; i < 100; i++) iter.next();
        // Keep only last 100
        const keep = new Set<string>();
        for (const id of this.seenIds) {
          if (keep.size >= 100) break;
          keep.add(id);
        }
        this.seenIds = keep;
      }
      return true;
    }),
  );

  constructor() {
    // Show toast for in-app notifications
    this.notifications$.subscribe(n => {
      this.toastService.info(`${n.title}: ${n.body}`);
    });

    // Handle notification clicks (from background push)
    if (this.swPush.isEnabled) {
      this.swPush.notificationClicks.subscribe(({ action, notification }) => {
        const url = notification?.data?.url;
        if (url) {
          this.router.navigateByUrl(url);
        }
      });
    }
  }
}
