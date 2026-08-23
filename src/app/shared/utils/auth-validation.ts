import type { TranslocoService } from '@jsverse/transloco';

const EMAIL_PATTERN = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;
const PASSWORD_MIN_LENGTH = 6;

export function isValidEmail(value: string): boolean {
  return !!value.trim() && EMAIL_PATTERN.test(value.trim());
}

export function validateEmail(value: string, transloco: TranslocoService): string | null {
  const trimmed = value.trim();
  if (!trimmed) return transloco.translate('auth.emailRequired');
  if (!EMAIL_PATTERN.test(trimmed)) {
    return transloco.translate('auth.emailInvalid');
  }
  return null;
}

export function validatePassword(value: string, transloco: TranslocoService): string | null {
  if (!value) return transloco.translate('auth.passwordRequired');
  if (value.length < PASSWORD_MIN_LENGTH) {
    return transloco.translate('auth.passwordTooShort', { minLength: PASSWORD_MIN_LENGTH });
  }
  return null;
}

export function validateConfirmPassword(
  confirmValue: string,
  passwordValue: string,
  transloco: TranslocoService,
): string | null {
  if (!confirmValue) return transloco.translate('auth.confirmPasswordRequired');
  if (confirmValue !== passwordValue) {
    return transloco.translate('auth.passwordsDoNotMatch');
  }
  return null;
}
