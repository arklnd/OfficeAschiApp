import { Component, signal, computed, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { HyMaterialButtonModule, HyMaterialIconModule, HyMaterialFormFieldModule } from '@hyland/ui/material';
import { HyShellModule } from '@hyland/ui-shell';
import { HyTagModule } from '@hyland/ui/tag';
import { HyGhostModule } from '@hyland/ui/ghost';
import { HySearchInputModule } from '@hyland/ui/search-input';
import { HyUserProfileModule } from '@hyland/ui/user-profile';
import { HyTranslateModule } from '@hyland/ui/language';
import { ApiService } from '../services/booking.service';
import { SeatOverviewResponse } from '../models';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type SeatFilter = 'all' | 'engaged' | 'vacant';

@Component({
  selector: 'app-seat-search',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatCardModule, MatIconModule,
    MatDatepickerModule, MatFormFieldModule, MatInputModule,
    HyMaterialButtonModule, HyMaterialIconModule, HyMaterialFormFieldModule,
    HyShellModule, HyTagModule, HyGhostModule, HySearchInputModule,
    HyUserProfileModule, HyTranslateModule,
  ],
  template: `
    <hy-shell-view [title]="'app.seat-search.title' | transloco" />
    <div class="container">
      <div class="header-row">
        <hy-search-input
          [(value)]="searchQuery"
          [placeholder]="'app.seat-search.search-placeholder' | transloco"
          [ariaLabel]="'app.seat-search.search-aria' | transloco"
          (search)="applyFilter()"
          (valueChange)="applyFilter()"
        ></hy-search-input>

        <mat-form-field hyFormField class="date-field">
          <mat-label>{{ 'app.seat-search.date' | transloco }}</mat-label>
          <input matInput [matDatepicker]="picker" [value]="selectedDate" (dateChange)="onDateChange($event)">
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
        </mat-form-field>
      </div>

      <div class="filter-row">
        @for (f of filters; track f.value) {
          <button mat-stroked-button hyIconLabelButton [class.filter-active]="activeFilter === f.value"
            (click)="onFilterChange(f.value)">
            {{ f.label | transloco }} ({{ f.value === 'all' ? allSeats().length : f.value === 'vacant' ? vacantCount() : engagedCount() }})
          </button>
        }
      </div>

      @if (loading()) {
        <div class="seat-grid">
          @for (i of [1,2,3,4,5,6]; track i) {
            <mat-card appearance="outlined"><mat-card-content>
              <hy-ghost-block style="height: 80px;"></hy-ghost-block>
            </mat-card-content></mat-card>
          }
        </div>
      } @else if (filteredSeats().length === 0) {
        <div class="empty">
          <mat-icon hyIcon class="empty-icon">event_seat</mat-icon>
          <p>{{ 'app.seat-search.empty-text' | transloco }}</p>
        </div>
      } @else {
        <div class="seat-grid">
          @for (seat of filteredSeats(); track seat.id) {
            <mat-card appearance="outlined" class="seat-card" [class.booked]="seat.isEngaged">
              <mat-card-header>
                <mat-card-title>{{ seat.label }}</mat-card-title>
                <mat-card-subtitle>{{ seat.teamName }}</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                @if (seat.isEngaged && seat.engagedBy) {
                  <hy-tag color="red">{{ 'app.seat-search.engaged' | transloco }}</hy-tag>
                  <div class="person-info">
                    <hy-user-profile [name]="seat.engagedBy.reporteeName" [size]="profileSize" bgColor="blue"></hy-user-profile>
                    <span>{{ seat.engagedBy.reporteeName }}</span>
                  </div>
                } @else {
                  <hy-tag color="green">{{ 'app.seat-search.vacant' | transloco }}</hy-tag>
                }
              </mat-card-content>
            </mat-card>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .container { max-width: 1000px; margin: 0 auto; padding: 24px 16px; }
    .header-row { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    hy-search-input { flex: 1; min-width: 200px; }
    .date-field { width: 170px; }
    .filter-row { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
    .filter-active { background-color: var(--mat-option-selected-state-label-text-color, #3288de); color: #fff; }
    .seat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
    .seat-card { padding: 16px; }
    .seat-card.booked {
      border-color: var(--mat-option-selected-state-label-text-color, #3288de);
      background: color-mix(in srgb, var(--mat-option-selected-state-label-text-color, #3288de) 10%, transparent);
    }
    .seat-status { display: flex; align-items: center; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
    .person-info { display: flex; align-items: center; gap: 8px; font-size: 14px; margin-top: 8px; }
    mat-card-header, mat-card-content { padding: 0; }
    .empty { text-align: center; padding: 48px 0; opacity: 0.6; }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; }
  `],
})
export class SeatSearchComponent implements OnInit {
  searchQuery = '';
  activeFilter: SeatFilter = 'all';
  selectedDate = new Date();
  profileSize = 'small' as any;

  filters: { value: SeatFilter; label: string }[] = [
    { value: 'all', label: 'app.seat-search.filter-all' },
    { value: 'vacant', label: 'app.seat-search.filter-vacant' },
    { value: 'engaged', label: 'app.seat-search.filter-engaged' },
  ];

  allSeats = signal<SeatOverviewResponse[]>([]);
  loading = signal(false);

  private destroyRef = inject(DestroyRef);

  vacantCount = computed(() => this.allSeats().filter(s => !s.isEngaged).length);
  engagedCount = computed(() => this.allSeats().filter(s => s.isEngaged).length);

  filteredSeats = computed(() => {
    let seats = this.allSeats();
    const q = this.searchQuery.toLowerCase().trim();
    if (q) {
      seats = seats.filter(s => s.label.toLowerCase().includes(q) || s.teamName.toLowerCase().includes(q));
    }
    if (this.activeFilter === 'engaged') seats = seats.filter(s => s.isEngaged);
    if (this.activeFilter === 'vacant') seats = seats.filter(s => !s.isEngaged);
    return seats;
  });

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadSeats();
    this.api.backendRecovered$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadSeats());
  }

  applyFilter(): void {
    // Triggers computed re-evaluation via signal read in template
    this.allSeats.update(s => [...s]);
  }

  onFilterChange(value: SeatFilter): void {
    this.activeFilter = value;
    this.applyFilter();
  }

  onDateChange(event: any): void {
    this.selectedDate = event.value;
    this.loadSeats();
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private loadSeats(): void {
    this.loading.set(true);
    this.api.getAllSeats(this.formatDate(this.selectedDate)).subscribe({
      next: seats => { this.allSeats.set(seats); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }
}
