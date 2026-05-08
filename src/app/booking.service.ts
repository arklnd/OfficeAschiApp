import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Availability, Booking } from './models';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private baseUrl = '/api';

  constructor(private http: HttpClient) {}

  getAvailability(date: string): Observable<Availability> {
    return this.http.get<Availability>(`${this.baseUrl}/availability`, {
      params: { date },
    });
  }

  getBookings(date: string): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.baseUrl}/bookings`, {
      params: { date },
    });
  }

  createBooking(date: string, personId: number, seatId: number): Observable<Booking> {
    return this.http.post<Booking>(`${this.baseUrl}/bookings`, {
      date,
      person_id: personId,
      seat_id: seatId,
    });
  }

  deleteBooking(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/bookings/${id}`);
  }
}
