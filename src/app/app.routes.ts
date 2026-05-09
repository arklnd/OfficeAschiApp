import { Routes } from '@angular/router';
import { TeamSearchComponent } from './team-search';
import { TeamCreateComponent } from './team-create';
import { TeamDetailComponent } from './team-detail';
import { JoinTeamComponent } from './join-team';

export const routes: Routes = [
  { path: '', component: TeamSearchComponent },
  { path: 'team/create', component: TeamCreateComponent },
  { path: 'team/:id', component: TeamDetailComponent },
  { path: 'team/:id/join', component: JoinTeamComponent },
];
