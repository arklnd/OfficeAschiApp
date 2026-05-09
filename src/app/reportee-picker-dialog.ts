import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HyMaterialButtonModule, HyMaterialIconModule } from '@hyland/ui/material';
import { HyDialogModule } from '@hyland/ui/dialog';
import { HyUserProfileModule } from '@hyland/ui/user-profile';
import { ReporteeResponse } from './models';

export interface ReporteePickerData {
  reportees: ReporteeResponse[];
}

@Component({
  selector: 'app-reportee-picker-dialog',
  standalone: true,
  imports: [
    CommonModule, MatButtonModule, MatIconModule,
    HyMaterialButtonModule, HyMaterialIconModule,
    HyDialogModule, HyUserProfileModule,
  ],
  template: `
    <hy-dialog
      header="Select Member"
      dismissLabel="Cancel"
      confirmLabel=""
      (dismissed)="dialogRef.close(null)"
    >
      <div class="reportee-list">
        @for (r of data.reportees; track r.id) {
          <button mat-stroked-button class="reportee-btn" (click)="select(r)">
            <hy-user-profile [name]="r.friendlyName" [size]="profileSize" bgColor="blue"></hy-user-profile>
            <span>{{ r.friendlyName }}</span>
          </button>
        }
      </div>
    </hy-dialog>
  `,
  styles: [`
    .reportee-list { display: flex; flex-direction: column; gap: 8px; min-width: 280px; }
    .reportee-btn { display: flex; align-items: center; gap: 12px; justify-content: flex-start; text-align: left; padding: 8px 16px; }
  `],
})
export class ReporteePickerDialogComponent {
  readonly profileSize = 'small' as any;

  constructor(
    public dialogRef: MatDialogRef<ReporteePickerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ReporteePickerData,
  ) {}

  select(r: ReporteeResponse): void {
    this.dialogRef.close(r);
  }
}
