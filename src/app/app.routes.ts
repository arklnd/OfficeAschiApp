import { isDevMode } from '@angular/core';
import { Routes } from '@angular/router';
import { TeamSearchComponent } from './team-search/team-search.component';
import { TeamDetailComponent } from './team-detail/team-detail.component';

export const routes: Routes = [
  { path: '', redirectTo: 'teams', pathMatch: 'full' },
  { path: 'teams', component: TeamSearchComponent },
  { path: 'team/:id', component: TeamDetailComponent },
  { path: 'totp-verify', loadComponent: () => import('./totp-verify/totp-verify.component').then(m => m.TotpVerifyComponent) },
  ...(isDevMode() ? [{ path: 'dev', loadComponent: () => import('./dev-menu/dev-menu.component').then(m => m.DevMenuComponent) }] : []),
];
