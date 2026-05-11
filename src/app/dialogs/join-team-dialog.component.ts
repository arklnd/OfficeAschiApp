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
import { HyTranslateModule, HyTranslateService } from '@hyland/ui/language';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ApiService } from '../services/booking.service';
import { DownloadService } from '../services/download.service';
import { TotpService } from '../totp/totp.service';
import { TotpCodeInputComponent } from '../totp/totp-code-input.component';
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
    HyDialogModule, HyToastModule, HyTagModule, TotpCodeInputComponent,
    HyTranslateModule,
  ],
  template: `
    <hy-dialog
      [header]="t.get('app.dialogs.join-team', { team: data.teamName })"
      [confirmLabel]="joining() ? t.get('app.dialogs.joining') : t.get('app.dialogs.join-team-btn')"
      [dismissLabel]="t.get('app.common.cancel')"
      (confirmed)="joinTeam()"
      (dismissed)="dialogRef.close(null)"
    >
      <form [formGroup]="form">
        <mat-form-field hyFormField class="full-width">
          <mat-label>{{ 'app.dialogs.friendly-name' | transloco }}</mat-label>
          <input matInput formControlName="friendlyName" [placeholder]="'app.dialogs.friendly-name-placeholder' | transloco" />
        </mat-form-field>

        <div class="totp-section">
          <p>{{ 'app.dialogs.scan-qr' | transloco }}</p>
          <div class="qr-container">
            @if (qrDataUrl()) {
              <img [src]="qrDataUrl()" [alt]="'app.dialogs.totp-qr-alt' | transloco" width="200" height="200" />
            }
          </div>
          <hy-tag color="blue">{{ secret() }}</hy-tag>
          <div class="qr-actions">
            <button mat-stroked-button hyIconLabelButton type="button" (click)="downloadQr()">
              <mat-icon hyIcon>download</mat-icon> {{ 'app.dialogs.download-qr' | transloco }}
            </button>
            <button mat-stroked-button hyIconLabelButton type="button" (click)="copySecret()">
              <mat-icon hyIcon>copy</mat-icon> {{ 'app.dialogs.copy-secret' | transloco }}
            </button>
          </div>
          <app-totp-code-input formControlName="verifyCode" [label]="'app.dialogs.verify-code' | transloco" fieldClass="full-width"></app-totp-code-input>
            @if (verifyError()) {
              <mat-error>{{ verifyError() }}</mat-error>
            }
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
    private downloadService: DownloadService,
    private toastService: HyToastService,
    private totpService: TotpService,
    public t: HyTranslateService,
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
    const uri = this.totpService.getOtpAuthUri(secret, `${name} @ ${this.data.teamName}`);
    this.generateQrWithLogo(uri).then(url => this.qrDataUrl.set(url));
  }

  private generateQrWithLogo(data: string): Promise<string> {
    const canvas = document.createElement('canvas');
    return QRCode.toCanvas(canvas, data, {
      width: 200,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: { dark: '#1a237e', light: '#ffffff' },
    }).then(() => {
      const ctx = canvas.getContext('2d')!;
      const logo = new Image();
      logo.src = 'icons/icon-96x96.png';
      return new Promise<string>((resolve) => {
        logo.onload = () => {
          const size = canvas.width * 0.22;
          const x = (canvas.width - size) / 2;
          const y = (canvas.height - size) / 2;
          const pad = 4;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.roundRect(x - pad, y - pad, size + pad * 2, size + pad * 2, 6);
          ctx.fill();
          ctx.drawImage(logo, x, y, size, size);
          resolve(canvas.toDataURL());
        };
        logo.onerror = () => resolve(canvas.toDataURL());
      });
    });
  }

  downloadQr(): void {
    const filename = `totp-${this.form.get('friendlyName')!.value}.png`;
    this.downloadService.downloadDataUrl(this.qrDataUrl(), filename);
  }

  copySecret(): void {
    navigator.clipboard.writeText(this.secret());
  }

  joinTeam(): void {
    if (this.joining()) return;
    const name = this.form.get('friendlyName')!.value?.trim();
    if (!name) { this.toastService.error(this.t.get('app.dialogs.name-required')); return; }

    const code = this.form.get('verifyCode')!.value ?? '';
    if (!code || code.length !== 6) {
      this.verifyError.set(this.t.get('app.dialogs.enter-6-digit-code'));
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
        this.toastService.success(this.t.get('app.dialogs.joined-as', { name: r.friendlyName }));
        this.dialogRef.close(r);
      },
      error: err => {
        this.toastService.error(err.error?.error || this.t.get('app.dialogs.failed-join'));
        this.joining.set(false);
      },
    });
  }
}
