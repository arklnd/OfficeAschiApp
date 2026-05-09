import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { EMPTY, switchMap } from 'rxjs';
import { TOTP_ENTITY_TYPE, TOTP_ENTITY_ID, TOTP_ENTITY_NAME, TOTP_ACTION_REASON } from './totp.context';
import { TotpService } from './totp.service';
import { TotpPromptDialogComponent } from '../dialogs/totp-prompt-dialog.component';
import { configureHyDialogOptions } from '@hyland/ui/dialog';

export const totpInterceptor: HttpInterceptorFn = (req, next) => {
  const entityType = req.context.get(TOTP_ENTITY_TYPE);
  const entityId = req.context.get(TOTP_ENTITY_ID);

  if (!entityType || !entityId) {
    return next(req);
  }

  const totpService = inject(TotpService);
  const secret = totpService.getSecret(entityType, entityId);

  if (secret) {
    const code = totpService.generateCode(secret);
    const authReq = req.clone({
      setHeaders: { Authorization: `TOTP ${entityType}:${entityId}:${code}` },
    });
    return next(authReq);
  }

  // No secret in localStorage — prompt user for manual code entry
  const dialog = inject(MatDialog);
  const entityName = req.context.get(TOTP_ENTITY_NAME);
  const actionReason = req.context.get(TOTP_ACTION_REASON);
  const dialogRef = dialog.open(TotpPromptDialogComponent, configureHyDialogOptions({
    data: { entityType, entityId, entityName, actionReason },
  }));

  return dialogRef.afterClosed().pipe(
    switchMap((code: string | null) => {
      if (!code) return EMPTY;
      const authReq = req.clone({
        setHeaders: { Authorization: `TOTP ${entityType}:${entityId}:${code}` },
      });
      return next(authReq);
    }),
  );
};
