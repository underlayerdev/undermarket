import { Injectable } from '@angular/core';

const ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': $localize`:@@errors.emailInUse:This email address is already registered.`,
  'auth/wrong-password': $localize`:@@errors.wrongPassword:Incorrect password. Please try again.`,
  'auth/user-not-found': $localize`:@@errors.userNotFound:No account found with this email address.`,
  'auth/invalid-credential': $localize`:@@errors.invalidCredential:Incorrect email or password. If you signed up with Google, use the button above instead.`,
  'auth/weak-password': $localize`:@@errors.weakPassword:Password is too weak. Use at least 6 characters.`,
  'auth/invalid-email': $localize`:@@auth.emailInvalid:Please enter a valid email address.`,
  'permission-denied': $localize`:@@errors.permissionDenied:You do not have permission to perform this action.`,
  'not-found': $localize`:@@errors.notFound:The requested resource was not found.`,
};

const FALLBACK_MESSAGE = $localize`:@@errors.fallback:Something went wrong. Please try again.`;

@Injectable({ providedIn: 'root' })
export class ErrorService {
  toUserMessage(error: unknown): string {
    if (error instanceof Error) {
      for (const code of Object.keys(ERROR_MESSAGES)) {
        if (error.message.includes(code)) {
          return ERROR_MESSAGES[code];
        }
      }
    }

    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = (error as { code: string }).code;
      return ERROR_MESSAGES[code] ?? FALLBACK_MESSAGE;
    }

    return FALLBACK_MESSAGE;
  }
}
