import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HyDialogModule } from '@hyland/ui/dialog';

export interface ConfirmDialogData {
  personName: string;
  seatLabel: string;
  date: string;
}

@Component({
  selector: 'app-confirm-dialog',
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
export class ConfirmDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData,
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onDismiss(): void {
    this.dialogRef.close(false);
  }
}
