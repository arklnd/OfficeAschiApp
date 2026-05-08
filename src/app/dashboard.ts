import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { HyComboBoxModule } from '@hyland/ui/combo-box';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HyToastService, HyToastModule } from '@hyland/ui/toast';
import { HyMaterialFormFieldModule, HyMaterialButtonModule, HyMaterialIconModule } from '@hyland/ui/material';
import { HyTagModule } from '@hyland/ui/tag';
import { HyFeedbackIconModule } from '@hyland/ui/feedback-icon';
import { HyUserProfileModule } from '@hyland/ui/user-profile';
import { HyGhostModule } from '@hyland/ui/ghost';
import { HyShellModule } from '@hyland/ui-shell';
import { MatDialog } from '@angular/material/dialog';
import { configureHyDialogOptions } from '@hyland/ui/dialog';

import { BookingService } from './booking.service';
import { ConfirmDialogComponent } from './confirm-dialog';
import { Availability, BookedSeat, Person } from './models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    HyComboBoxModule,
    MatDatepickerModule,
    MatInputModule,
    MatIconModule,
    MatNativeDateModule,
    MatTooltipModule,
    HyToastModule,
    HyMaterialFormFieldModule,
    HyMaterialButtonModule,
    HyMaterialIconModule,
    HyTagModule,
    HyFeedbackIconModule,
    HyUserProfileModule,
    HyGhostModule,
    HyShellModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  selectedDate = signal<string>(this.todayString());
  availability = signal<Availability | null>(null);
  loading = signal(false);

  selectedPerson = signal<Person | null>(null);
  bookingSeatId = signal<number | null>(null);
  personFilter = signal('');

  displayPersonName = (person: Person): string => person?.name ?? '';

  filteredPeople = computed(() => {
    const filter = this.personFilter().toLowerCase();
    const people = this.notComing();
    return filter ? people.filter(p => p.name.toLowerCase().includes(filter)) : people;
  });

  readonly profileColors = ['blue', 'teal', 'purple', 'green', 'orange', 'cyan', 'pink', 'red'] as const;
  readonly profileSize = 'small' as any;
  readonly profileGroupSize = 'small' as any;

  bookedSeats = computed(() => this.availability()?.booked ?? []);
  availableSeats = computed(() => this.availability()?.available_seats ?? []);
  notComing = computed(() => this.availability()?.people_not_coming ?? []);
  bookedCount = computed(() => this.availability()?.booked_count ?? 0);
  availableCount = computed(() => this.availability()?.available_count ?? 0);
  totalSeats = computed(() => this.availability()?.total_seats ?? 0);

  displayDay = computed(() => {
    const d = this.dateAsDate;
    return d.getDate();
  });

  displayMonth = computed(() => {
    const d = this.dateAsDate;
    return d.toLocaleDateString('en-US', { month: 'short' });
  });

  displayDayOfWeek = computed(() => {
    const d = this.dateAsDate;
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  });

  displayYear = computed(() => {
    const d = this.dateAsDate;
    return d.getFullYear();
  });

  isToday = computed(() => this.selectedDate() === this.todayString());

  allSeats = computed(() => {
    const booked = this.bookedSeats()
      .filter(b => b.type !== 'adhoc')
      .map(b => ({
        label: b.label,
        status: 'booked' as const,
        personName: b.person_name,
        seatId: b.seat_id,
      }));
    const available = this.availableSeats()
      .filter(s => s.type !== 'adhoc')
      .map(s => ({
        label: s.label,
        status: 'available' as const,
        personName: '',
        seatId: s.id,
      }));
    return [...booked, ...available];
  });

  constructor(
    private bookingService: BookingService,
    private toastService: HyToastService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadAvailability();
  }

  onDateChange(event: any): void {
    const date: Date = event.value;
    if (date) {
      this.selectedDate.set(this.formatDate(date));
      this.loadAvailability();
    }
  }

  get dateAsDate(): Date {
    return new Date(this.selectedDate() + 'T00:00:00');
  }

  goToPreviousDay(): void {
    const d = this.dateAsDate;
    d.setDate(d.getDate() - 1);
    this.selectedDate.set(this.formatDate(d));
    this.loadAvailability();
  }

  goToNextDay(): void {
    const d = this.dateAsDate;
    d.setDate(d.getDate() + 1);
    this.selectedDate.set(this.formatDate(d));
    this.loadAvailability();
  }

  goToToday(): void {
    this.selectedDate.set(this.todayString());
    this.loadAvailability();
  }

  loadAvailability(): void {
    this.loading.set(true);
    this.bookingService.getAvailability(this.selectedDate()).subscribe({
      next: (data) => {
        this.availability.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.showToast('Failed to load availability', true);
        this.loading.set(false);
      },
    });
  }

  confirmBooking(seatId: number, seatLabel: string): void {
    const person = this.selectedPerson();
    if (!person) {
      this.showToast('Select a person to assign', true);
      return;
    }

    this.bookingService.createBooking(this.selectedDate(), person.id, seatId).subscribe({
      next: () => {
        this.showToast(`Booked ${person.name} → ${seatLabel} on ${this.selectedDate()}`);
        this.selectedPerson.set(null);
        this.bookingSeatId.set(null);
        this.loadAvailability();
      },
      error: (err) => {
        const msg = err.error?.error ?? 'Failed to book seat';
        this.showToast(msg, true);
      },
    });
  }

  cancelBookingByRow(row: { seatId: number; label: string; personName: string }): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, configureHyDialogOptions({
      data: {
        personName: row.personName,
        seatLabel: row.label,
        date: this.selectedDate(),
      },
    }));

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.bookingService.getBookings(this.selectedDate()).subscribe({
        next: (bookings) => {
          const booking = bookings.find((b) => b.seat_id === row.seatId);
          if (!booking) {
            this.showToast('Booking not found', true);
            return;
          }
          this.bookingService.deleteBooking(booking.id).subscribe({
            next: () => {
              this.showToast(`Cancelled ${row.personName}'s booking on ${row.label} for ${this.selectedDate()}`);
              this.loadAvailability();
            },
            error: () => this.showToast('Failed to cancel booking', true),
          });
        },
      });
    });
  }

  private todayString(): string {
    return this.formatDate(new Date());
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private showToast(message: string, isError = false): void {
    if (isError) {
      this.toastService.error(message, { duration: 3000, canBeDismissed: true });
    } else {
      this.toastService.success(message, { duration: 3000, canBeDismissed: true });
    }
  }
}
