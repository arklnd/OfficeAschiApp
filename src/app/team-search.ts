import { Component, signal, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { HyMaterialButtonModule, HyMaterialIconModule } from '@hyland/ui/material';
import { HyShellModule } from '@hyland/ui-shell';
import { HyTagModule } from '@hyland/ui/tag';
import { HyGhostModule } from '@hyland/ui/ghost';
import { HySearchInputModule } from '@hyland/ui/search-input';
import { configureHyDialogOptions } from '@hyland/ui/dialog';
import { ApiService } from './booking.service';
import { TeamSearchResult, TeamResponse } from './models';
import { TeamCreateDialogComponent } from './team-create';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-team-search',
  standalone: true,
  imports: [
    CommonModule, MatButtonModule, MatCardModule, MatIconModule,
    HyMaterialButtonModule, HyMaterialIconModule,
    HyShellModule, HyTagModule, HyGhostModule, HySearchInputModule,
  ],
  template: `
    <hy-shell-view title="Teams" />
    <div class="container">
      <div class="header-row">
        <hy-search-input
          [(value)]="searchQuery"
          placeholder="Search teams..."
          ariaLabel="Teams"
          (search)="onSearch()"
          (valueChange)="onSearch()"
        ></hy-search-input>
        <button mat-flat-button hyIconLabelButton color="primary" (click)="openCreateDialog()">
          <mat-icon hyIcon>add</mat-icon> Create Team
        </button>
      </div>

      @if (loading()) {
        <div class="team-grid">
          @for (i of [1,2,3,4]; track i) {
            <mat-card appearance="outlined"><mat-card-content>
              <hy-ghost-block style="height: 80px;"></hy-ghost-block>
            </mat-card-content></mat-card>
          }
        </div>
      } @else if (teams().length === 0) {
        <div class="empty">
          <mat-icon hyIcon class="empty-icon">groups</mat-icon>
          <p>No teams found. Create one or adjust your search.</p>
        </div>
      } @else {
        <div class="team-grid">
          @for (team of teams(); track team.id) {
            <mat-card appearance="outlined" class="team-card" (click)="router.navigate(['/team', team.id])">
              <mat-card-header>
                <mat-card-title>{{ team.name }}</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="team-stats">
                  <hy-tag color="blue">{{ team.seatCount }} seats</hy-tag>
                  <hy-tag color="green">{{ team.memberCount }} members</hy-tag>
                </div>
              </mat-card-content>
            </mat-card>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .container { max-width: 1000px; margin: 0 auto; padding: 24px 16px; }
    .header-row { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    hy-search-input { flex: 1; min-width: 200px; }
    .team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
    .team-card { cursor: pointer; padding: 16px; }
    .team-card:hover { border-color: var(--mat-option-selected-state-label-text-color, #3288de); }
    .team-stats { display: flex; gap: 8px; margin-top: 8px; }
    mat-card-header, mat-card-content { padding: 0; }
    .empty { text-align: center; padding: 48px 0; opacity: 0.6; }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; }
  `],
})
export class TeamSearchComponent implements OnInit {
  searchQuery = '';
  teams = signal<TeamSearchResult[]>([]);
  loading = signal(false);
  private destroyRef = inject(DestroyRef);

  constructor(
    private api: ApiService,
    public router: Router,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadTeams();
    this.api.backendRecovered$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadTeams());
  }

  onSearch(): void { this.loadTeams(); }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(TeamCreateDialogComponent, configureHyDialogOptions({ width: '500px' }));
    dialogRef.afterClosed().subscribe((team: TeamResponse | null) => {
      if (team) this.router.navigate(['/team', team.id]);
    });
  }

  loadTeams(): void {
    this.loading.set(true);
    this.api.searchTeams(this.searchQuery || undefined).subscribe({
      next: t => { this.teams.set(t); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }
}
