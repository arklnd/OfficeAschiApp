import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { HyDialogModule } from '@hyland/ui/dialog';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [HyDialogModule],
  template: `
    <hy-dialog
      header="Cancel Booking"
      message="Are you sure you want to cancel this booking?"
      confirmLabel="Yes, Cancel"
      dismissLabel="No, Keep"
      [destructive]="true"
      (confirmed)="onConfirm()"
      (dismissed)="onDismiss()"
    ></hy-dialog>
  `,
})
export class ConfirmDialogComponent {
  constructor(private dialogRef: MatDialogRef<ConfirmDialogComponent>) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onDismiss(): void {
    this.dialogRef.close(false);
  }
}
