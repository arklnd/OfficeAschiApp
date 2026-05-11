import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
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
import { TeamResponse } from '../models';
import { TotpService } from '../totp/totp.service';
import { TotpCodeInputComponent } from '../totp/totp-code-input.component';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-team-create-dialog',
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
      [header]="t.get('app.dialogs.create-team')"
      [confirmLabel]="creating() ? t.get('app.dialogs.creating') : t.get('app.dialogs.create-team-btn')"
      [dismissLabel]="t.get('app.common.cancel')"
      (confirmed)="createTeam()"
      (dismissed)="dialogRef.close(null)"
    >
      <form [formGroup]="form">
        <mat-form-field hyFormField class="full-width">
          <mat-label>{{ 'app.dialogs.team-name-label' | transloco }}</mat-label>
          <input matInput formControlName="teamName" [placeholder]="'app.dialogs.team-name-placeholder' | transloco" />
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
export class TeamCreateDialogComponent implements OnInit, OnDestroy {
  form = new FormGroup({
    teamName: new FormControl(`Team-${Date.now()}`),
    verifyCode: new FormControl(''),
  });
  creating = signal(false);
  secret = signal('');
  qrDataUrl = signal('');
  verifyError = signal('');
  private nameSub?: Subscription;

  constructor(
    public dialogRef: MatDialogRef<TeamCreateDialogComponent>,
    private api: ApiService,
    private downloadService: DownloadService,
    private toastService: HyToastService,
    private totpService: TotpService,
    public t: HyTranslateService,
  ) {}

  ngOnInit(): void {
    this.generateSecret();
    this.nameSub = this.form.get('teamName')!.valueChanges
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
    const label = this.form.get('teamName')!.value || `Team-${Date.now()}`;
    const uri = this.totpService.getOtpAuthUri(secret, `${label} (Manager)`);
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
    const filename = `totp-${this.form.get('teamName')!.value || 'team'}-manager.png`;
    this.downloadService.downloadDataUrl(this.qrDataUrl(), filename);
  }

  copySecret(): void {
    navigator.clipboard.writeText(this.secret());
  }

  createTeam(): void {
    if (this.creating()) return;
    const code = this.form.get('verifyCode')!.value ?? '';
    if (!code || code.length !== 6) {
      this.verifyError.set(this.t.get('app.dialogs.enter-6-digit-code'));
      return;
    }
    this.verifyError.set('');
    this.creating.set(true);

    this.api.createTeam({
      name: this.form.get('teamName')!.value || undefined,
      secretKey: this.secret(),
      totpCode: code,
    }).subscribe({
      next: team => {
        this.totpService.storeSecret('manager', team.id, this.secret());
        this.toastService.success(this.t.get('app.dialogs.team-created', { name: team.name }));
        this.dialogRef.close(team);
      },
      error: err => {
        this.toastService.error(err.error?.error || this.t.get('app.dialogs.failed-create-team'));
        this.creating.set(false);
      },
    });
  }
}
