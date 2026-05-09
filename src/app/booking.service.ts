import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  TeamSearchResult, TeamResponse, CreateTeamRequest,
  SeatResponse, AddSeatRequest, ReporteeResponse, JoinTeamRequest,
  BookSeatRequest, BookingResponse, AvailabilityResponse,
} from './models';
import { TOTP_ENTITY_TYPE, TOTP_ENTITY_ID, TOTP_ENTITY_NAME } from './totp.context';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = '/api';
  constructor(private http: HttpClient) {}

  private managerCtx(teamId: number, teamName = ''): { context: HttpContext } {
    return { context: new HttpContext().set(TOTP_ENTITY_TYPE, 'manager').set(TOTP_ENTITY_ID, teamId).set(TOTP_ENTITY_NAME, teamName) };
  }

  private reporteeCtx(reporteeId: number, reporteeName = ''): { context: HttpContext } {
    return { context: new HttpContext().set(TOTP_ENTITY_TYPE, 'reportee').set(TOTP_ENTITY_ID, reporteeId).set(TOTP_ENTITY_NAME, reporteeName) };
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

  // Seats
  listSeats(teamId: number): Observable<SeatResponse[]> {
    return this.http.get<SeatResponse[]>(`${this.base}/teams/${teamId}/seats`);
  }
  addSeat(teamId: number, req: AddSeatRequest, teamName = ''): Observable<SeatResponse> {
    return this.http.post<SeatResponse>(`${this.base}/teams/${teamId}/seats`, req, this.managerCtx(teamId, teamName));
  }

  // Reportees
  listReportees(teamId: number): Observable<ReporteeResponse[]> {
    return this.http.get<ReporteeResponse[]>(`${this.base}/teams/${teamId}/reportees`);
  }
  joinTeam(teamId: number, req: JoinTeamRequest): Observable<ReporteeResponse> {
    return this.http.post<ReporteeResponse>(`${this.base}/teams/${teamId}/reportees`, req);
  }
  approveReportee(teamId: number, reporteeId: number, teamName = ''): Observable<ReporteeResponse> {
    return this.http.put<ReporteeResponse>(`${this.base}/teams/${teamId}/reportees/${reporteeId}/approve`, {}, this.managerCtx(teamId, teamName));
  }

  // Bookings
  getAvailability(teamId: number, date: string): Observable<AvailabilityResponse> {
    return this.http.get<AvailabilityResponse>(`${this.base}/bookings/availability/${teamId}`, { params: { date } });
  }
  bookSeat(req: BookSeatRequest, reporteeId: number, reporteeName = ''): Observable<BookingResponse> {
    return this.http.post<BookingResponse>(`${this.base}/bookings`, req, this.reporteeCtx(reporteeId, reporteeName));
  }
  cancelBooking(bookingId: number, reporteeId: number, reporteeName = ''): Observable<any> {
    return this.http.delete(`${this.base}/bookings/${bookingId}`, this.reporteeCtx(reporteeId, reporteeName));
  }

  // Health
  checkHealth(): Observable<{ status: string; timestamp: string }> {
    return this.http.get<{ status: string; timestamp: string }>('/health');
  }
}
