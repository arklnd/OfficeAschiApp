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
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ApiService } from './booking.service';
import { TeamResponse } from './models';
import { TotpService } from './totp.service';
import { TotpCodeInputComponent } from './totp-code-input';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-team-create-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatIconModule,
    HyMaterialFormFieldModule, HyMaterialButtonModule, HyMaterialIconModule,
    HyDialogModule, HyToastModule, HyTagModule, TotpCodeInputComponent,
  ],
  template: `
    <hy-dialog
      header="Create Team"
      [confirmLabel]="creating() ? 'Creating...' : 'Create Team'"
      dismissLabel="Cancel"
      (confirmed)="createTeam()"
      (dismissed)="dialogRef.close(null)"
    >
      <form [formGroup]="form">
        <mat-form-field hyFormField class="full-width">
          <mat-label>Team Name (optional)</mat-label>
          <input matInput formControlName="teamName" placeholder="Leave blank for auto-generated name" />
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
              <mat-icon hyIcon>copy</mat-icon> Copy Secret
            </button>
          </div>
          <app-totp-code-input formControlName="verifyCode" label="Enter 6-digit code to verify" fieldClass="full-width"></app-totp-code-input>
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
    private toastService: HyToastService,
    private totpService: TotpService,
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
    QRCode.toDataURL(uri, { width: 200, margin: 1 }).then(url => this.qrDataUrl.set(url));
  }

  downloadQr(): void {
    const link = document.createElement('a');
    link.href = this.qrDataUrl();
    link.download = `totp-${this.form.get('teamName')!.value || 'team'}-manager.png`;
    link.click();
  }

  copySecret(): void {
    navigator.clipboard.writeText(this.secret());
  }

  createTeam(): void {
    if (this.creating()) return;
    const code = this.form.get('verifyCode')!.value ?? '';
    if (!code || code.length !== 6) {
      this.verifyError.set('Enter a 6-digit code');
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
        this.toastService.success(`Team "${team.name}" created!`);
        this.dialogRef.close(team);
      },
      error: err => {
        this.toastService.error(err.error?.error || 'Failed to create team');
        this.creating.set(false);
      },
    });
  }
}
