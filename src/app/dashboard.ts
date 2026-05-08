import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatListModule } from '@angular/material/list';
import { HyToastService, HyToastModule } from '@hyland/ui/toast';
import { HyMaterialFormFieldModule, HyMaterialButtonModule, HyMaterialListModule } from '@hyland/ui/material';
import { HyContentListModule } from '@hyland/ui/content-list';
import { HyTagModule } from '@hyland/ui/tag';
import { HyFeedbackIconModule } from '@hyland/ui/feedback-icon';
import { HyShellModule } from '@hyland/ui-shell';

import { BookingService } from './booking.service';
import { Availability, BookedSeat, Seat } from './models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatInputModule,
    MatIconModule,
    MatNativeDateModule,
    MatTooltipModule,
    MatListModule,
    HyToastModule,
    HyMaterialFormFieldModule,
    HyMaterialButtonModule,
    HyMaterialListModule,
    HyContentListModule,
    HyTagModule,
    HyFeedbackIconModule,
    HyShellModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  selectedDate = signal<string>(this.todayString());
  availability = signal<Availability | null>(null);
  loading = signal(false);

  selectedPersonId = signal<number | null>(null);
  selectedSeatId = signal<number | null>(null);

  bookedSeats = computed(() => this.availability()?.booked ?? []);
  availableSeats = computed(() => this.availability()?.available_seats ?? []);
  notComing = computed(() => this.availability()?.people_not_coming ?? []);
  bookedCount = computed(() => this.availability()?.booked_count ?? 0);
  availableCount = computed(() => this.availability()?.available_count ?? 0);
  totalSeats = computed(() => this.availability()?.total_seats ?? 0);

  allSeats = computed(() => {
    const booked = this.bookedSeats().map(b => ({
      label: b.label,
      type: b.type,
      status: 'booked' as const,
      personName: b.person_name,
      seatId: b.seat_id,
    }));
    const available = this.availableSeats().map(s => ({
      label: s.label,
      type: s.type,
      status: 'available' as const,
      personName: '',
      seatId: s.id,
    }));
    return [...booked, ...available];
  });

  constructor(
    private bookingService: BookingService,
    private toastService: HyToastService,
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

  bookSeat(): void {
    const personId = this.selectedPersonId();
    const seatId = this.selectedSeatId();
    if (!personId || !seatId) {
      this.showToast('Select a person and seat', true);
      return;
    }

    this.bookingService.createBooking(this.selectedDate(), personId, seatId).subscribe({
      next: () => {
        this.showToast('Seat booked!');
        this.selectedPersonId.set(null);
        this.selectedSeatId.set(null);
        this.loadAvailability();
      },
      error: (err) => {
        const msg = err.error?.error ?? 'Failed to book seat';
        this.showToast(msg, true);
      },
    });
  }

  cancelBooking(seat: BookedSeat): void {
    this.bookingService.getBookings(this.selectedDate()).subscribe({
      next: (bookings) => {
        const booking = bookings.find((b) => b.seat_id === seat.seat_id);
        if (!booking) {
          this.showToast('Booking not found', true);
          return;
        }
        this.bookingService.deleteBooking(booking.id).subscribe({
          next: () => {
            this.showToast('Booking cancelled');
            this.loadAvailability();
          },
          error: () => this.showToast('Failed to cancel booking', true),
        });
      },
    });
  }

  cancelBookingByRow(row: { seatId: number }): void {
    this.bookingService.getBookings(this.selectedDate()).subscribe({
      next: (bookings) => {
        const booking = bookings.find((b) => b.seat_id === row.seatId);
        if (!booking) {
          this.showToast('Booking not found', true);
          return;
        }
        this.bookingService.deleteBooking(booking.id).subscribe({
          next: () => {
            this.showToast('Booking cancelled');
            this.loadAvailability();
          },
          error: () => this.showToast('Failed to cancel booking', true),
        });
      },
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
