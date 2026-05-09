import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { HyDialogModule } from '@hyland/ui/dialog';
import { HyMaterialFormFieldModule, HyMaterialButtonModule, HyMaterialIconModule } from '@hyland/ui/material';
import { HyTagModule } from '@hyland/ui/tag';
import { TotpService } from './totp.service';
import * as QRCode from 'qrcode';

export interface TotpSetupDialogData {
  entityType: 'manager' | 'reportee';
  entityId: number;
  label: string;
}

export interface TotpSetupDialogResult {
  secret: string;
  code: string;
}

@Component({
  selector: 'app-totp-setup-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatStepperModule,
    HyDialogModule, HyMaterialFormFieldModule, HyMaterialButtonModule,
    HyMaterialIconModule, HyTagModule,
  ],
  template: `
    <hy-dialog
      header="TOTP Setup"
      [confirmLabel]="step() === 2 ? 'Done' : ''"
      [dismissLabel]="canDismiss ? 'Cancel' : ''"
      (confirmed)="onDone()"
      (dismissed)="onCancel()"
    >
      @if (step() === 0) {
        <div class="setup-step">
          <p>Scan this QR code with your authenticator app, or save the secret key below.</p>
          <div class="qr-container">
            @if (qrDataUrl()) {
              <img [src]="qrDataUrl()" alt="TOTP QR Code" width="200" height="200" />
            }
          </div>
          <div class="secret-display">
            <hy-tag color="blue">{{ secret() }}</hy-tag>
          </div>
          <div class="actions">
            <button mat-stroked-button hyIconLabelButton (click)="downloadQr()">
              <mat-icon hyIcon>download</mat-icon> Download QR
            </button>
            <button mat-stroked-button hyIconLabelButton (click)="copySecret()">
              <mat-icon hyIcon>content_copy</mat-icon> Copy Secret
            </button>
          </div>
          <div class="next-action">
            <button mat-flat-button color="primary" (click)="step.set(1)">
              Next: Verify Code
            </button>
          </div>
        </div>
      }

      @if (step() === 1) {
        <div class="setup-step">
          <p>Enter the 6-digit code from your authenticator app to verify setup.</p>
          <mat-form-field hyFormField>
            <mat-label>TOTP Code</mat-label>
            <input matInput [(ngModel)]="verifyCode" maxlength="6" placeholder="000000"
                   (keydown.enter)="verifyTotp()" autocomplete="off" />
          </mat-form-field>
          @if (verifyError()) {
            <p class="error">{{ verifyError() }}</p>
          }
          <div class="next-action">
            <button mat-button (click)="step.set(0)">Back</button>
            <button mat-flat-button color="primary" (click)="verifyTotp()" [disabled]="verifying()">
              Verify
            </button>
          </div>
        </div>
      }

      @if (step() === 2) {
        <div class="setup-step success">
          <mat-icon hyIcon class="success-icon">check_circle</mat-icon>
          <p>TOTP setup complete! Your secret has been saved.</p>
        </div>
      }
    </hy-dialog>
  `,
  styles: [`
    .setup-step { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 8px 0; }
    .qr-container { padding: 12px; background: white; border-radius: 8px; }
    .secret-display { word-break: break-all; text-align: center; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
    .next-action { display: flex; gap: 8px; justify-content: center; }
    .error { color: var(--mat-sys-error, #d32f2f); }
    .success-icon { font-size: 48px; width: 48px; height: 48px; color: var(--mat-sys-primary, #4caf50); }
    .success { text-align: center; }
  `],
})
export class TotpSetupDialogComponent implements OnInit {
  secret = signal('');
  qrDataUrl = signal('');
  step = signal(0);
  verifyCode = '';
  verifiedCode = '';
  verifyError = signal('');
  verifying = signal(false);

  canDismiss: boolean;

  constructor(
    private dialogRef: MatDialogRef<TotpSetupDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TotpSetupDialogData,
    private totpService: TotpService,
  ) {
    this.canDismiss = !dialogRef.disableClose;
  }

  ngOnInit(): void {
    const secret = this.totpService.generateSecret();
    this.secret.set(secret);
    const uri = this.totpService.getOtpAuthUri(secret, this.data.label);
    QRCode.toDataURL(uri, { width: 200, margin: 1 }).then(url => this.qrDataUrl.set(url));
  }

  downloadQr(): void {
    const link = document.createElement('a');
    link.href = this.qrDataUrl();
    link.download = `totp-${this.data.label}.png`;
    link.click();
  }

  copySecret(): void {
    navigator.clipboard.writeText(this.secret());
  }

  verifyTotp(): void {
    this.verifying.set(true);
    this.verifyError.set('');
    const valid = this.totpService.validate(this.secret(), this.verifyCode);
    if (valid) {
      this.verifiedCode = this.verifyCode;
      this.totpService.storeSecret(this.data.entityType, this.data.entityId, this.secret());
      this.step.set(2);
    } else {
      this.verifyError.set('Invalid code. Please try again.');
    }
    this.verifying.set(false);
  }

  onDone(): void {
    if (this.step() === 2) {
      this.dialogRef.close({ secret: this.secret(), code: this.verifiedCode } as TotpSetupDialogResult);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
