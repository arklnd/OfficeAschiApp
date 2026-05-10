import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { HyMaterialFormFieldModule, HyMaterialIconModule } from '@hyland/ui/material';
import { IMaskModule } from 'angular-imask';

const TOTP_MASK = {
  mask: '000000',
};

@Component({
  selector: 'app-totp-code-input',
  standalone: true,
  imports: [MatFormFieldModule, MatIconModule, MatInputModule, HyMaterialFormFieldModule, HyMaterialIconModule, IMaskModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => TotpCodeInputComponent),
    multi: true,
  }],
  template: `
    <mat-form-field hyFormField [class]="fieldClass">
      <mat-label>{{ label }}</mat-label>
      <mat-icon matPrefix hyIcon>key</mat-icon>
      <input matInput
        [imask]="totpMask"
        (accept)="onAccept($event)"
        (blur)="onTouched()"
        (keydown.enter)="submitted.emit()"
        placeholder="000000"
        autocomplete="off"
        inputmode="numeric" />
    </mat-form-field>
  `,
})
export class TotpCodeInputComponent implements ControlValueAccessor {
  @Input() label = 'TOTP Code';
  @Input() fieldClass = '';
  @Output() submitted = new EventEmitter<void>();

  totpMask = TOTP_MASK;
  value = '';
  private onChange: (val: string) => void = () => {};
  onTouched: () => void = () => {};

  onAccept(event: any): void {
    this.value = event ?? '';
    this.onChange(this.value);
  }

  writeValue(val: string): void {
    this.value = val ?? '';
  }

  registerOnChange(fn: (val: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}
