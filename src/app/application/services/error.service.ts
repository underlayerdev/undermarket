import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

const ERROR_KEYS: Record<string, string> = {
  'auth/email-already-in-use': 'errors.emailInUse',
  'auth/wrong-password': 'errors.wrongPassword',
  'auth/user-not-found': 'errors.userNotFound',
  'auth/invalid-credential': 'errors.invalidCredential',
  'auth/weak-password': 'errors.weakPassword',
  'auth/invalid-email': 'auth.emailInvalid',
  'permission-denied': 'errors.permissionDenied',
  'not-found': 'errors.notFound',
};

const FALLBACK_KEY = 'errors.fallback';

@Injectable({ providedIn: 'root' })
export class ErrorService {
  private readonly transloco = inject(TranslocoService);

  toUserMessage(error: unknown): string {
    if (error instanceof Error) {
      for (const code of Object.keys(ERROR_KEYS)) {
        if (error.message.includes(code)) {
          return this.transloco.translate(ERROR_KEYS[code]);
        }
      }
    }

    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = (error as { code: string }).code;
      const key = ERROR_KEYS[code] ?? FALLBACK_KEY;
      return this.transloco.translate(key);
    }

    return this.transloco.translate(FALLBACK_KEY);
  }
}
