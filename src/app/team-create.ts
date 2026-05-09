import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { HyMaterialFormFieldModule, HyMaterialButtonModule, HyMaterialIconModule } from '@hyland/ui/material';
import { HyShellModule } from '@hyland/ui-shell';
import { HyToastService, HyToastModule } from '@hyland/ui/toast';
import { HyTagModule } from '@hyland/ui/tag';
import { HyFormContainerModule } from '@hyland/ui/form-container';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ApiService } from './booking.service';
import { TotpService } from './totp.service';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-team-create',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatIconModule,
    HyMaterialFormFieldModule, HyMaterialButtonModule, HyMaterialIconModule,
    HyShellModule, HyToastModule, HyTagModule, HyFormContainerModule,
  ],
  template: `
    <hy-shell-view title="Create Team" />
    <div class="form-wrapper">
      <hy-form-container
        [formGroup]="form"
        formTitle="New Team"
        submitLabel="Create Team"
        [submitting]="creating()"
        (onSubmit)="createTeam()"
      >
        <mat-form-field hyFormField>
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
              <mat-icon hyIcon>content_copy</mat-icon> Copy Secret
            </button>
          </div>
          <mat-form-field hyFormField>
            <mat-label>Enter 6-digit code to verify</mat-label>
            <input matInput formControlName="verifyCode" maxlength="6" placeholder="000000" autocomplete="off" />
            @if (verifyError()) {
              <mat-error>{{ verifyError() }}</mat-error>
            }
          </mat-form-field>
        </div>

        <button mat-button hySecondaryFormButton type="button" (click)="router.navigate(['/'])">Cancel</button>
      </hy-form-container>
    </div>
  `,
  styles: [`
    .form-wrapper { max-width: 500px; margin: 0 auto; padding: 24px 16px; }
    .totp-section { display: flex; flex-direction: column; align-items: center; gap: 16px; width: 100%; }
    .qr-container { padding: 12px; background: white; border-radius: 8px; }
    .qr-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
  `],
})
export class TeamCreateComponent implements OnInit, OnDestroy {
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
    private api: ApiService,
    public router: Router,
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
    this.creating.set(true);

    this.api.createTeam({
      name: this.form.get('teamName')!.value || undefined,
      secretKey: this.secret(),
      totpCode: code,
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
