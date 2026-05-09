import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { HyMaterialFormFieldModule, HyMaterialButtonModule, HyMaterialIconModule, HyMaterialListModule } from '@hyland/ui/material';
import { HyShellModule } from '@hyland/ui-shell';
import { HyTagModule } from '@hyland/ui/tag';
import { HyToastService, HyToastModule } from '@hyland/ui/toast';
import { TotpService } from '../totp/totp.service';

interface StoredSecret {
  key: string;
  entityType: string;
  entityId: number;
  secret: string;
}

@Component({
  selector: 'app-dev-menu',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatListModule,
    HyMaterialFormFieldModule, HyMaterialButtonModule, HyMaterialIconModule, HyMaterialListModule,
    HyShellModule, HyTagModule, HyToastModule,
  ],
  template: `
    <hy-shell-view title="Dev Menu" />
    <div class="dev-menu-container">
        <!-- Implant Secret Form -->
        <mat-card appearance="outlined">
          <mat-card-header>
            <mat-card-title>Implant TOTP Secret</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="form-row">
              <mat-form-field hyFormField>
                <mat-label>Entity Type</mat-label>
                <mat-select [(ngModel)]="newEntityType">
                  <mat-option value="manager">Manager</mat-option>
                  <mat-option value="reportee">Member (Reportee)</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field hyFormField>
                <mat-label>Entity ID</mat-label>
                <input matInput type="number" [(ngModel)]="newEntityId" placeholder="e.g. 1" />
              </mat-form-field>
            </div>

            <mat-form-field hyFormField class="full-width">
              <mat-label>Secret (Base32)</mat-label>
              <input matInput [(ngModel)]="newSecret" placeholder="Paste or generate a secret" />
            </mat-form-field>

            <div class="form-actions">
              <button mat-flat-button hyIconLabelButton color="primary" (click)="implantSecret()">
                <mat-icon hyIcon>vpn_key</mat-icon> Implant
              </button>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Stored Secrets List -->
        <mat-card appearance="outlined">
          <mat-card-header>
            <mat-card-title>Stored Secrets</mat-card-title>
            <button mat-icon-button (click)="refreshSecrets()" style="margin-left: auto">
              <mat-icon>refresh</mat-icon>
            </button>
          </mat-card-header>
          <mat-card-content>
            @if (secrets().length === 0) {
              <p class="empty-message">No TOTP secrets stored in localStorage.</p>
            } @else {
              <mat-list hyList>
                @for (s of secrets(); track s.key) {
                  <mat-list-item hyListItem>
                    <div class="secret-row">
                      <div class="secret-info">
                        <hy-tag [color]="s.entityType === 'manager' ? 'blue' : 'purple'">{{ s.entityType }}</hy-tag>
                        <span class="entity-id">ID: {{ s.entityId }}</span>
                        <code class="secret-value">{{ s.secret }}</code>
                      </div>
                      <button mat-icon-button color="warn" (click)="removeSecret(s)">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </mat-list-item>
                }
              </mat-list>
            }
          </mat-card-content>
        </mat-card>
    </div>
  `,
  styles: `
    .dev-menu-container {
      padding: 24px;
      max-width: 720px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .form-row {
      display: flex;
      gap: 16px;
    }
    .form-row mat-form-field {
      flex: 1;
    }
    .full-width {
      width: 100%;
    }
    .form-actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }
    .empty-message {
      color: var(--hy-text-secondary, #666);
      padding: 16px 0;
    }
    .secret-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }
    .secret-info {
      display: flex;
      align-items: center;
      gap: 12px;
      overflow: hidden;
    }
    .entity-id {
      font-weight: 500;
      white-space: nowrap;
    }
    .secret-value {
      font-size: 12px;
      color: var(--hy-text-secondary, #888);
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `,
})
export class DevMenuComponent {
  newEntityType = 'manager';
  newEntityId = 1;
  newSecret = '';
  secrets = signal<StoredSecret[]>([]);

  constructor(private totpService: TotpService, private toast: HyToastService) {
    this.refreshSecrets();
  }

  implantSecret(): void {
    this.totpService.storeSecret(this.newEntityType, this.newEntityId, this.newSecret);
    this.toast.success(`Implanted ${this.newEntityType} secret for ID ${this.newEntityId}`);
    this.refreshSecrets();
    this.newSecret = '';
  }

  removeSecret(s: StoredSecret): void {
    this.totpService.removeSecret(s.entityType, s.entityId);
    this.toast.success(`Removed ${s.entityType} secret for ID ${s.entityId}`);
    this.refreshSecrets();
  }

  refreshSecrets(): void {
    const result: StoredSecret[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith('totp_')) continue;
      const match = key.match(/^totp_(manager|reportee)_(\d+)$/);
      if (!match) continue;
      result.push({
        key,
        entityType: match[1],
        entityId: +match[2],
        secret: localStorage.getItem(key) ?? '',
      });
    }
    result.sort((a, b) => a.entityType.localeCompare(b.entityType) || a.entityId - b.entityId);
    this.secrets.set(result);
  }
}
