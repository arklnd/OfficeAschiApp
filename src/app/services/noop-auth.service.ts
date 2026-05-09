import { Injectable } from '@angular/core';
import { Observable, of, NEVER } from 'rxjs';
import { HyAuthService } from '@hyland/ui/auth';

@Injectable()
export class NoopAuthService extends HyAuthService {
  authenticated$ = of(false);
  authenticated = false;
  idpUnreachable$ = NEVER as Observable<Error>;

  getIdToken(): string | undefined {
    return undefined;
  }

  getAccessToken(): string | undefined {
    return undefined;
  }

  async getUserProfile<T>(): Promise<T> {
    return {} as T;
  }

  login(): void {}

  async loginCallback(): Promise<undefined> {
    return undefined;
  }

  logout(): void {}
}
