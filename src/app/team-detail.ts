import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog } from '@angular/material/dialog';
import { HyMaterialFormFieldModule, HyMaterialButtonModule, HyMaterialIconModule } from '@hyland/ui/material';
import { HyShellModule } from '@hyland/ui-shell';
import { HyTagModule } from '@hyland/ui/tag';
import { HyGhostModule } from '@hyland/ui/ghost';
import { HyToastService, HyToastModule } from '@hyland/ui/toast';
import { HyUserProfileModule } from '@hyland/ui/user-profile';
import { HyFeedbackIconModule } from '@hyland/ui/feedback-icon';
import { HyErrorLayoutModule } from '@hyland/ui/error-layout';
import { HyComboBoxModule } from '@hyland/ui/combo-box';
import { configureHyDialogOptions } from '@hyland/ui/dialog';
import { forkJoin } from 'rxjs';
import { ApiService } from './booking.service';
import {
  TeamResponse, SeatResponse, ReporteeResponse,
  AvailabilityResponse, BookingResponse, WaitlistInfo,
} from './models';
import { ConfirmDialogComponent } from './confirm-dialog';
import { JoinTeamDialogComponent } from './join-team';
import { TotpService } from './totp.service';

@Component({
  selector: 'app-team-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatCardModule,
    MatFormFieldModule, MatInputModule, MatIconModule,
    MatDatepickerModule, MatNativeDateModule, MatTooltipModule, MatTabsModule,
    HyMaterialFormFieldModule, HyMaterialButtonModule, HyMaterialIconModule,
    HyShellModule, HyTagModule, HyGhostModule, HyToastModule,
    HyUserProfileModule, HyFeedbackIconModule, HyErrorLayoutModule, HyComboBoxModule,
  ],
  templateUrl: './team-detail.html',
  styleUrl: './team-detail.scss',
})
export class TeamDetailComponent implements OnInit {
  teamId = 0;
  team = signal<TeamResponse | null>(null);
  seats = signal<SeatResponse[]>([]);
  reportees = signal<ReporteeResponse[]>([]);
  availability = signal<AvailabilityResponse | null>(null);
  loading = signal(false);
  notFound = signal(false);
  selectedDate = signal<string>(this.todayString());

  // Manager actions
  newSeatLabel = '';
  addingSeat = signal(false);

  // Reportee identity (from localStorage)
  currentReporteeId = signal<number | null>(null);

  // Inline booking state
  bookingSeatId = signal<number | null>(null);
  selectedReportee = signal<ReporteeResponse | null>(null);
  reporteeFilter = signal('');
  displayReporteeName = (r: ReporteeResponse): string => r?.friendlyName ?? '';

  readonly profileColors = ['blue', 'teal', 'purple', 'green', 'orange', 'cyan', 'pink', 'red'] as const;
  readonly profileSize = 'small' as any;

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

  filteredReportees = computed(() => {
    const filter = this.reporteeFilter().toLowerCase();
    const bookedIds = new Set(this.bookedSeats().map(b => b.reporteeId));
    const available = this.approvedReportees().filter(r => !bookedIds.has(r.id));
    return filter ? available.filter(r => r.friendlyName.toLowerCase().includes(filter)) : available;
  });

  displayDay = computed(() => new Date(this.selectedDate() + 'T00:00:00').getDate());
  displayMonth = computed(() => new Date(this.selectedDate() + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' }));
  displayDayOfWeek = computed(() => new Date(this.selectedDate() + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }));
  displayYear = computed(() => new Date(this.selectedDate() + 'T00:00:00').getFullYear());
  isToday = computed(() => this.selectedDate() === this.todayString());

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private api: ApiService,
    private toastService: HyToastService,
    private dialog: MatDialog,
    private totpService: TotpService,
  ) {}

  ngOnInit(): void {
    this.teamId = Number(this.route.snapshot.paramMap.get('id'));
    const savedId = localStorage.getItem(`reportee_${this.teamId}`);
    if (savedId) this.currentReporteeId.set(Number(savedId));
    this.loadAll();
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
          this.toastService.error('Failed to load team data');
        }
      },
    });
  }

  loadAvailability(): void {
    this.api.getAvailability(this.teamId, this.selectedDate()).subscribe({
      next: a => { this.availability.set(a); this.loading.set(false); },
      error: () => { this.toastService.error('Failed to load availability'); this.loading.set(false); },
    });
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
  addSeat(): void {
    if (!this.newSeatLabel.trim()) return;
    this.addingSeat.set(true);
    this.api.addSeat(this.teamId, { label: this.newSeatLabel.trim() }, this.team()?.name).subscribe({
      next: seat => {
        this.toastService.success(`Seat "${seat.label}" added`);
        this.newSeatLabel = '';
        this.addingSeat.set(false);
        this.loadAll();
      },
      error: err => {
        this.toastService.error(err.error?.error || 'Failed to add seat');
        this.addingSeat.set(false);
      },
    });
  }

  approveReportee(reporteeId: number): void {
    this.api.approveReportee(this.teamId, reporteeId, this.team()?.name).subscribe({
      next: () => { this.toastService.success('Reportee approved'); this.loadAll(); },
      error: err => this.toastService.error(err.error?.error || 'Failed to approve'),
    });
  }

  // --- Reportee actions ---
  confirmBooking(seatId: number, seatLabel: string): void {
    const rid = this.currentReporteeId();
    const reportee = this.selectedReportee();
    const resolvedId = rid ?? reportee?.id;
    const resolvedName = rid
      ? (this.reportees().find(r => r.id === rid)?.friendlyName ?? '')
      : (reportee?.friendlyName ?? '');

    if (!resolvedId) { this.toastService.error('Select a member to assign'); return; }

    this.api.bookSeat({ reporteeId: resolvedId, seatId, date: this.selectedDate() }, resolvedId, resolvedName).subscribe({
      next: b => {
        this.toastService.success(`Booked ${resolvedName} on ${seatLabel} for ${this.selectedDate()}`);
        this.selectedReportee.set(null);
        this.bookingSeatId.set(null);
        this.loadAvailability();
      },
      error: err => this.toastService.error(err.error?.error || 'Booking failed'),
    });
  }

  cancelBooking(booking: BookingResponse): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, configureHyDialogOptions({
      data: { personName: booking.reporteeName, seatLabel: booking.seatLabel, date: booking.date },
    }));
    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.api.cancelBooking(booking.id, booking.reporteeId, booking.reporteeName).subscribe({
        next: () => { this.toastService.success(`Cancelled ${booking.reporteeName}'s booking on ${booking.seatLabel} for ${booking.date}`); this.loadAvailability(); },
        error: err => this.toastService.error(err.error?.error || 'Cancel failed'),
      });
    });
  }

  waitlistSeat(seatId: number): void {
    const rid = this.currentReporteeId();
    const reportee = this.selectedReportee();
    const resolvedId = rid ?? reportee?.id;
    const resolvedName = rid
      ? (this.reportees().find(r => r.id === rid)?.friendlyName ?? '')
      : (reportee?.friendlyName ?? '');

    if (!resolvedId) { this.toastService.error('Select a member'); return; }

    this.api.bookSeat({ reporteeId: resolvedId, seatId, date: this.selectedDate() }, resolvedId, resolvedName).subscribe({
      next: b => {
        this.toastService.success(`Waitlisted ${resolvedName} for ${b.seatLabel}`);
        this.selectedReportee.set(null);
        this.loadAvailability();
      },
      error: err => this.toastService.error(err.error?.error || 'Waitlist failed'),
    });
  }

  openJoinDialog(): void {
    const savedId = localStorage.getItem(`reportee_${this.teamId}`);
    if (savedId) {
      this.toastService.info('You have already joined this team');
      return;
    }
    const dialogRef = this.dialog.open(JoinTeamDialogComponent, configureHyDialogOptions({
      data: { teamId: this.teamId, teamName: this.team()?.name ?? 'Team' },
      width: '500px',
    }));
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.currentReporteeId.set(result.id);
        this.loadAll();
      }
    });
  }

  private todayString(): string { return this.formatDate(new Date()); }
  private formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
