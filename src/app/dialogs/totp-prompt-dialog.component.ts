import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { HyDialogModule } from '@hyland/ui/dialog';
import { HyMaterialIconModule } from '@hyland/ui/material';
import { HyTranslateModule, HyTranslateService } from '@hyland/ui/language';
import { TotpCodeInputComponent } from '../totp/totp-code-input.component';

export interface TotpPromptDialogData {
  entityType: string;
  entityId: number;
  entityName?: string;
  actionReason?: string;
}

@Component({
  selector: 'app-totp-prompt-dialog',
  standalone: true,
  imports: [FormsModule, HyDialogModule, MatIconModule, HyMaterialIconModule, TotpCodeInputComponent, HyTranslateModule],
  template: `
    <hy-dialog
      [header]="t.get('app.dialogs.totp-required')"
      [confirmLabel]="resolvedReason.toUpperCase() || t.get('app.dialogs.authorize')"
      [dismissLabel]="t.get('app.common.cancel')"
      (confirmed)="onSubmit()"
      (dismissed)="onCancel()"
    >
      <div class="totp-prompt">
        <div class="totp-prompt-header">
          <mat-icon hyIcon class="totp-prompt-icon">lock</mat-icon>
          <p [innerHTML]="t.get('app.dialogs.totp-prompt', { name: data.entityName || data.entityType, reason: resolvedReason.toLowerCase() || t.get('app.dialogs.authorize').toLowerCase() })"></p>
        </div>
        <app-totp-code-input [(ngModel)]="code" [label]="'app.dialogs.totp-code-label' | transloco" (submitted)="onSubmit()"></app-totp-code-input>
      </div>
    </hy-dialog>
  `,
  styles: [`
    .totp-prompt {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .totp-prompt-header {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .totp-prompt-icon {
      flex-shrink: 0;
      margin-top: 2px;
      opacity: 0.7;
    }
    .totp-prompt-header p {
      margin: 0;
    }
  `],
})
export class TotpPromptDialogComponent {
  code = '';

  get resolvedReason(): string {
    return this.data.actionReason ? this.t.get(this.data.actionReason) : '';
  }

  constructor(
    private dialogRef: MatDialogRef<TotpPromptDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TotpPromptDialogData,
    public t: HyTranslateService,
  ) {}

  onSubmit(): void {
    if (this.code.length === 6) {
      this.dialogRef.close(this.code);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
