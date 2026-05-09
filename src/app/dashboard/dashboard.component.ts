import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [],
  template: `<p>Redirecting...</p>`,
})
export class DashboardComponent {
  constructor(private router: Router) {
    this.router.navigate(['/']);
  }
}
