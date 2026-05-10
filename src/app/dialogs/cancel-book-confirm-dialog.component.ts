import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HyDialogModule } from '@hyland/ui/dialog';
import { HyTranslateModule, HyTranslateService } from '@hyland/ui/language';

export interface CancelBookConfirmDialogData {
  personName: string;
  seatLabel: string;
  date: string;
  confirmTitle?: string;
  confirmMessage?: string;
  confirmLabel?: string;
  dismissLabel?: string;
}

@Component({
  selector: 'app-cancel-book-confirm-dialog',
  standalone: true,
  imports: [HyDialogModule, HyTranslateModule],
  template: `
    <hy-dialog
      [header]="data.confirmTitle ?? t.get('app.dialogs.cancel-booking-title')"
      [confirmLabel]="data.confirmLabel ?? t.get('app.dialogs.cancel-booking-confirm')"
      [dismissLabel]="data.dismissLabel ?? t.get('app.dialogs.cancel-booking-dismiss')"
      [destructive]="true"
      (confirmed)="onConfirm()"
      (dismissed)="onDismiss()"
    >
      @if (data.confirmMessage) {
        <span [innerHTML]="data.confirmMessage"></span>
      } @else {
        <span [innerHTML]="t.get('app.dialogs.cancel-booking-msg', { name: data.personName, seat: data.seatLabel, date: data.date })"></span>
      }
    </hy-dialog>
  `,
})
export class CancelBookConfirmDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<CancelBookConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CancelBookConfirmDialogData,
    public t: HyTranslateService,
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onDismiss(): void {
    this.dialogRef.close(false);
  }
}
