import { Component, signal, computed, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatDialog } from '@angular/material/dialog';
import { HyMaterialFormFieldModule, HyMaterialButtonModule, HyMaterialIconModule, HyMaterialTabsModule, HyMaterialListModule } from '@hyland/ui/material';
import { HyShellModule } from '@hyland/ui-shell';
import { HyTagModule } from '@hyland/ui/tag';
import { HyGhostModule } from '@hyland/ui/ghost';
import { HyToastService, HyToastModule } from '@hyland/ui/toast';
import { HyUserProfileModule } from '@hyland/ui/user-profile';
import { HyFeedbackIconModule } from '@hyland/ui/feedback-icon';
import { HyErrorLayoutModule } from '@hyland/ui/error-layout';
import { HyComboBoxModule } from '@hyland/ui/combo-box';
import { HyTranslateModule, HyTranslateService } from '@hyland/ui/language';
import { configureHyDialogOptions } from '@hyland/ui/dialog';
import { forkJoin, finalize, Subject } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../services/booking.service';
import {
  TeamResponse, SeatResponse, ReporteeResponse,
  AvailabilityResponse, BookingResponse, WaitlistInfo,
  RangeAvailabilityResponse, DateAvailabilitySummary, RangeBookingResponse,
} from '../models';
import { CancelBookConfirmDialogComponent } from '../dialogs/cancel-book-confirm-dialog.component';
import { JoinTeamDialogComponent } from '../dialogs/join-team-dialog.component';
import { BookSeatDialogComponent, BookSeatDialogData } from '../dialogs/book-seat-dialog.component';
import { RangeBookDialogComponent, RangeBookDialogData, RangeBookDialogResult } from '../dialogs/range-book-dialog.component';
import { TotpService } from '../totp/totp.service';

@Component({
  selector: 'app-team-detail',
  standalone: true,
  imports: [
    CommonModule, MatButtonModule, MatCardModule,
    MatFormFieldModule, MatInputModule, MatIconModule, MatChipsModule,
    MatDatepickerModule, MatNativeDateModule, MatTooltipModule, MatTabsModule, MatListModule,
    HyMaterialFormFieldModule, HyMaterialButtonModule, HyMaterialIconModule, HyMaterialTabsModule, HyMaterialListModule,
    HyShellModule, HyTagModule, HyGhostModule, HyToastModule,
    HyUserProfileModule, HyFeedbackIconModule, HyErrorLayoutModule, HyComboBoxModule,
    HyTranslateModule,
  ],
  templateUrl: './team-detail.component.html',
  styleUrl: './team-detail.component.scss',
})
export class TeamDetailComponent implements OnInit {
  teamId = 0;
  team = signal<TeamResponse | null>(null);
  seats = signal<SeatResponse[]>([]);
  reportees = signal<ReporteeResponse[]>([]);
  availability = signal<AvailabilityResponse | null>(null);
  loading = signal(false);
  availabilityLoading = signal(false);
  notFound = signal(false);
  selectedDate = signal<string>(this.todayString());

  // Range availability
  rangeAvailability = signal<RangeAvailabilityResponse | null>(null);
  rangeLoading = signal(false);
  showRangeView = signal(false);
  rangeFrom = signal<string>(this.todayString());
  rangeTo = signal<string>(this.addDaysStr(this.todayString(), 13));
  lastRangeBookResult = signal<RangeBookingResponse | null>(null);

  groupedRangeDays = computed(() => {
    const ra = this.rangeAvailability();
    if (!ra) return [];
    const groups: { label: string; days: DateAvailabilitySummary[] }[] = [];
    for (const day of ra.days) {
      const lbl = new Date(day.date + 'T00:00:00').toLocaleDateString(document.documentElement.lang || 'en', { month: 'long', year: 'numeric' });
      const last = groups[groups.length - 1];
      if (last && last.label === lbl) { last.days.push(day); }
      else { groups.push({ label: lbl, days: [day] }); }
    }
    return groups;
  });

  rangeDayCount = computed(() => {
    const ra = this.rangeAvailability();
    return ra ? ra.days.length : 0;
  });

  rangeDisplayLabel = computed(() => {
    const from = this.rangeFrom();
    const to = this.rangeTo();
    const f = new Date(from + 'T00:00:00');
    const t = new Date(to + 'T00:00:00');
    const locale = document.documentElement.lang || 'en';
    const fStr = f.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
    const tStr = t.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
    return `${fStr} – ${tStr}`;
  });

  private dateChange$ = new Subject<string>();

  // Manager actions
  addingSeat = signal(false);

  // Reportee identity (from localStorage)
  currentReporteeId = signal<number | null>(null);



  readonly profileColors = ['blue', 'teal', 'purple', 'green', 'orange', 'cyan', 'pink', 'red'] as const;
  readonly profileSize = 'small' as any;
  private destroyRef = inject(DestroyRef);

  approvedReportees = computed(() => this.reportees().filter(r => r.isApproved));
  pendingReportees = computed(() => this.reportees().filter(r => !r.isApproved));

  bookedSeats = computed(() => {
    const avail = this.availability();
    if (!avail) return [];
    return avail.bookings;
  });

  availableSeats = computed(() => this.availability()?.availableSeats ?? []);
  waitlist = computed(() => this.availability()?.waitlist ?? []);
  bookedCount = computed(() => this.availability()?.bookedCount ?? 0);
  availableCount = computed(() => this.availability()?.availableCount ?? 0);
  totalSeats = computed(() => this.availability()?.totalSeats ?? 0);
  waitlistedCount = computed(() => this.availability()?.waitlistedCount ?? 0);
  skeletonSlots = computed(() => Array.from({ length: this.seats().length || 4 }, (_, i) => i));

  allSeats = computed(() => {
    const booked = this.bookedSeats().map(b => ({
      label: b.seatLabel, status: 'booked' as const, personName: b.reporteeName,
      seatId: b.seatId, booking: b,
    }));
    const available = this.availableSeats().map(s => ({
      label: s.label, status: 'available' as const, personName: '',
      seatId: s.id, booking: null as BookingResponse | null,
    }));
    return [...booked, ...available];
  });



  displayDay = computed(() => new Date(this.selectedDate() + 'T00:00:00').getDate());
  displayMonth = computed(() => new Date(this.selectedDate() + 'T00:00:00').toLocaleDateString(document.documentElement.lang || 'en', { month: 'short' }));
  displayDayOfWeek = computed(() => new Date(this.selectedDate() + 'T00:00:00').toLocaleDateString(document.documentElement.lang || 'en', { weekday: 'long' }));
  displayYear = computed(() => new Date(this.selectedDate() + 'T00:00:00').getFullYear());
  isToday = computed(() => this.selectedDate() === this.todayString());

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private api: ApiService,
    private toastService: HyToastService,
    private dialog: MatDialog,
    private totpService: TotpService,
    public t: HyTranslateService,
  ) {}

  ngOnInit(): void {
    this.teamId = Number(this.route.snapshot.paramMap.get('id'));
    const savedId = localStorage.getItem(`reportee_${this.teamId}`);
    if (savedId) this.currentReporteeId.set(Number(savedId));
    this.dateChange$.pipe(
      debounceTime(250),
      switchMap(date => {
        this.availabilityLoading.set(true);
        return this.api.getAvailability(this.teamId, date);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: a => { this.availability.set(a); this.availabilityLoading.set(false); this.loading.set(false); },
      error: () => { this.toastService.error(this.t.get('app.toasts.failed-load-availability'), { duration: 30000 }); this.availabilityLoading.set(false); this.loading.set(false); },
    });
    this.loadAll();
    this.api.backendRecovered$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadAll());
  }

  loadAll(): void {
    this.loading.set(true);
    forkJoin({
      team: this.api.getTeam(this.teamId),
      seats: this.api.listSeats(this.teamId),
      reportees: this.api.listReportees(this.teamId),
    }).subscribe({
      next: ({ team, seats, reportees }) => {
        this.team.set(team);
        this.seats.set(seats);
        this.reportees.set(reportees);
        this.loadAvailability();
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.notFound.set(true);
        } else {
          this.toastService.error(this.t.get('app.toasts.failed-load-team'), { duration: 30000 });
        }
      },
    });
  }

  loadAvailability(): void {
    this.availabilityLoading.set(true);
    this.dateChange$.next(this.selectedDate());
  }

  get dateAsDate(): Date { return new Date(this.selectedDate() + 'T00:00:00'); }

  onDateChange(event: any): void {
    const date: Date = event.value;
    if (date) { this.selectedDate.set(this.formatDate(date)); this.loadAvailability(); }
  }

  goToPreviousDay(): void {
    const d = this.dateAsDate; d.setDate(d.getDate() - 1);
    this.selectedDate.set(this.formatDate(d)); this.loadAvailability();
  }

  goToNextDay(): void {
    const d = this.dateAsDate; d.setDate(d.getDate() + 1);
    this.selectedDate.set(this.formatDate(d)); this.loadAvailability();
  }

  goToToday(): void { this.selectedDate.set(this.todayString()); this.loadAvailability(); }

  // --- Manager actions ---
  addSeatFromInput(input: HTMLInputElement): void {
    const label = input.value.trim();
    if (!label) return;
    this.addingSeat.set(true);
    this.api.addSeat(this.teamId, { label }, this.team()?.name).pipe(
      finalize(() => this.addingSeat.set(false)),
    ).subscribe({
      next: seat => {
        this.toastService.success(this.t.get('app.toasts.seat-added', { label: seat.label }), { duration: 30000 });
        input.value = '';
        this.loadAll();
      },
      error: err => {
        this.toastService.error(err.error?.error || this.t.get('app.toasts.failed-add-seat'), { duration: 30000 });
      },
    });
  }

  deleteSeat(seat: SeatResponse): void {
    this.api.deleteSeat(this.teamId, seat.id, this.team()?.name).subscribe({
      next: () => {
        this.toastService.success(this.t.get('app.toasts.seat-deleted', { label: seat.label }), { duration: 30000 });
        this.loadAll();
      },
      error: err => this.toastService.error(err.error?.error || this.t.get('app.toasts.failed-delete-seat'), { duration: 30000 }),
    });
  }

  approveReportee(reporteeId: number): void {
    this.api.approveReportee(this.teamId, reporteeId, this.team()?.name).subscribe({
      next: () => { this.toastService.success(this.t.get('app.toasts.reportee-approved'), { duration: 30000 }); this.loadAll(); },
      error: err => this.toastService.error(err.error?.error || this.t.get('app.toasts.failed-approve'), { duration: 30000 }),
    });
  }

  denyReportee(reportee: ReporteeResponse): void {
    const dialogRef = this.dialog.open(CancelBookConfirmDialogComponent, configureHyDialogOptions({
      data: { personName: reportee.friendlyName, seatLabel: '', date: '', confirmTitle: this.t.get('app.dialogs.deny-join-title'), confirmMessage: this.t.get('app.dialogs.deny-join-msg', { name: reportee.friendlyName }), confirmLabel: this.t.get('app.dialogs.deny-confirm'), dismissLabel: this.t.get('app.dialogs.cancel-booking-dismiss') },
    }));
    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.api.denyReportee(this.teamId, reportee.id, this.team()?.name).subscribe({
        next: () => { this.toastService.success(this.t.get('app.toasts.denied-join', { name: reportee.friendlyName }), { duration: 30000 }); this.loadAll(); },
        error: err => this.toastService.error(err.error?.error || this.t.get('app.toasts.failed-deny'), { duration: 30000 }),
      });
    });
  }

  removeReportee(reportee: ReporteeResponse): void {
    const dialogRef = this.dialog.open(CancelBookConfirmDialogComponent, configureHyDialogOptions({
      data: { personName: reportee.friendlyName, seatLabel: '', date: '', confirmTitle: this.t.get('app.dialogs.remove-member-title'), confirmMessage: this.t.get('app.dialogs.remove-member-msg', { name: reportee.friendlyName }), confirmLabel: this.t.get('app.dialogs.remove-confirm'), dismissLabel: this.t.get('app.dialogs.cancel-booking-dismiss') },
    }));
    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.api.removeReportee(this.teamId, reportee.id, this.team()?.name).subscribe({
        next: () => { this.toastService.success(this.t.get('app.toasts.removed-member', { name: reportee.friendlyName }), { duration: 30000 }); this.loadAll(); },
        error: err => this.toastService.error(err.error?.error || this.t.get('app.toasts.failed-remove'), { duration: 30000 }),
      });
    });
  }

  deleteTeam(): void {
    const teamName = this.team()?.name ?? 'this team';
    const dialogRef = this.dialog.open(CancelBookConfirmDialogComponent, configureHyDialogOptions({
      data: { personName: teamName, seatLabel: '', date: '', confirmTitle: this.t.get('app.dialogs.delete-team-title'), confirmMessage: this.t.get('app.dialogs.delete-team-msg', { name: teamName }), confirmLabel: this.t.get('app.dialogs.delete-confirm'), dismissLabel: this.t.get('app.dialogs.cancel-booking-dismiss') },
    }));
    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.api.deleteTeam(this.teamId, teamName).subscribe({
        next: () => {
          this.toastService.success(this.t.get('app.toasts.team-deleted', { name: teamName }), { duration: 30000 });
          this.router.navigate(['/']);
        },
        error: err => this.toastService.error(err.error?.error || this.t.get('app.toasts.failed-delete-team'), { duration: 30000 }),
      });
    });
  }

  // --- Reportee actions ---
  openBookDialog(seatId: number, seatLabel: string): void {
    const rid = this.currentReporteeId();
    const currentName = rid ? (this.reportees().find(r => r.id === rid)?.friendlyName ?? null) : null;
    const bookedIds = new Set(this.bookedSeats().map(b => b.reporteeId));
    const availableReportees = this.approvedReportees().filter(r => !bookedIds.has(r.id));

    const dialogRef = this.dialog.open(BookSeatDialogComponent, configureHyDialogOptions({
      data: {
        seatLabel,
        date: this.selectedDate(),
        currentReporteeName: currentName,
        reportees: availableReportees,
      } as BookSeatDialogData,
      width: '380px',
    }));

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;
      const resolvedId = rid ?? result.reportee?.id;
      const resolvedName = currentName ?? result.reportee?.friendlyName ?? '';
      if (!resolvedId) return;

      this.api.bookSeat({ reporteeId: resolvedId, seatId, date: this.selectedDate() }, resolvedId, resolvedName).subscribe({
        next: () => {
          this.toastService.success(this.t.get('app.toasts.booked-success', { name: resolvedName, seat: seatLabel, date: this.selectedDate() }), { duration: 30000 });
          this.loadAvailability();
        },
        error: err => this.toastService.error(err.error?.error || this.t.get('app.toasts.booking-failed'), { duration: 30000 }),
      });
    });
  }

  cancelBooking(booking: BookingResponse): void {
    const dialogRef = this.dialog.open(CancelBookConfirmDialogComponent, configureHyDialogOptions({
      data: {
        personName: booking.reporteeName, seatLabel: booking.seatLabel, date: booking.date,
        confirmTitle: this.t.get('app.dialogs.cancel-booking-title'),
        confirmMessage: this.t.get('app.dialogs.cancel-booking-msg', { name: booking.reporteeName, seat: booking.seatLabel, date: booking.date }),
        confirmLabel: this.t.get('app.dialogs.cancel-booking-confirm'),
        dismissLabel: this.t.get('app.dialogs.cancel-booking-dismiss'),
      },
    }));
    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.api.cancelBooking(booking.id, booking.reporteeId, booking.reporteeName).subscribe({
        next: () => { this.toastService.success(this.t.get('app.toasts.cancelled-booking', { name: booking.reporteeName, seat: booking.seatLabel, date: booking.date }), { duration: 30000 }); this.loadAvailability(); },
        error: err => this.toastService.error(err.error?.error || this.t.get('app.toasts.cancel-failed'), { duration: 30000 }),
      });
    });
  }

  waitlistSeat(seatId: number, seatLabel: string): void {
    const rid = this.currentReporteeId();
    const currentName = rid ? (this.reportees().find(r => r.id === rid)?.friendlyName ?? null) : null;
    const bookedIds = new Set(this.bookedSeats().map(b => b.reporteeId));
    const availableReportees = this.approvedReportees().filter(r => !bookedIds.has(r.id));

    const dialogRef = this.dialog.open(BookSeatDialogComponent, configureHyDialogOptions({
      data: {
        seatLabel,
        date: this.selectedDate(),
        currentReporteeName: currentName,
        reportees: availableReportees,
      } as BookSeatDialogData,
      width: '380px',
    }));

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;
      const resolvedId = rid ?? result.reportee?.id;
      const resolvedName = currentName ?? result.reportee?.friendlyName ?? '';
      if (!resolvedId) return;

      this.api.bookSeat({ reporteeId: resolvedId, seatId, date: this.selectedDate() }, resolvedId, resolvedName).subscribe({
        next: b => {
          this.toastService.success(this.t.get('app.toasts.waitlisted', { name: resolvedName, seat: b.seatLabel }), { duration: 30000 });
          this.loadAvailability();
        },
        error: err => this.toastService.error(err.error?.error || this.t.get('app.toasts.booking-failed'), { duration: 30000 }),
      });
    });
  }

  copyTeamUrl(): void {
    const url = `${location.origin}/team/${this.teamId}`;
    navigator.clipboard.writeText(url).then(() => {
      this.toastService.success(this.t.get('app.toasts.team-link-copied'), { duration: 30000 });
    });
  }

  openJoinDialog(): void {
    const savedId = localStorage.getItem(`reportee_${this.teamId}`);
    if (savedId) {
      this.toastService.info(this.t.get('app.toasts.already-joined'), { duration: 30000 });
      return;
    }
    const dialogRef = this.dialog.open(JoinTeamDialogComponent, configureHyDialogOptions({
      data: { teamId: this.teamId, teamName: this.team()?.name ?? 'Team' },
      width: '360px',
    }));
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.currentReporteeId.set(result.id);
        this.loadAll();
      }
    });
  }

  cancelWaitlist(w: WaitlistInfo): void {
    const reporteeId = w.reporteeId || this.reportees().find(r => r.friendlyName === w.reporteeName)?.id;
    if (!reporteeId) {
      this.toastService.error(this.t.get('app.toasts.cannot-identify-reportee'), { duration: 30000 });
      return;
    }
    const dialogRef = this.dialog.open(CancelBookConfirmDialogComponent, configureHyDialogOptions({
      data: {
        personName: w.reporteeName, seatLabel: w.desiredSeatLabel, date: this.selectedDate(),
        confirmTitle: this.t.get('app.dialogs.cancel-booking-title'),
        confirmMessage: this.t.get('app.dialogs.cancel-booking-msg', { name: w.reporteeName, seat: w.desiredSeatLabel, date: this.selectedDate() }),
        confirmLabel: this.t.get('app.dialogs.cancel-booking-confirm'),
        dismissLabel: this.t.get('app.dialogs.cancel-booking-dismiss'),
      },
    }));
    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.api.cancelBooking(w.bookingId, reporteeId, w.reporteeName).subscribe({
        next: () => {
          this.toastService.success(this.t.get('app.toasts.removed-waitlist', { name: w.reporteeName, seat: w.desiredSeatLabel }), { duration: 30000 });
          this.loadAvailability();
        },
        error: err => this.toastService.error(err.error?.error || this.t.get('app.toasts.failed-cancel-waitlist'), { duration: 30000 }),
      });
    });
  }

  private todayString(): string { return this.formatDate(new Date()); }
  private formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  private addDaysStr(dateStr: string, n: number): string {
    const d = new Date(dateStr + 'T00:00:00'); d.setDate(d.getDate() + n); return this.formatDate(d);
  }

  // --- Range Availability ---
  toggleRangeView(): void {
    this.showRangeView.update(v => !v);
    if (this.showRangeView() && !this.rangeAvailability()) this.loadRangeAvailability();
  }

  onRangeFromChange(event: any): void {
    const d: Date = event.value;
    if (d) { this.rangeFrom.set(this.formatDate(d)); this.loadRangeAvailability(); }
  }
  onRangeToChange(event: any): void {
    const d: Date = event.value;
    if (d) { this.rangeTo.set(this.formatDate(d)); this.loadRangeAvailability(); }
  }

  loadRangeAvailability(): void {
    this.rangeLoading.set(true);
    this.api.getAvailabilityRange(this.teamId, this.rangeFrom(), this.rangeTo()).subscribe({
      next: r => { this.rangeAvailability.set(r); this.rangeLoading.set(false); },
      error: err => {
        this.toastService.error(err.error?.error || this.t.get('app.range.failed-range-availability'), { duration: 30000 });
        this.rangeLoading.set(false);
      },
    });
  }

  jumpToDate(date: string): void {
    this.selectedDate.set(date);
    // this.showRangeView.set(false);
    this.loadAvailability();
  }

  isWeekend(dateStr: string): boolean {
    const day = new Date(dateStr + 'T00:00:00').getDay();
    return day === 0 || day === 6;
  }

  dayOfWeekShort(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(document.documentElement.lang || 'en', { weekday: 'short' });
  }

  dayOfMonth(dateStr: string): number {
    return new Date(dateStr + 'T00:00:00').getDate();
  }

  monthLabel(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(document.documentElement.lang || 'en', { month: 'short', year: 'numeric' });
  }

  // --- Range Booking ---
  openRangeBookDialog(): void {
    const rid = this.currentReporteeId();
    const currentName = rid ? (this.reportees().find(r => r.id === rid)?.friendlyName ?? null) : null;
    const bookedIds = new Set(this.bookedSeats().map(b => b.reporteeId));
    const availableReportees = this.approvedReportees().filter(r => !bookedIds.has(r.id));

    const dialogRef = this.dialog.open(RangeBookDialogComponent, configureHyDialogOptions({
      data: {
        seats: this.seats(),
        currentReporteeName: currentName,
        reportees: availableReportees,
        defaultDate: this.selectedDate(),
      } as RangeBookDialogData,
      width: '440px',
    }));

    dialogRef.afterClosed().subscribe((result: RangeBookDialogResult | null) => {
      if (!result) return;
      const resolvedId = rid ?? result.reportee?.id;
      const resolvedName = currentName ?? result.reportee?.friendlyName ?? '';
      if (!resolvedId) return;

      this.api.bookSeatRange(
        { reporteeId: resolvedId, seatId: result.seatId, from: result.from, to: result.to },
        resolvedId, resolvedName,
      ).subscribe({
        next: res => {
          this.lastRangeBookResult.set(res);
          const msg = this.t.get('app.range.range-booked-success', { seat: res.seatLabel, name: resolvedName, confirmed: res.confirmedCount, waitlisted: res.waitlistedCount, failed: res.failedCount });
          if (res.failedCount > 0) {
            this.toastService.warning(msg, { duration: 30000 });
          } else {
            this.toastService.success(msg, { duration: 30000 });
          }
          this.loadAvailability();
          if (this.showRangeView()) this.loadRangeAvailability();
        },
        error: err => this.toastService.error(err.error?.error || this.t.get('app.range.range-booking-failed'), { duration: 30000 }),
      });
    });
  }

  dismissRangeResult(): void { this.lastRangeBookResult.set(null); }
}
