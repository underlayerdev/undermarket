import { Injectable } from '@angular/core';

const ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'This email address is already registered.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/user-not-found': 'No account found with this email address.',
  'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
  'permission-denied': 'You do not have permission to perform this action.',
  'not-found': 'The requested resource was not found.',
};

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

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
