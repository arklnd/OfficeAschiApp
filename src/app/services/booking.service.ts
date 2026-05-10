import { Injectable, signal, OnDestroy } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import {
  TeamSearchResult, TeamResponse, CreateTeamRequest,
  SeatResponse, AddSeatRequest, ReporteeResponse, JoinTeamRequest,
  BookSeatRequest, BookingResponse, AvailabilityResponse,
} from '../models';
import { TOTP_ENTITY_TYPE, TOTP_ENTITY_ID, TOTP_ENTITY_NAME, TOTP_ACTION_REASON } from '../totp/totp.context';

@Injectable({ providedIn: 'root' })
export class ApiService implements OnDestroy {
  private base = '/api';

  /** Reactive health state — components can read this signal */
  readonly backendDown = signal(false);

  /** Emits when backend transitions from down → up */
  readonly backendRecovered$ = new Subject<void>();

  private healthTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private http: HttpClient) {
    this.pollHealth();
  }

  ngOnDestroy(): void {
    if (this.healthTimer) clearTimeout(this.healthTimer);
  }

  private pollHealth(): void {
    this.checkHealth().subscribe({
      next: () => {
        const wasDown = this.backendDown();
        this.backendDown.set(false);
        if (wasDown) this.backendRecovered$.next();
      },
      error: () => this.backendDown.set(true),
    });
    const delay = this.backendDown() ? 10_000 : 30_000;
    this.healthTimer = setTimeout(() => this.pollHealth(), delay);
  }

  private managerCtx(teamId: number, teamName = '', reason = ''): { context: HttpContext } {
    return { context: new HttpContext().set(TOTP_ENTITY_TYPE, 'manager').set(TOTP_ENTITY_ID, teamId).set(TOTP_ENTITY_NAME, teamName).set(TOTP_ACTION_REASON, reason) };
  }

  private reporteeCtx(reporteeId: number, reporteeName = '', reason = ''): { context: HttpContext } {
    return { context: new HttpContext().set(TOTP_ENTITY_TYPE, 'reportee').set(TOTP_ENTITY_ID, reporteeId).set(TOTP_ENTITY_NAME, reporteeName).set(TOTP_ACTION_REASON, reason) };
  }

  // Teams
  searchTeams(q?: string): Observable<TeamSearchResult[]> {
    return this.http.get<TeamSearchResult[]>(`${this.base}/teams`, { params: q ? { q } : {} });
  }
  getTeam(id: number): Observable<TeamResponse> {
    return this.http.get<TeamResponse>(`${this.base}/teams/${id}`);
  }
  createTeam(req: CreateTeamRequest): Observable<TeamResponse> {
    return this.http.post<TeamResponse>(`${this.base}/teams`, req);
  }
  deleteTeam(id: number, teamName = ''): Observable<unknown> {
    return this.http.delete(`${this.base}/teams/${id}`, this.managerCtx(id, teamName, 'app.dialogs.reason-delete-team'));
  }

  // Seats
  listSeats(teamId: number): Observable<SeatResponse[]> {
    return this.http.get<SeatResponse[]>(`${this.base}/teams/${teamId}/seats`);
  }
  addSeat(teamId: number, req: AddSeatRequest, teamName = ''): Observable<SeatResponse> {
    return this.http.post<SeatResponse>(`${this.base}/teams/${teamId}/seats`, req, this.managerCtx(teamId, teamName, 'app.dialogs.reason-add-seat'));
  }
  deleteSeat(teamId: number, seatId: number, teamName = ''): Observable<unknown> {
    return this.http.delete(`${this.base}/teams/${teamId}/seats/${seatId}`, this.managerCtx(teamId, teamName, 'app.dialogs.reason-delete-seat'));
  }

  // Reportees
  listReportees(teamId: number): Observable<ReporteeResponse[]> {
    return this.http.get<ReporteeResponse[]>(`${this.base}/teams/${teamId}/reportees`);
  }
  joinTeam(teamId: number, req: JoinTeamRequest): Observable<ReporteeResponse> {
    return this.http.post<ReporteeResponse>(`${this.base}/teams/${teamId}/reportees`, req);
  }
  approveReportee(teamId: number, reporteeId: number, teamName = ''): Observable<ReporteeResponse> {
    return this.http.put<ReporteeResponse>(`${this.base}/teams/${teamId}/reportees/${reporteeId}/approve`, {}, this.managerCtx(teamId, teamName, 'app.dialogs.reason-approve-member'));
  }
  denyReportee(teamId: number, reporteeId: number, teamName = ''): Observable<unknown> {
    return this.http.delete(`${this.base}/teams/${teamId}/reportees/${reporteeId}/deny`, this.managerCtx(teamId, teamName, 'app.dialogs.reason-deny-join'));
  }
  removeReportee(teamId: number, reporteeId: number, teamName = ''): Observable<unknown> {
    return this.http.delete(`${this.base}/teams/${teamId}/reportees/${reporteeId}`, this.managerCtx(teamId, teamName, 'app.dialogs.reason-remove-member'));
  }

  // Bookings
  getAvailability(teamId: number, date: string): Observable<AvailabilityResponse> {
    return this.http.get<AvailabilityResponse>(`${this.base}/bookings/availability/${teamId}`, { params: { date } });
  }
  bookSeat(req: BookSeatRequest, reporteeId: number, reporteeName = ''): Observable<BookingResponse> {
    return this.http.post<BookingResponse>(`${this.base}/bookings`, req, this.reporteeCtx(reporteeId, reporteeName, 'app.dialogs.reason-book-seat'));
  }
  cancelBooking(bookingId: number, reporteeId: number, reporteeName = ''): Observable<any> {
    return this.http.delete(`${this.base}/bookings/${bookingId}`, this.reporteeCtx(reporteeId, reporteeName, 'app.dialogs.reason-cancel-booking'));
  }

  // Health
  checkHealth(): Observable<{ status: string; timestamp: string }> {
    return this.http.get<{ status: string; timestamp: string }>('/health');
  }
}
