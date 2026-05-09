// --- Team ---
export interface CreateTeamRequest { name?: string; secretKey: string; totpCode: string; }
export interface TeamResponse { id: number; name: string; hasTotpSetup: boolean; }
export interface TeamSearchResult { id: number; name: string; seatCount: number; memberCount: number; }

// --- Seat ---
export interface AddSeatRequest { label: string; }
export interface SeatResponse { id: number; label: string; teamId: number; }

// --- Reportee ---
export interface JoinTeamRequest { friendlyName: string; secretKey: string; totpCode: string; }
export interface ReporteeResponse { id: number; friendlyName: string; teamId: number; isApproved: boolean; hasTotpSetup: boolean; }

// --- Booking ---
export interface BookSeatRequest { reporteeId: number; seatId: number; date: string; }
export interface BookingResponse {
  id: number; date: string; seatId: number; seatLabel: string;
  reporteeId: number; reporteeName: string; status: string; createdAt: string;
}

// --- Availability ---
export interface WaitlistInfo { bookingId: number; reporteeName: string; desiredSeatLabel: string; waitlistedSince: string; }
export interface AvailabilityResponse {
  date: string; totalSeats: number; bookedCount: number;
  availableCount: number; waitlistedCount: number;
  bookings: BookingResponse[]; availableSeats: SeatResponse[]; waitlist: WaitlistInfo[];
}
