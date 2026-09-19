import type { TranslocoService } from '@jsverse/transloco';
import { DISPLAY_NAME_MAX_LENGTH, DISPLAY_NAME_MIN_LENGTH } from './user-constraints';

// Shared by onboarding's name step and the account settings page — both
// collect the same User.displayName field and must apply the same rule.
// Mirrors the constraints enforced server-side in firestore.rules — this is
// a defensive re-check before writing, not the security boundary itself.
export function validateDisplayName(value: string, transloco: TranslocoService): string | null {
  const trimmed = value.trim();
  if (!trimmed) return transloco.translate('user.displayName.required');
  if (trimmed.length < DISPLAY_NAME_MIN_LENGTH) {
    return transloco.translate('user.displayName.tooShort', {
      minLength: DISPLAY_NAME_MIN_LENGTH,
    });
  }
  if (trimmed.length > DISPLAY_NAME_MAX_LENGTH) {
    return transloco.translate('user.displayName.tooLong', {
      maxLength: DISPLAY_NAME_MAX_LENGTH,
    });
  }
  return null;
}
