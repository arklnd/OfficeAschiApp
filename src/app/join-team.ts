import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { HyMaterialFormFieldModule, HyMaterialButtonModule, HyMaterialIconModule } from '@hyland/ui/material';
import { HyShellModule } from '@hyland/ui-shell';
import { HyToastService, HyToastModule } from '@hyland/ui/toast';
import { HyTagModule } from '@hyland/ui/tag';
import { ApiService } from './booking.service';
import { TeamResponse } from './models';
import { TotpService } from './totp.service';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-join-team',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatCardModule,
    MatFormFieldModule, MatInputModule, MatIconModule,
    HyMaterialFormFieldModule, HyMaterialButtonModule, HyMaterialIconModule,
    HyShellModule, HyToastModule, HyTagModule,
  ],
  template: `
    <hy-shell-view [title]="'Join ' + (team()?.name ?? 'Team')" />
    <div class="container">
      <mat-card appearance="outlined" class="form-card">
        <mat-card-header><mat-card-title>Join {{ team()?.name }}</mat-card-title></mat-card-header>
        <mat-card-content>
          @if (step() === 0) {
            <mat-form-field hyFormField class="full-width">
              <mat-label>Your Friendly Name</mat-label>
              <input matInput [(ngModel)]="friendlyName" placeholder="How the team knows you" />
            </mat-form-field>
            <div class="actions">
              <button mat-button (click)="router.navigate(['/team', teamId])">Cancel</button>
              <button mat-flat-button color="primary" (click)="goToTotp()">
                Next: Setup TOTP
              </button>
            </div>
          }

          @if (step() === 1) {
            <div class="totp-setup">
              <p>Scan this QR code with your authenticator app, or save the secret key.</p>
              <div class="qr-container">
                @if (qrDataUrl()) {
                  <img [src]="qrDataUrl()" alt="TOTP QR Code" width="200" height="200" />
                }
              </div>
              <div class="secret-display">
                <hy-tag color="blue">{{ secret() }}</hy-tag>
              </div>
              <div class="qr-actions">
                <button mat-stroked-button hyIconLabelButton (click)="downloadQr()">
                  <mat-icon hyIcon>download</mat-icon> Download QR
                </button>
                <button mat-stroked-button hyIconLabelButton (click)="copySecret()">
                  <mat-icon hyIcon>content_copy</mat-icon> Copy Secret
                </button>
              </div>
              <mat-form-field hyFormField class="full-width">
                <mat-label>Enter 6-digit code to verify</mat-label>
                <input matInput [(ngModel)]="verifyCode" maxlength="6" placeholder="000000"
                       (keydown.enter)="joinTeam()" autocomplete="off" />
              </mat-form-field>
              @if (verifyError()) {
                <p class="error">{{ verifyError() }}</p>
              }
              <div class="actions">
                <button mat-button (click)="step.set(0)">Back</button>
                <button mat-flat-button color="primary" (click)="joinTeam()" [disabled]="joining()">
                  Join Team
                </button>
              </div>
            </div>
          }

          @if (step() === 2) {
            <div class="success-step">
              <mat-icon hyIcon class="success-icon">verified</mat-icon>
              <p>All set! Your manager needs to approve your membership before you can book seats.</p>
              <button mat-flat-button color="primary" (click)="router.navigate(['/team', teamId])">Go to Team</button>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .container { max-width: 500px; margin: 0 auto; padding: 24px 16px; }
    .form-card { padding: 24px; }
    .full-width { width: 100%; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    mat-card-header, mat-card-content { padding: 0; }
    mat-card-header { margin-bottom: 16px; }
    .totp-setup { display: flex; flex-direction: column; align-items: center; gap: 16px; }
    .qr-container { padding: 12px; background: white; border-radius: 8px; }
    .secret-display { word-break: break-all; text-align: center; }
    .qr-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
    .error { color: var(--mat-sys-error, #d32f2f); margin: 0; }
    .success-step { display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; padding: 16px 0; }
    .success-icon { font-size: 48px; width: 48px; height: 48px; color: var(--mat-sys-primary, #4caf50); }
  `],
})
export class JoinTeamComponent implements OnInit {
  teamId = 0;
  team = signal<TeamResponse | null>(null);
  friendlyName = `Member-${Date.now()}`;
  step = signal(0);
  joining = signal(false);
  secret = signal('');
  qrDataUrl = signal('');
  verifyCode = '';
  verifyError = signal('');

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private api: ApiService,
    private toastService: HyToastService,
    private totpService: TotpService,
  ) {}

  ngOnInit(): void {
    this.teamId = Number(this.route.snapshot.paramMap.get('id'));
    const savedId = localStorage.getItem(`reportee_${this.teamId}`);
    if (savedId) {
      this.toastService.info('You have already joined this team');
      this.router.navigate(['/team', this.teamId]);
      return;
    }
    this.api.getTeam(this.teamId).subscribe(t => this.team.set(t));
  }

  goToTotp(): void {
    if (!this.friendlyName.trim()) { this.toastService.error('Name is required'); return; }
    const secret = this.totpService.generateSecret();
    this.secret.set(secret);
    const uri = this.totpService.getOtpAuthUri(secret, `${this.friendlyName} @ ${this.team()?.name}`);
    QRCode.toDataURL(uri, { width: 200, margin: 1 }).then(url => this.qrDataUrl.set(url));
    this.step.set(1);
  }

  downloadQr(): void {
    const link = document.createElement('a');
    link.href = this.qrDataUrl();
    link.download = `totp-${this.friendlyName}.png`;
    link.click();
  }

  copySecret(): void {
    navigator.clipboard.writeText(this.secret());
  }

  joinTeam(): void {
    if (!this.verifyCode || this.verifyCode.length !== 6) {
      this.verifyError.set('Enter a 6-digit code');
      return;
    }
    if (!this.totpService.validate(this.secret(), this.verifyCode)) {
      this.verifyError.set('Invalid code. Please try again.');
      return;
    }
    this.verifyError.set('');
    this.joining.set(true);

    this.api.joinTeam(this.teamId, {
      friendlyName: this.friendlyName.trim(),
      secretKey: this.secret(),
      totpCode: this.verifyCode,
    }).subscribe({
      next: r => {
        this.totpService.storeSecret('reportee', r.id, this.secret());
        localStorage.setItem(`reportee_${this.teamId}`, String(r.id));
        this.toastService.success(`Joined as ${r.friendlyName}!`);
        this.step.set(2);
        this.joining.set(false);
      },
      error: err => {
        this.toastService.error(err.error?.error || 'Failed to join');
        this.joining.set(false);
      },
    });
  }
}
