import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HyDialogModule } from '@hyland/ui/dialog';

export interface CancelBookConfirmDialogData {
  personName: string;
  seatLabel: string;
  date: string;
}

@Component({
  selector: 'app-cancel-book-confirm-dialog',
  standalone: true,
  imports: [HyDialogModule],
  template: `
    <hy-dialog
      header="Cancel Booking"
      confirmLabel="Yes, Cancel"
      dismissLabel="No, Keep"
      [destructive]="true"
      (confirmed)="onConfirm()"
      (dismissed)="onDismiss()"
    >
      Cancel <strong>{{ data.personName }}</strong>'s booking on
      <strong>{{ data.seatLabel }}</strong> for
      <strong>{{ data.date }}</strong>?
    </hy-dialog>
  `,
})
export class CancelBookConfirmDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<CancelBookConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CancelBookConfirmDialogData,
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onDismiss(): void {
    this.dialogRef.close(false);
  }
}
