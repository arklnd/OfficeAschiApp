import { Component, signal, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { HyMaterialFormFieldModule, HyMaterialButtonModule, HyMaterialIconModule } from '@hyland/ui/material';
import { HyDialogModule } from '@hyland/ui/dialog';
import { HyToastService, HyToastModule } from '@hyland/ui/toast';
import { HyTagModule } from '@hyland/ui/tag';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ApiService } from './booking.service';
import { TotpService } from './totp.service';
import * as QRCode from 'qrcode';

export interface JoinTeamDialogData {
  teamId: number;
  teamName: string;
}

@Component({
  selector: 'app-join-team-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatIconModule,
    HyMaterialFormFieldModule, HyMaterialButtonModule, HyMaterialIconModule,
    HyDialogModule, HyToastModule, HyTagModule,
  ],
  template: `
    <hy-dialog
      [header]="'Join ' + data.teamName"
      [confirmLabel]="joining() ? 'Joining...' : 'Join Team'"
      dismissLabel="Cancel"
      (confirmed)="joinTeam()"
      (dismissed)="dialogRef.close(null)"
    >
      <form [formGroup]="form">
        <mat-form-field hyFormField class="full-width">
          <mat-label>Your Friendly Name</mat-label>
          <input matInput formControlName="friendlyName" placeholder="How the team knows you" />
        </mat-form-field>

        <div class="totp-section">
          <p>Scan this QR code with your authenticator app, or save the secret key.</p>
          <div class="qr-container">
            @if (qrDataUrl()) {
              <img [src]="qrDataUrl()" alt="TOTP QR Code" width="200" height="200" />
            }
          </div>
          <hy-tag color="blue">{{ secret() }}</hy-tag>
          <div class="qr-actions">
            <button mat-stroked-button hyIconLabelButton type="button" (click)="downloadQr()">
              <mat-icon hyIcon>download</mat-icon> Download QR
            </button>
            <button mat-stroked-button hyIconLabelButton type="button" (click)="copySecret()">
              <mat-icon hyIcon>content_copy</mat-icon> Copy Secret
            </button>
          </div>
          <mat-form-field hyFormField class="full-width">
            <mat-label>Enter 6-digit code to verify</mat-label>
            <input matInput formControlName="verifyCode" maxlength="6" placeholder="000000" autocomplete="off" />
            @if (verifyError()) {
              <mat-error>{{ verifyError() }}</mat-error>
            }
          </mat-form-field>
        </div>
      </form>
    </hy-dialog>
  `,
  styles: [`
    .full-width { width: 100%; }
    .totp-section { display: flex; flex-direction: column; align-items: center; gap: 16px; width: 100%; }
    .qr-container { padding: 12px; background: white; border-radius: 8px; }
    .qr-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
  `],
})
export class JoinTeamDialogComponent implements OnInit, OnDestroy {
  form = new FormGroup({
    friendlyName: new FormControl(`Member-${Date.now()}`, Validators.required),
    verifyCode: new FormControl(''),
  });
  joining = signal(false);
  secret = signal('');
  qrDataUrl = signal('');
  verifyError = signal('');
  private nameSub?: Subscription;

  constructor(
    public dialogRef: MatDialogRef<JoinTeamDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: JoinTeamDialogData,
    private api: ApiService,
    private toastService: HyToastService,
    private totpService: TotpService,
  ) {}

  ngOnInit(): void {
    this.generateSecret();
    this.nameSub = this.form.get('friendlyName')!.valueChanges
      .pipe(debounceTime(400))
      .subscribe(() => this.generateSecret());
  }

  ngOnDestroy(): void {
    this.nameSub?.unsubscribe();
  }

  private generateSecret(): void {
    const secret = this.totpService.generateSecret();
    this.secret.set(secret);
    this.form.get('verifyCode')!.reset('');
    this.verifyError.set('');
    const name = this.form.get('friendlyName')!.value || `Member-${Date.now()}`;
    const uri = this.totpService.getOtpAuthUri(secret, `${this.data.teamName} - ${name}`);
    QRCode.toDataURL(uri, { width: 200, margin: 1 }).then(url => this.qrDataUrl.set(url));
  }

  downloadQr(): void {
    const link = document.createElement('a');
    link.href = this.qrDataUrl();
    link.download = `totp-${this.form.get('friendlyName')!.value}.png`;
    link.click();
  }

  copySecret(): void {
    navigator.clipboard.writeText(this.secret());
  }

  joinTeam(): void {
    if (this.joining()) return;
    const name = this.form.get('friendlyName')!.value?.trim();
    if (!name) { this.toastService.error('Name is required'); return; }

    const code = this.form.get('verifyCode')!.value ?? '';
    if (!code || code.length !== 6) {
      this.verifyError.set('Enter a 6-digit code');
      return;
    }
    if (!this.totpService.validate(this.secret(), code)) {
      this.verifyError.set('Invalid code. Please try again.');
      return;
    }
    this.verifyError.set('');
    this.joining.set(true);

    this.api.joinTeam(this.data.teamId, {
      friendlyName: name,
      secretKey: this.secret(),
      totpCode: code,
    }).subscribe({
      next: r => {
        this.totpService.storeSecret('reportee', r.id, this.secret());
        localStorage.setItem(`reportee_${this.data.teamId}`, String(r.id));
        this.toastService.success(`Joined as ${r.friendlyName}!`);
        this.dialogRef.close(r);
      },
      error: err => {
        this.toastService.error(err.error?.error || 'Failed to join');
        this.joining.set(false);
      },
    });
  }
}
