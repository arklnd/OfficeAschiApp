import { Component, signal, computed, inject, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  HyMaterialButtonModule, HyMaterialIconModule, HyMaterialFormFieldModule,
  HyMaterialTabsModule,
} from '@hyland/ui/material';
import { HyShellModule } from '@hyland/ui-shell';
import { HyTagModule } from '@hyland/ui/tag';
import { HyTranslateModule } from '@hyland/ui/language';
import { HyGhostModule } from '@hyland/ui/ghost';
import { HyComboBoxModule } from '@hyland/ui/combo-box';
import { ApiService } from '../services/booking.service';
import { TeamSearchResult, ReporteeResponse } from '../models';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-set-active-member',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule, MatCardModule, MatIconModule, MatTabsModule,
    MatFormFieldModule, MatInputModule,
    HyMaterialButtonModule, HyMaterialIconModule, HyMaterialFormFieldModule,
    HyMaterialTabsModule,
    HyShellModule, HyTagModule, HyTranslateModule, HyGhostModule,
    HyComboBoxModule,
  ],
  template: `
    <hy-shell-view [title]="'app.set-active-member.title' | transloco" backRoute="/" [backTitle]="'app.set-active-member.back' | transloco" />

    <div class="container">
      <!-- Step 1: Select Team -->
      <mat-card appearance="outlined">
        <mat-card-header>
          <mat-card-title>{{ 'app.set-active-member.select-team' | transloco }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <mat-form-field hyFormField style="width:100%">
            <mat-label>{{ 'app.set-active-member.search-team' | transloco }}</mat-label>
            <hy-combo-box
              [options]="filteredTeams()"
              [displayWith]="displayTeam"
              [value]="selectedTeam()"
              (valueChange)="onTeamSelected($event!)"
              (filterChange)="teamFilter.set($event)"
            ></hy-combo-box>
          </mat-form-field>
        </mat-card-content>
      </mat-card>

      <!-- Step 2: Select Member -->
      @if (selectedTeam()) {
        <mat-card appearance="outlined">
          <mat-card-header>
            <mat-card-title>{{ 'app.set-active-member.select-member' | transloco }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (loadingReportees()) {
              <hy-ghost-block style="height: 48px;"></hy-ghost-block>
            } @else if (approvedReportees().length === 0) {
              <p class="empty-message">{{ 'app.set-active-member.no-members' | transloco }}</p>
            } @else {
              <mat-form-field hyFormField style="width:100%">
                <mat-label>{{ 'app.set-active-member.search-member' | transloco }}</mat-label>
                <hy-combo-box
                  [options]="filteredMembers()"
                  [displayWith]="displayMember"
                  [value]="selectedMember()"
                  (valueChange)="onMemberSelected($event!)"
                  (filterChange)="memberFilter.set($event)"
                ></hy-combo-box>
              </mat-form-field>
            }
          </mat-card-content>
        </mat-card>
      }

      <!-- Step 3: Confirm / Current State -->
      @if (selectedTeam()) {
        <mat-card appearance="outlined" class="status-card">
          <mat-card-header>
            <mat-card-title>{{ 'app.set-active-member.current-status' | transloco }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="status-info">
              <mat-icon hyIcon>group_work</mat-icon>
              <span class="team-name">{{ selectedTeam()!.name }}</span>
            </div>

            @if (currentActiveName()) {
              <div class="active-member">
                <mat-icon hyIcon>person</mat-icon>
                <span>{{ currentActiveName() }}</span>
                <hy-tag color="green">{{ 'app.set-active-member.active' | transloco }}</hy-tag>
              </div>
            } @else {
              <div class="active-member no-member">
                <mat-icon hyIcon>person_off</mat-icon>
                <span>{{ 'app.set-active-member.none-set' | transloco }}</span>
              </div>
            }

            <div class="action-row">
              @if (selectedMember()) {
                <button mat-flat-button hyIconLabelButton color="primary"
                  (click)="setActiveMember()">
                  <mat-icon hyIcon>check</mat-icon> {{ 'app.set-active-member.set-active' | transloco }}
                </button>
              }
              @if (currentActiveName()) {
                <button mat-stroked-button hyIconLabelButton color="warn"
                  (click)="clearActiveMember()">
                  <mat-icon hyIcon>clear</mat-icon> {{ 'app.set-active-member.clear' | transloco }}
                </button>
              }
            </div>

            @if (resultMessage()) {
              <div class="result success">
                <mat-icon hyIcon>check_circle</mat-icon>
                <span>{{ resultMessage() }}</span>
              </div>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .container { max-width: 800px; margin: 0 auto; padding: 24px 16px; display: flex; flex-direction: column; gap: 16px; }
    mat-card-header, mat-card-content { padding: 0; }
    .status-info {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 0; margin-bottom: 8px;
      border-bottom: 1px solid var(--mat-divider-color, #e0e0e0);
    }
    .team-name { font-weight: 500; font-size: 1.1em; }
    .active-member {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 0;
    }
    .active-member.no-member { opacity: 0.6; }
    .action-row { display: flex; gap: 12px; margin-top: 12px; }
    .result {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 16px; border-radius: 8px; margin-top: 12px;
      font-weight: 500;
    }
    .result.success { background: rgba(76, 175, 80, 0.12); color: #2e7d32; }
    .empty-message { color: var(--hy-text-secondary, #666); padding: 8px 0; }
  `],
})
export class SetActiveMemberComponent implements OnInit {
  private api = inject(ApiService);
  private destroyRef = inject(DestroyRef);

  allTeams = signal<TeamSearchResult[]>([]);
  teamsLoading = signal(false);
  teamFilter = signal('');
  selectedTeam = signal<TeamSearchResult | null>(null);

  reportees = signal<ReporteeResponse[]>([]);
  loadingReportees = signal(false);
  memberFilter = signal('');
  selectedMember = signal<ReporteeResponse | null>(null);

  resultMessage = signal<string>('');

  filteredTeams = computed(() => {
    const q = this.teamFilter().toLowerCase();
    return q ? this.allTeams().filter(t => t.name.toLowerCase().includes(q)) : this.allTeams();
  });

  approvedReportees = computed(() => this.reportees().filter(r => r.isApproved));

  filteredMembers = computed(() => {
    const q = this.memberFilter().toLowerCase();
    return q ? this.approvedReportees().filter(r => r.friendlyName.toLowerCase().includes(q)) : this.approvedReportees();
  });

  currentActiveId = signal<number | null>(null);

  currentActiveName = computed(() => {
    const id = this.currentActiveId();
    if (!id) return null;
    const r = this.reportees().find(rep => rep.id === id);
    return r?.friendlyName ?? `ID ${id}`;
  });

  ngOnInit(): void {
    this.loadTeams();
  }

  private loadTeams(): void {
    this.teamsLoading.set(true);
    this.api.searchTeams().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (teams) => {
        this.allTeams.set(teams);
        this.teamsLoading.set(false);
      },
      error: () => this.teamsLoading.set(false),
    });
  }

  displayTeam = (team: TeamSearchResult): string => team?.name ?? '';
  displayMember = (member: ReporteeResponse): string => member?.friendlyName ?? '';

  onTeamSelected(team: TeamSearchResult): void {
    this.selectedTeam.set(team);
    this.selectedMember.set(null);
    this.memberFilter.set('');
    this.resultMessage.set('');
    this.loadReportees(team.id);
    this.loadCurrentActive(team.id);
  }

  private loadCurrentActive(teamId: number): void {
    const savedId = localStorage.getItem(`reportee_${teamId}`);
    this.currentActiveId.set(savedId ? Number(savedId) : null);
  }

  private loadReportees(teamId: number): void {
    this.loadingReportees.set(true);
    this.api.listReportees(teamId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (reportees) => {
        this.reportees.set(reportees);
        this.loadingReportees.set(false);
      },
      error: () => this.loadingReportees.set(false),
    });
  }

  onMemberSelected(member: ReporteeResponse): void {
    this.selectedMember.set(member);
    this.resultMessage.set('');
  }

  setActiveMember(): void {
    const team = this.selectedTeam();
    const member = this.selectedMember();
    if (!team || !member) return;

    localStorage.setItem(`reportee_${team.id}`, String(member.id));
    this.currentActiveId.set(member.id);
    this.resultMessage.set(`${member.friendlyName} set as active for ${team.name}`);
  }

  clearActiveMember(): void {
    const team = this.selectedTeam();
    if (!team) return;

    localStorage.removeItem(`reportee_${team.id}`);
    this.currentActiveId.set(null);
    this.resultMessage.set('');
  }
}
