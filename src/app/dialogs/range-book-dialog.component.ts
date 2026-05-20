import { Component, Inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { HyDialogModule } from '@hyland/ui/dialog';
import { HyMaterialFormFieldModule, HyMaterialIconModule } from '@hyland/ui/material';
import { HyComboBoxModule } from '@hyland/ui/combo-box';
import { HyTagModule } from '@hyland/ui/tag';
import { HyTranslateModule, HyTranslateService } from '@hyland/ui/language';
import { ReporteeResponse, SeatResponse, RangeBookingResponse } from '../models';

export interface RangeBookDialogData {
  seats: SeatResponse[];
  currentReporteeName: string | null;
  reportees: ReporteeResponse[];
  defaultDate: string;
}

export interface RangeBookDialogResult {
  reportee: ReporteeResponse | null;
  seatId: number;
  from: string;
  to: string;
}

@Component({
  selector: 'app-range-book-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    HyDialogModule, MatFormFieldModule, MatInputModule,
    MatDatepickerModule, MatNativeDateModule, MatIconModule, MatProgressBarModule,
    HyMaterialFormFieldModule, HyMaterialIconModule,
    HyComboBoxModule, HyTagModule, HyTranslateModule,
  ],
  template: `
    <hy-dialog
      [header]="t.get('app.dialogs.range-book-header')"
      [confirmLabel]="t.get('app.dialogs.range-book-confirm')"
      [dismissLabel]="t.get('app.common.cancel')"
      (confirmed)="onConfirm()"
      (dismissed)="onDismiss()"
    >
      @if (!data.currentReporteeName) {
        <p>{{ 'app.dialogs.range-book-select' | transloco }}</p>
        <mat-form-field hyFormField style="width:100%">
          <mat-label>{{ 'app.dialogs.range-book-member' | transloco }}</mat-label>
          <hy-combo-box
            [options]="filteredReportees()"
            [displayWith]="displayReporteeName"
            [value]="selectedReportee()"
            (valueChange)="selectedReportee.set($event)"
            (filterChange)="reporteeFilter.set($event)"
          ></hy-combo-box>
        </mat-form-field>
      } @else {
        <p>{{ 'app.dialogs.range-book-booking-as' | transloco }} <strong>{{ data.currentReporteeName }}</strong></p>
      }

      <mat-form-field hyFormField style="width:100%; margin-bottom: 8px">
        <mat-label>{{ 'app.dialogs.range-book-seat' | transloco }}</mat-label>
        <hy-combo-box
          [options]="filteredSeats()"
          [displayWith]="displaySeatLabel"
          [value]="selectedSeat()"
          (valueChange)="selectedSeat.set($event)"
          (filterChange)="seatFilter.set($event)"
        ></hy-combo-box>
      </mat-form-field>

      <mat-form-field hyFormField style="width: 100%; margin-bottom: 8px">
        <mat-label>{{ 'app.dialogs.range-book-date-range' | transloco }}</mat-label>
        <mat-date-range-input [rangePicker]="rangePicker">
          <input matStartDate [value]="fromDate()" [placeholder]="'app.dialogs.range-book-start' | transloco" (dateChange)="onFromChange($event)">
          <input matEndDate [value]="toDate()" [placeholder]="'app.dialogs.range-book-end' | transloco" (dateChange)="onToChange($event)">
        </mat-date-range-input>
        <mat-datepicker-toggle matSuffix [for]="rangePicker"></mat-datepicker-toggle>
        <mat-date-range-picker #rangePicker></mat-date-range-picker>
      </mat-form-field>

      @if (dayCount() > 0) {
        <p style="opacity: 0.7; font-size: 13px; margin: 0">
          {{ t.get('app.dialogs.range-book-days-selected', { count: dayCount() }) }}
        </p>
      }
      @if (dayCount() > 90) {
        <p style="color: #e57373; font-size: 13px; margin: 4px 0 0">
          {{ 'app.dialogs.range-book-max-days' | transloco }}
        </p>
      }
    </hy-dialog>
  `,
})
export class RangeBookDialogComponent {
  selectedReportee = signal<ReporteeResponse | null>(null);
  reporteeFilter = signal('');
  selectedSeat = signal<SeatResponse | null>(null);
  seatFilter = signal('');

  fromDate = signal<Date>(new Date());
  toDate = signal<Date>(new Date());

  displayReporteeName = (r: ReporteeResponse): string => r?.friendlyName ?? '';
  displaySeatLabel = (s: SeatResponse): string => s?.label ?? '';

  filteredReportees = computed(() => {
    const f = this.reporteeFilter().toLowerCase();
    return f ? this.data.reportees.filter(r => r.friendlyName.toLowerCase().includes(f)) : this.data.reportees;
  });

  filteredSeats = computed(() => {
    const f = this.seatFilter().toLowerCase();
    return f ? this.data.seats.filter(s => s.label.toLowerCase().includes(f)) : this.data.seats;
  });

  dayCount = computed(() => {
    const from = this.fromDate();
    const to = this.toDate();
    if (!from || !to) return 0;
    return Math.floor((to.getTime() - from.getTime()) / 86400000) + 1;
  });

  canConfirm = computed(() => {
    const hasIdentity = !!this.data.currentReporteeName || !!this.selectedReportee();
    const hasSeat = !!this.selectedSeat();
    const validRange = this.dayCount() > 0 && this.dayCount() <= 90;
    return hasIdentity && hasSeat && validRange;
  });

  constructor(
    private dialogRef: MatDialogRef<RangeBookDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RangeBookDialogData,
    public t: HyTranslateService,
  ) {
    this.fromDate.set(this.parseDate(data.defaultDate));
    this.toDate.set(this.addDays(this.parseDate(data.defaultDate), 4));
  }

  onFromChange(event: any): void {
    if (event.value) {
      this.fromDate.set(event.value);
      if (this.toDate() < event.value) this.toDate.set(event.value);
    }
  }

  onToChange(event: any): void {
    if (event.value) this.toDate.set(event.value);
  }

  onConfirm(): void {
    this.dialogRef.close({
      reportee: this.selectedReportee(),
      seatId: this.selectedSeat()!.id,
      from: this.formatDate(this.fromDate()),
      to: this.formatDate(this.toDate()),
    } as RangeBookDialogResult);
  }

  onDismiss(): void { this.dialogRef.close(null); }

  private parseDate(s: string): Date { return new Date(s + 'T00:00:00'); }
  private addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
  private formatDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
