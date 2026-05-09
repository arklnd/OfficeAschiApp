import { HttpContextToken } from '@angular/common/http';

export const TOTP_ENTITY_TYPE = new HttpContextToken<string>(() => '');
export const TOTP_ENTITY_ID = new HttpContextToken<number>(() => 0);
export const TOTP_ENTITY_NAME = new HttpContextToken<string>(() => '');
