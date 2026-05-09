import { Routes } from '@angular/router';
import { TeamSearchComponent } from './team-search';
import { TeamDetailComponent } from './team-detail';

export const routes: Routes = [
  { path: '', component: TeamSearchComponent },
  { path: 'team/:id', component: TeamDetailComponent },
];
