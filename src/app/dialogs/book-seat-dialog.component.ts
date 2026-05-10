import { Component, Inject, signal, computed } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { HyDialogModule } from '@hyland/ui/dialog';
import { HyMaterialFormFieldModule } from '@hyland/ui/material';
import { HyComboBoxModule } from '@hyland/ui/combo-box';
import { HyTranslateModule, HyTranslateService } from '@hyland/ui/language';
import { ReporteeResponse } from '../models';

export interface BookSeatDialogData {
  seatLabel: string;
  date: string;
  /** When set, the user already has a stored identity — skip the picker. */
  currentReporteeName: string | null;
  /** Available (approved, not-yet-booked) reportees for the picker. */
  reportees: ReporteeResponse[];
}

export interface BookSeatDialogResult {
  reportee: ReporteeResponse;
}

@Component({
  selector: 'app-book-seat-dialog',
  standalone: true,
  imports: [HyDialogModule, MatFormFieldModule, HyMaterialFormFieldModule, HyComboBoxModule, HyTranslateModule],
  template: `
    <hy-dialog
      [header]="t.get('app.dialogs.book-seat', { seat: data.seatLabel })"
      [confirmLabel]="data.currentReporteeName ? t.get('app.dialogs.confirm-booking') : t.get('app.dialogs.book-seat-btn')"
      [dismissLabel]="t.get('app.common.cancel')"
      (confirmed)="onConfirm()"
      (dismissed)="onDismiss()"
    >
      @if (data.currentReporteeName) {
        <span [innerHTML]="t.get('app.dialogs.book-seat-self', { name: data.currentReporteeName, seat: data.seatLabel, date: data.date })"></span>
      } @else {
        <p [innerHTML]="t.get('app.dialogs.book-seat-select', { seat: data.seatLabel, date: data.date })"></p>
        <mat-form-field hyFormField style="width:100%">
          <mat-label>{{ 'app.common.member' | transloco }}</mat-label>
          <hy-combo-box
            [options]="filteredReportees()"
            [displayWith]="displayReporteeName"
            [value]="selectedReportee()"
            (valueChange)="selectedReportee.set($event)"
            (filterChange)="reporteeFilter.set($event)"
          ></hy-combo-box>
        </mat-form-field>
      }
    </hy-dialog>
  `,
})
export class BookSeatDialogComponent {
  selectedReportee = signal<ReporteeResponse | null>(null);
  reporteeFilter = signal('');
  displayReporteeName = (r: ReporteeResponse): string => r?.friendlyName ?? '';

  filteredReportees = computed(() => {
    const filter = this.reporteeFilter().toLowerCase();
    return filter
      ? this.data.reportees.filter(r => r.friendlyName.toLowerCase().includes(filter))
      : this.data.reportees;
  });

  canConfirm = computed(() => !!this.data.currentReporteeName || !!this.selectedReportee());

  constructor(
    private dialogRef: MatDialogRef<BookSeatDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BookSeatDialogData,
    public t: HyTranslateService,
  ) {}

  onConfirm(): void {
    if (this.data.currentReporteeName) {
      this.dialogRef.close({ reportee: null } as any);
    } else {
      const reportee = this.selectedReportee();
      if (reportee) this.dialogRef.close({ reportee } as BookSeatDialogResult);
    }
  }

  onDismiss(): void {
    this.dialogRef.close(null);
  }
}
