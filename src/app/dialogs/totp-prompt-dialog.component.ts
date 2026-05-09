import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HyDialogModule } from '@hyland/ui/dialog';
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
  imports: [FormsModule, HyDialogModule, TotpCodeInputComponent],
  template: `
    <hy-dialog
      [header]="data.actionReason ? data.actionReason + ' - TOTP Required' : 'TOTP Code Required'"
      confirmLabel="Submit"
      dismissLabel="Cancel"
      (confirmed)="onSubmit()"
      (dismissed)="onCancel()"
    >
      <p>Enter the 6-digit TOTP code for <strong>{{ data.entityName || data.entityType }}</strong> to {{ data.actionReason?.toLowerCase() || 'authorize this action' }}.</p>
      <app-totp-code-input [(ngModel)]="code" (submitted)="onSubmit()"></app-totp-code-input>
    </hy-dialog>
  `,
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
