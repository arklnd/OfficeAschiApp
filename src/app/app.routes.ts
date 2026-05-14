import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { TeamSearchComponent } from './team-search/team-search.component';
import { TeamDetailComponent } from './team-detail/team-detail.component';

const devModeGuard = () => {
  if (localStorage.getItem('oa_dev_mode') === '1') return true;
  return inject(Router).parseUrl('/teams');
};

export const routes: Routes = [
  { path: '', redirectTo: 'teams', pathMatch: 'full' },
  { path: 'teams', component: TeamSearchComponent },
  { path: 'team/:id', component: TeamDetailComponent },
  { path: 'totp-sync-check', loadComponent: () => import('./totp-sync-check/totp-sync-check.component').then(m => m.TotpSyncCheckComponent) },
  { path: 'implant-secret', canActivate: [devModeGuard], loadComponent: () => import('./implant-secret/implant-secret.component').then(m => m.ImplantSecretComponent) },
  { path: 'set-active-member', canActivate: [devModeGuard], loadComponent: () => import('./set-active-member/set-active-member.component').then(m => m.SetActiveMemberComponent) },
];
