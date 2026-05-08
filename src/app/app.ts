import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HyShellModule, HyShellSideNavModes } from '@hyland/ui-shell';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    HyShellModule,
  ],
  template: `
    <hy-shell toolbarTitle="OfficeAschi" homeRoute="/">
      <hy-shell-nav [mode]="sideNavMode">
        <hy-shell-nav-item name="Dashboard" route="/"></hy-shell-nav-item>
      </hy-shell-nav>
      <router-outlet />
    </hy-shell>
  `,
  styles: `
    :host {
      display: block;
      height: 100vh;
    }
  `,
})
export class App {
  sideNavMode = HyShellSideNavModes.Side;
}
