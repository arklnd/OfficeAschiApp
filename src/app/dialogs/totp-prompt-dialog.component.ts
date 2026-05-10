import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { HyDialogModule } from '@hyland/ui/dialog';
import { HyMaterialIconModule } from '@hyland/ui/material';
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
  imports: [FormsModule, HyDialogModule, MatIconModule, HyMaterialIconModule, TotpCodeInputComponent],
  template: `
    <hy-dialog
      [header]="'TOTP Code Required'"
      [confirmLabel]="data.actionReason?.toUpperCase() || 'Authorize'"
      dismissLabel="Cancel"
      (confirmed)="onSubmit()"
      (dismissed)="onCancel()"
    >
      <div class="totp-prompt">
        <div class="totp-prompt-header">
          <mat-icon hyIcon class="totp-prompt-icon">lock</mat-icon>
          <p>Enter the 6-digit TOTP code for <strong>{{ data.entityName || data.entityType }}</strong> to {{ data.actionReason?.toLowerCase() || 'authorize this action' }}.</p>
        </div>
        <app-totp-code-input [(ngModel)]="code" (submitted)="onSubmit()"></app-totp-code-input>
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

  constructor(
    private dialogRef: MatDialogRef<TotpPromptDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TotpPromptDialogData,
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
