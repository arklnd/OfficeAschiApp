import { Component, signal, computed, inject, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { HyTranslateModule } from '@hyland/ui/language';
import { HyGhostModule } from '@hyland/ui/ghost';
import { HyComboBoxModule } from '@hyland/ui/combo-box';
import { ApiService } from '../services/booking.service';
import { TotpCodeInputComponent } from '../totp/totp-code-input.component';
import { TeamSearchResult, ReporteeResponse } from '../models';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-totp-sync-check',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatCardModule, MatIconModule, MatTabsModule,
    MatFormFieldModule, MatInputModule,
    HyMaterialButtonModule, HyMaterialIconModule, HyMaterialFormFieldModule,
    HyMaterialTabsModule,
    HyShellModule, HyTranslateModule, HyGhostModule,
    HyComboBoxModule,
    TotpCodeInputComponent,
  ],
  template: `
    <hy-shell-view [title]="'app.totp-sync-check.title' | transloco" backRoute="/" [backTitle]="'app.totp-sync-check.back' | transloco" />

    <div class="container">
      <mat-tab-group hyTabGroup (selectedTabChange)="onTabChange($event)">
        <!-- Team (Manager) Tab -->
        <mat-tab [label]="'app.totp-sync-check.tab-team' | transloco">
          <div class="tab-content">
            <mat-card appearance="outlined">
              <mat-card-header>
                <mat-card-title>{{ 'app.totp-sync-check.select-team' | transloco }}</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <mat-form-field hyFormField style="width:100%">
                  <mat-label>{{ 'app.totp-sync-check.search-team' | transloco }}</mat-label>
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

            @if (selectedTeam()) {
              <mat-card appearance="outlined" class="verify-card">
                <mat-card-header>
                  <mat-card-title>{{ 'app.totp-sync-check.check-manager-totp' | transloco }}</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="selected-info">
                    <mat-icon hyIcon>group_work</mat-icon>
                    <span class="selected-name">{{ selectedTeam()!.name }}</span>
                  </div>

                  <div class="verify-row">
                    <app-totp-code-input
                      [label]="'app.totp-sync-check.enter-code' | transloco"
                      fieldClass="full-width"
                      [(ngModel)]="managerCode"
                      (submitted)="verifyManagerCode()">
                    </app-totp-code-input>
                    <button mat-flat-button hyIconLabelButton color="primary"
                      [disabled]="managerCode.length !== 6 || managerVerifying()"
                      (click)="verifyManagerCode()">
                      <mat-icon hyIcon>check</mat-icon> {{ 'app.totp-sync-check.check' | transloco }}
                    </button>
                  </div>

                  @if (managerResult() !== null) {
                    <div class="result" [class.success]="managerResult()" [class.error]="!managerResult()">
                      <mat-icon hyIcon>{{ managerResult() ? 'check_circle' : 'error' }}</mat-icon>
                      <span>{{ managerResult() ? ('app.totp-sync-check.code-valid' | transloco) : ('app.totp-sync-check.code-invalid' | transloco) }}</span>
                    </div>
                  }
                </mat-card-content>
              </mat-card>
            }
          </div>
        </mat-tab>

        <!-- Member (Reportee) Tab -->
        <mat-tab [label]="'app.totp-sync-check.tab-member' | transloco">
          <div class="tab-content">
            <mat-card appearance="outlined">
              <mat-card-header>
                <mat-card-title>{{ 'app.totp-sync-check.select-team-first' | transloco }}</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <mat-form-field hyFormField style="width:100%">
                  <mat-label>{{ 'app.totp-sync-check.search-team' | transloco }}</mat-label>
                  <hy-combo-box
                    [options]="filteredTeamsForMember()"
                    [displayWith]="displayTeam"
                    [value]="selectedMemberTeam()"
                    (valueChange)="onMemberTeamSelected($event!)"
                    (filterChange)="memberTeamFilter.set($event)"
                  ></hy-combo-box>
                </mat-form-field>
              </mat-card-content>
            </mat-card>

            @if (selectedMemberTeam()) {
              <mat-card appearance="outlined">
                <mat-card-header>
                <mat-card-title>{{ 'app.totp-sync-check.select-member' | transloco }}</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                  @if (loadingReportees()) {
                    <hy-ghost-block style="height: 48px;"></hy-ghost-block>
                  } @else {
                    <mat-form-field hyFormField style="width:100%">
                      <mat-label>{{ 'app.totp-sync-check.search-member' | transloco }}</mat-label>
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

            @if (selectedMember()) {
              <mat-card appearance="outlined" class="verify-card">
                <mat-card-header>
                  <mat-card-title>{{ 'app.totp-sync-check.check-member-totp' | transloco }}</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="selected-info">
                    <mat-icon hyIcon>person</mat-icon>
                    <span class="selected-name">{{ selectedMember()!.friendlyName }}</span>
                  </div>

                  <div class="verify-row">
                    <app-totp-code-input
                      [label]="'app.totp-sync-check.enter-code' | transloco"
                      fieldClass="full-width"
                      [(ngModel)]="memberCode"
                      (submitted)="verifyMemberCode()">
                    </app-totp-code-input>
                    <button mat-flat-button hyIconLabelButton color="primary"
                      [disabled]="memberCode.length !== 6 || memberVerifying()"
                      (click)="verifyMemberCode()">
                      <mat-icon hyIcon>check</mat-icon> {{ 'app.totp-sync-check.check' | transloco }}
                    </button>
                  </div>

                  @if (memberResult() !== null) {
                    <div class="result" [class.success]="memberResult()" [class.error]="!memberResult()">
                      <mat-icon hyIcon>{{ memberResult() ? 'check_circle' : 'error' }}</mat-icon>
                      <span>{{ memberResult() ? ('app.totp-sync-check.code-valid' | transloco) : ('app.totp-sync-check.code-invalid' | transloco) }}</span>
                    </div>
                  }
                </mat-card-content>
              </mat-card>
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .container { max-width: 800px; margin: 0 auto; padding: 24px 16px; }
    .tab-content { display: flex; flex-direction: column; gap: 16px; padding-top: 16px; }
    .full-width { width: 100%; }
    mat-card-header, mat-card-content { padding: 0; }
    .verify-card { }
    .selected-info {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 0; margin-bottom: 8px;
      border-bottom: 1px solid var(--mat-divider-color, #e0e0e0);
    }
    .selected-name { font-weight: 500; font-size: 1.1em; flex: 1; }
    .verify-row { display: flex; align-items: flex-start; gap: 12px; margin-top: 8px; }
    .verify-row app-totp-code-input { flex: 1; }
    .verify-row button { margin-top: 4px; }
    .result {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 16px; border-radius: 8px; margin-top: 8px;
      font-weight: 500;
    }
    .result.success { background: rgba(76, 175, 80, 0.12); color: #2e7d32; }
    .result.error { background: rgba(244, 67, 54, 0.12); color: #c62828; }
    .option-meta { font-size: 0.85em; opacity: 0.6; margin-left: 8px; }
    .option-pending { color: orange; }
  `],
})
export class TotpSyncCheckComponent implements OnInit {
  private api = inject(ApiService);
  private destroyRef = inject(DestroyRef);

  // Team tab state
  allTeams = signal<TeamSearchResult[]>([]);
  teamsLoading = signal(false);
  teamFilter = signal('');
  selectedTeam = signal<TeamSearchResult | null>(null);
  managerCode = '';
  managerVerifying = signal(false);
  managerResult = signal<boolean | null>(null);

  filteredTeams = computed(() => {
    const q = this.teamFilter().toLowerCase();
    return q ? this.allTeams().filter(t => t.name.toLowerCase().includes(q)) : this.allTeams();
  });

  // Member tab state
  memberTeamFilter = signal('');
  selectedMemberTeam = signal<TeamSearchResult | null>(null);
  reportees = signal<ReporteeResponse[]>([]);
  loadingReportees = signal(false);
  memberFilter = signal('');
  selectedMember = signal<ReporteeResponse | null>(null);
  memberCode = '';
  memberVerifying = signal(false);
  memberResult = signal<boolean | null>(null);

  filteredTeamsForMember = computed(() => {
    const q = this.memberTeamFilter().toLowerCase();
    return q ? this.allTeams().filter(t => t.name.toLowerCase().includes(q)) : this.allTeams();
  });

  filteredMembers = computed(() => {
    const q = this.memberFilter().toLowerCase();
    return q ? this.reportees().filter(r => r.friendlyName.toLowerCase().includes(q)) : this.reportees();
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

  // --- Team tab ---
  displayTeam = (team: TeamSearchResult): string => team?.name ?? '';

  onTeamSelected(team: TeamSearchResult): void {
    this.selectedTeam.set(team);
    this.managerCode = '';
    this.managerResult.set(null);
  }

  verifyManagerCode(): void {
    const team = this.selectedTeam();
    if (!team || this.managerCode.length !== 6) return;

    this.managerVerifying.set(true);
    this.api.verifyTotp('manager', team.id, this.managerCode)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.managerResult.set(res.valid);
          this.managerVerifying.set(false);
        },
        error: () => {
          this.managerResult.set(false);
          this.managerVerifying.set(false);
        },
      });
  }

  // --- Member tab ---
  onMemberTeamSelected(team: TeamSearchResult): void {
    this.selectedMemberTeam.set(team);
    this.selectedMember.set(null);
    this.memberFilter.set('');
    this.memberCode = '';
    this.memberResult.set(null);
    this.loadReportees(team.id);
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

  displayMember = (member: ReporteeResponse): string => member?.friendlyName ?? '';

  onMemberSelected(member: ReporteeResponse): void {
    this.selectedMember.set(member);
    this.memberCode = '';
    this.memberResult.set(null);
  }

  verifyMemberCode(): void {
    const member = this.selectedMember();
    if (!member || this.memberCode.length !== 6) return;

    this.memberVerifying.set(true);
    this.api.verifyTotp('reportee', member.id, this.memberCode)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.memberResult.set(res.valid);
          this.memberVerifying.set(false);
        },
        error: () => {
          this.memberResult.set(false);
          this.memberVerifying.set(false);
        },
      });
  }

  onTabChange(_event: any): void {
    // Reset results when switching tabs
    this.managerResult.set(null);
    this.memberResult.set(null);
  }
}
