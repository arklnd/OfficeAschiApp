import { Injectable, inject, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { TotpService } from '../totp/totp.service';

export interface SignalRNotification {
  title: string;
  body: string;
  url?: string;
  eventType: string;
  notificationId?: string;
}

@Injectable({ providedIn: 'root' })
export class SignalRService implements OnDestroy {
  private connection: signalR.HubConnection | null = null;
  private notification$ = new Subject<SignalRNotification>();
  private totpService = inject(TotpService);
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  get notifications(): Observable<SignalRNotification> {
    return this.notification$.asObservable();
  }

  async connect(entityType: string, entityId: number): Promise<void> {
    if (this.connection) {
      await this.disconnect();
    }

    const secret = this.totpService.getSecret(entityType, entityId);
    if (!secret) return;

    const totpCode = this.totpService.generateCode(secret);

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/notifications')
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (ctx) => {
          if (ctx.previousRetryCount >= this.maxReconnectAttempts) return null;
          return Math.min(1000 * Math.pow(2, ctx.previousRetryCount), 30000);
        },
      })
      .build();

    this.connection.on('ReceiveNotification', (payload: SignalRNotification) => {
      this.notification$.next(payload);
    });

    this.connection.on('AuthError', (msg: string) => {
      console.warn('SignalR auth error:', msg);
    });

    this.connection.onreconnected(async () => {
      this.reconnectAttempts = 0;
      const newCode = this.totpService.generateCode(secret);
      await this.connection?.invoke('JoinGroup', entityType, entityId, newCode);
    });

    try {
      await this.connection.start();
      await this.connection.invoke('JoinGroup', entityType, entityId, totpCode);
      this.reconnectAttempts = 0;
    } catch (err) {
      console.warn('SignalR connection failed:', err);
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.stop();
      } catch { /* ignore */ }
      this.connection = null;
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.notification$.complete();
  }
}
