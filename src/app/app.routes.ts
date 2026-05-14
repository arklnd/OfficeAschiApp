import { isDevMode } from '@angular/core';
import { Routes } from '@angular/router';
import { TeamSearchComponent } from './team-search/team-search.component';
import { TeamDetailComponent } from './team-detail/team-detail.component';

export const routes: Routes = [
  { path: '', redirectTo: 'teams', pathMatch: 'full' },
  { path: 'teams', component: TeamSearchComponent },
  { path: 'team/:id', component: TeamDetailComponent },
  { path: 'totp-sync-check', loadComponent: () => import('./totp-sync-check/totp-sync-check.component').then(m => m.TotpSyncCheckComponent) },
  { path: 'implant-secret', loadComponent: () => import('./implant-secret/implant-secret.component').then(m => m.ImplantSecretComponent) },
];
