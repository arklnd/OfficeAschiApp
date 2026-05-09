import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
import { TotpService } from './totp.service';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-team-create',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatCardModule,
    MatFormFieldModule, MatInputModule, MatIconModule,
    HyMaterialFormFieldModule, HyMaterialButtonModule, HyMaterialIconModule,
    HyShellModule, HyToastModule, HyTagModule,
  ],
  template: `
    <hy-shell-view title="Create Team" />
    <div class="container">
      <mat-card appearance="outlined" class="form-card">
        <mat-card-header><mat-card-title>New Team</mat-card-title></mat-card-header>
        <mat-card-content>
          @if (step() === 0) {
            <mat-form-field hyFormField class="full-width">
              <mat-label>Team Name (optional)</mat-label>
              <input matInput [(ngModel)]="teamName" placeholder="Leave blank for auto-generated name" />
            </mat-form-field>
            <div class="actions">
              <button mat-button (click)="router.navigate(['/'])">Cancel</button>
              <button mat-flat-button color="primary" (click)="step.set(1); generateSecret()">
                Next: Setup TOTP
              </button>
            </div>
          }

          @if (step() === 1) {
            <div class="totp-setup">
              <h3>{{ qrLabel() }}</h3>
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
                       (keydown.enter)="createTeam()" autocomplete="off" />
              </mat-form-field>
              @if (verifyError()) {
                <p class="error">{{ verifyError() }}</p>
              }
              <div class="actions">
                <button mat-button (click)="step.set(0)">Back</button>
                <button mat-flat-button color="primary" (click)="createTeam()" [disabled]="creating()">
                  Create Team
                </button>
              </div>
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
  `],
})
export class TeamCreateComponent {
  teamName = `Team-${Date.now()}`;
  step = signal(0);
  creating = signal(false);
  secret = signal('');
  qrDataUrl = signal('');
  qrLabel = signal('');
  verifyCode = '';
  verifyError = signal('');

  constructor(
    private api: ApiService,
    public router: Router,
    private toastService: HyToastService,
    private totpService: TotpService,
  ) {}

  generateSecret(): void {
    const secret = this.totpService.generateSecret();
    this.secret.set(secret);
    const label = this.teamName || `Team-${Date.now()}`;
    this.qrLabel.set(label);
    const uri = this.totpService.getOtpAuthUri(secret, `${label} (Manager)`);
    QRCode.toDataURL(uri, { width: 200, margin: 1 }).then(url => this.qrDataUrl.set(url));
  }

  downloadQr(): void {
    const link = document.createElement('a');
    link.href = this.qrDataUrl();
    link.download = `totp-${this.teamName || 'team'}-manager.png`;
    link.click();
  }

  copySecret(): void {
    navigator.clipboard.writeText(this.secret());
  }

  createTeam(): void {
    if (!this.verifyCode || this.verifyCode.length !== 6) {
      this.verifyError.set('Enter a 6-digit code');
      return;
    }
    if (!this.totpService.validate(this.secret(), this.verifyCode)) {
      this.verifyError.set('Invalid code. Please try again.');
      return;
    }
    this.verifyError.set('');
    this.creating.set(true);

    this.api.createTeam({
      name: this.teamName || undefined,
      secretKey: this.secret(),
      totpCode: this.verifyCode,
    }).subscribe({
      next: team => {
        this.totpService.storeSecret('manager', team.id, this.secret());
        this.toastService.success(`Team "${team.name}" created!`);
        this.router.navigate(['/team', team.id]);
      },
      error: err => {
        this.toastService.error(err.error?.error || 'Failed to create team');
        this.creating.set(false);
      },
    });
  }
}
