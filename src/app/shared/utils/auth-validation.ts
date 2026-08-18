const EMAIL_PATTERN = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;
const PASSWORD_MIN_LENGTH = 6;

export function isValidEmail(value: string): boolean {
  return !!value.trim() && EMAIL_PATTERN.test(value.trim());
}

export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return $localize`:@@auth.emailRequired:Email is required.`;
  if (!EMAIL_PATTERN.test(trimmed)) {
    return $localize`:@@auth.emailInvalid:Please enter a valid email address.`;
  }
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return $localize`:@@auth.passwordRequired:Password is required.`;
  if (value.length < PASSWORD_MIN_LENGTH) {
    return $localize`:@@auth.passwordTooShort:Password must be at least ${PASSWORD_MIN_LENGTH}:minLength: characters.`;
  }
  return null;
}

export function validateConfirmPassword(
  confirmValue: string,
  passwordValue: string,
): string | null {
  if (!confirmValue)
    return $localize`:@@auth.confirmPasswordRequired:Please confirm your password.`;
  if (confirmValue !== passwordValue) {
    return $localize`:@@auth.passwordsDoNotMatch:Passwords do not match.`;
  }
  return null;
}
