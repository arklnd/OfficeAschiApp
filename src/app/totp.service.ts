import { Injectable } from '@angular/core';
import * as OTPAuth from 'otpauth';

@Injectable({ providedIn: 'root' })
export class TotpService {

  generateSecret(): string {
    const secret = new OTPAuth.Secret({ size: 20 });
    return secret.base32;
  }

  generateCode(base32Secret: string): string {
    const totp = new OTPAuth.TOTP({
      issuer: 'OfficeAschi',
      label: 'OfficeAschi',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(base32Secret),
    });
    return totp.generate();
  }

  validate(base32Secret: string, code: string): boolean {
    const totp = new OTPAuth.TOTP({
      issuer: 'OfficeAschi',
      label: 'OfficeAschi',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(base32Secret),
    });
    const delta = totp.validate({ token: code, window: 1 });
    return delta !== null;
  }

  getOtpAuthUri(base32Secret: string, label: string): string {
    const totp = new OTPAuth.TOTP({
      issuer: 'OfficeAschi',
      label,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(base32Secret),
    });
    return totp.toString();
  }

  // localStorage management
  storeSecret(entityType: string, entityId: number, secret: string): void {
    localStorage.setItem(`totp_${entityType}_${entityId}`, secret);
  }

  getSecret(entityType: string, entityId: number): string | null {
    return localStorage.getItem(`totp_${entityType}_${entityId}`);
  }

  removeSecret(entityType: string, entityId: number): void {
    localStorage.removeItem(`totp_${entityType}_${entityId}`);
  }
}
