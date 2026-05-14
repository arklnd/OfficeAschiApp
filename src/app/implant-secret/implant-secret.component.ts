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
import { HyTagModule } from '@hyland/ui/tag';
import { HyTranslateModule } from '@hyland/ui/language';
import { HyGhostModule } from '@hyland/ui/ghost';
import { HyComboBoxModule } from '@hyland/ui/combo-box';
import { ApiService } from '../services/booking.service';
import { TotpService } from '../totp/totp.service';
import { TotpCodeInputComponent } from '../totp/totp-code-input.component';
import { TeamSearchResult, ReporteeResponse } from '../models';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-implant-secret',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatCardModule, MatIconModule, MatTabsModule,
    MatFormFieldModule, MatInputModule,
    HyMaterialButtonModule, HyMaterialIconModule, HyMaterialFormFieldModule,
    HyMaterialTabsModule,
    HyShellModule, HyTagModule, HyTranslateModule, HyGhostModule,
    HyComboBoxModule,
    TotpCodeInputComponent,
  ],
  template: `
    <hy-shell-view [title]="'app.implant-secret.title' | transloco" backRoute="/" [backTitle]="'app.implant-secret.back' | transloco" />

    <div class="container">
      <mat-tab-group hyTabGroup (selectedTabChange)="onTabChange($event)">
        <!-- Team (Manager) Tab -->
        <mat-tab [label]="'app.implant-secret.tab-team' | transloco">
          <div class="tab-content">
            <mat-card appearance="outlined">
              <mat-card-header>
                <mat-card-title>{{ 'app.implant-secret.select-team' | transloco }}</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <mat-form-field hyFormField style="width:100%">
                  <mat-label>{{ 'app.implant-secret.search-team' | transloco }}</mat-label>
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
              <mat-card appearance="outlined" class="implant-card">
                <mat-card-header>
                  <mat-card-title>{{ 'app.implant-secret.implant-manager' | transloco }}</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="selected-info">
                    <mat-icon hyIcon>group_work</mat-icon>
                    <span class="selected-name">{{ selectedTeam()!.name }}</span>
                    @if (hasManagerSecret()) {
                      <hy-tag color="green">{{ 'app.implant-secret.secret-stored' | transloco }}</hy-tag>
                    } @else {
                      <hy-tag color="orange">{{ 'app.implant-secret.no-secret' | transloco }}</hy-tag>
                    }
                  </div>

                  <mat-form-field hyFormField style="width:100%">
                    <mat-label>{{ 'app.implant-secret.enter-secret' | transloco }}</mat-label>
                    <input matInput [(ngModel)]="managerSecret" [placeholder]="'app.implant-secret.secret-placeholder' | transloco" />
                  </mat-form-field>

                  <div class="verify-row">
                    <app-totp-code-input
                      [label]="'app.implant-secret.enter-code' | transloco"
                      fieldClass="full-width"
                      [(ngModel)]="managerCode"
                      (submitted)="implantManagerSecret()">
                    </app-totp-code-input>
                    <button mat-flat-button hyIconLabelButton color="primary"
                      [disabled]="managerCode.length !== 6 || !managerSecret || managerImplanting()"
                      (click)="implantManagerSecret()">
                      <mat-icon hyIcon>vpn_key</mat-icon> {{ 'app.implant-secret.implant' | transloco }}
                    </button>
                  </div>

                  @if (managerResult() !== null) {
                    <div class="result" [class.success]="managerResult()" [class.error]="!managerResult()">
                      <mat-icon hyIcon>{{ managerResult() ? 'check_circle' : 'error' }}</mat-icon>
                      <span>{{ managerResult() ? ('app.implant-secret.implant-success' | transloco) : ('app.implant-secret.implant-failed' | transloco) }}</span>
                    </div>
                  }
                </mat-card-content>
              </mat-card>
            }
          </div>
        </mat-tab>

        <!-- Member (Reportee) Tab -->
        <mat-tab [label]="'app.implant-secret.tab-member' | transloco">
          <div class="tab-content">
            <mat-card appearance="outlined">
              <mat-card-header>
                <mat-card-title>{{ 'app.implant-secret.select-team-first' | transloco }}</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <mat-form-field hyFormField style="width:100%">
                  <mat-label>{{ 'app.implant-secret.search-team' | transloco }}</mat-label>
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
                  <mat-card-title>{{ 'app.implant-secret.select-member' | transloco }}</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  @if (loadingReportees()) {
                    <hy-ghost-block style="height: 48px;"></hy-ghost-block>
                  } @else {
                    <mat-form-field hyFormField style="width:100%">
                      <mat-label>{{ 'app.implant-secret.search-member' | transloco }}</mat-label>
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
              <mat-card appearance="outlined" class="implant-card">
                <mat-card-header>
                  <mat-card-title>{{ 'app.implant-secret.implant-member' | transloco }}</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="selected-info">
                    <mat-icon hyIcon>person</mat-icon>
                    <span class="selected-name">{{ selectedMember()!.friendlyName }}</span>
                    @if (hasMemberSecret()) {
                      <hy-tag color="green">{{ 'app.implant-secret.secret-stored' | transloco }}</hy-tag>
                    } @else {
                      <hy-tag color="orange">{{ 'app.implant-secret.no-secret' | transloco }}</hy-tag>
                    }
                  </div>

                  <mat-form-field hyFormField style="width:100%">
                    <mat-label>{{ 'app.implant-secret.enter-secret' | transloco }}</mat-label>
                    <input matInput [(ngModel)]="memberSecret" [placeholder]="'app.implant-secret.secret-placeholder' | transloco" />
                  </mat-form-field>

                  <div class="verify-row">
                    <app-totp-code-input
                      [label]="'app.implant-secret.enter-code' | transloco"
                      fieldClass="full-width"
                      [(ngModel)]="memberCode"
                      (submitted)="implantMemberSecret()">
                    </app-totp-code-input>
                    <button mat-flat-button hyIconLabelButton color="primary"
                      [disabled]="memberCode.length !== 6 || !memberSecret || memberImplanting()"
                      (click)="implantMemberSecret()">
                      <mat-icon hyIcon>vpn_key</mat-icon> {{ 'app.implant-secret.implant' | transloco }}
                    </button>
                  </div>

                  @if (memberResult() !== null) {
                    <div class="result" [class.success]="memberResult()" [class.error]="!memberResult()">
                      <mat-icon hyIcon>{{ memberResult() ? 'check_circle' : 'error' }}</mat-icon>
                      <span>{{ memberResult() ? ('app.implant-secret.implant-success' | transloco) : ('app.implant-secret.implant-failed' | transloco) }}</span>
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
    .implant-card { }
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
  `],
})
export class ImplantSecretComponent implements OnInit {
  private api = inject(ApiService);
  private totpService = inject(TotpService);
  private destroyRef = inject(DestroyRef);

  // Team tab state
  allTeams = signal<TeamSearchResult[]>([]);
  teamsLoading = signal(false);
  teamFilter = signal('');
  selectedTeam = signal<TeamSearchResult | null>(null);
  managerCode = '';
  managerSecret = '';
  managerImplanting = signal(false);
  managerResult = signal<boolean | null>(null);

  filteredTeams = computed(() => {
    const q = this.teamFilter().toLowerCase();
    return q ? this.allTeams().filter(t => t.name.toLowerCase().includes(q)) : this.allTeams();
  });

  hasManagerSecret = computed(() => {
    const team = this.selectedTeam();
    return team ? !!this.totpService.getSecret('manager', team.id) : false;
  });

  // Member tab state
  memberTeamFilter = signal('');
  selectedMemberTeam = signal<TeamSearchResult | null>(null);
  reportees = signal<ReporteeResponse[]>([]);
  loadingReportees = signal(false);
  memberFilter = signal('');
  selectedMember = signal<ReporteeResponse | null>(null);
  memberCode = '';
  memberSecret = '';
  memberImplanting = signal(false);
  memberResult = signal<boolean | null>(null);

  filteredTeamsForMember = computed(() => {
    const q = this.memberTeamFilter().toLowerCase();
    return q ? this.allTeams().filter(t => t.name.toLowerCase().includes(q)) : this.allTeams();
  });

  filteredMembers = computed(() => {
    const q = this.memberFilter().toLowerCase();
    return q ? this.reportees().filter(r => r.friendlyName.toLowerCase().includes(q)) : this.reportees();
  });

  hasMemberSecret = computed(() => {
    const member = this.selectedMember();
    return member ? !!this.totpService.getSecret('reportee', member.id) : false;
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
    this.managerSecret = '';
    this.managerResult.set(null);
  }

  implantManagerSecret(): void {
    const team = this.selectedTeam();
    if (!team || this.managerCode.length !== 6 || !this.managerSecret) return;

    this.managerImplanting.set(true);
    this.api.verifyTotp('manager', team.id, this.managerCode)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.valid) {
            this.totpService.storeSecret('manager', team.id, this.managerSecret);
            this.managerResult.set(true);
          } else {
            this.managerResult.set(false);
          }
          this.managerImplanting.set(false);
        },
        error: () => {
          this.managerResult.set(false);
          this.managerImplanting.set(false);
        },
      });
  }

  // --- Member tab ---
  onMemberTeamSelected(team: TeamSearchResult): void {
    this.selectedMemberTeam.set(team);
    this.selectedMember.set(null);
    this.memberFilter.set('');
    this.memberCode = '';
    this.memberSecret = '';
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
    this.memberSecret = '';
    this.memberResult.set(null);
  }

  implantMemberSecret(): void {
    const member = this.selectedMember();
    if (!member || this.memberCode.length !== 6 || !this.memberSecret) return;

    this.memberImplanting.set(true);
    this.api.verifyTotp('reportee', member.id, this.memberCode)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.valid) {
            this.totpService.storeSecret('reportee', member.id, this.memberSecret);
            this.memberResult.set(true);
          } else {
            this.memberResult.set(false);
          }
          this.memberImplanting.set(false);
        },
        error: () => {
          this.memberResult.set(false);
          this.memberImplanting.set(false);
        },
      });
  }

  onTabChange(_event: any): void {
    this.managerResult.set(null);
    this.memberResult.set(null);
  }
}
