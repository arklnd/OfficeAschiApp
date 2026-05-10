import { Injectable, inject } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { HttpClient, HttpContext } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TOTP_ENTITY_TYPE, TOTP_ENTITY_ID, TOTP_ENTITY_NAME, TOTP_ACTION_REASON } from '../totp/totp.context';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private swPush = inject(SwPush);
  private http = inject(HttpClient);

  get isSupported(): boolean {
    return this.swPush.isEnabled && 'Notification' in window;
  }

  get permission(): NotificationPermission {
    return 'Notification' in window ? Notification.permission : 'denied';
  }

  async getVapidPublicKey(): Promise<string> {
    const res = await firstValueFrom(this.http.get<{ publicKey: string }>('/api/push/vapid-key'));
    return res.publicKey;
  }

  async subscribe(entityType: string, entityId: number, entityName: string): Promise<boolean> {
    if (!this.isSupported) return false;

    try {
      const vapidPublicKey = await this.getVapidPublicKey();
      if (!vapidPublicKey) return false;

      const sub = await this.swPush.requestSubscription({ serverPublicKey: vapidPublicKey });
      const json = sub.toJSON();

      const context = new HttpContext()
        .set(TOTP_ENTITY_TYPE, entityType)
        .set(TOTP_ENTITY_ID, entityId)
        .set(TOTP_ENTITY_NAME, entityName)
        .set(TOTP_ACTION_REASON, 'app.notifications.reason-subscribe');

      await firstValueFrom(this.http.post('/api/push/subscribe', {
        endpoint: json.endpoint,
        p256dhKey: json.keys?.['p256dh'] ?? '',
        authKey: json.keys?.['auth'] ?? '',
      }, { context }));

      return true;
    } catch {
      return false;
    }
  }

  async unsubscribe(entityType: string, entityId: number, entityName: string): Promise<boolean> {
    if (!this.isSupported) return false;

    try {
      const sub = await this.swPush.subscription.pipe().toPromise();
      if (!sub) return false;
      const json = sub.toJSON();

      const context = new HttpContext()
        .set(TOTP_ENTITY_TYPE, entityType)
        .set(TOTP_ENTITY_ID, entityId)
        .set(TOTP_ENTITY_NAME, entityName)
        .set(TOTP_ACTION_REASON, 'app.notifications.reason-unsubscribe');

      await firstValueFrom(this.http.post('/api/push/unsubscribe', {
        endpoint: json.endpoint,
        p256dhKey: json.keys?.['p256dh'] ?? '',
        authKey: json.keys?.['auth'] ?? '',
      }, { context }));

      await this.swPush.unsubscribe();
      return true;
    } catch {
      return false;
    }
  }

  async isSubscribed(): Promise<boolean> {
    if (!this.isSupported) return false;
    try {
      const sub = await this.swPush.subscription.pipe().toPromise();
      return !!sub;
    } catch {
      return false;
    }
  }
}
