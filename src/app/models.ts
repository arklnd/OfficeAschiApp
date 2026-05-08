export interface Person {
  id: number;
  name: string;
}

export interface Seat {
  id: number;
  label: string;
  type: string;
}

export interface Booking {
  id: number;
  date: string;
  person_id: number;
  person_name: string;
  seat_id: number;
  seat_label: string;
  seat_type: string;
}

export interface BookedSeat {
  seat_id: number;
  label: string;
  type: string;
  person_id: number;
  person_name: string;
}

export interface Availability {
  date: string;
  total_seats: number;
  booked_count: number;
  available_count: number;
  booked: BookedSeat[];
  available_seats: Seat[];
  people_not_coming: Person[];
}
