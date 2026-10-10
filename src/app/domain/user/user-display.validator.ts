import type { TranslocoService } from '@jsverse/transloco';
import {
  getDisplayNameFormatError,
  MAX_REPEATED_CHARACTER_RUN,
  normalizeDisplayName,
} from './display-name';
import { DISPLAY_NAME_MAX_LENGTH, DISPLAY_NAME_MIN_LENGTH } from './user-constraints';

// Shared by onboarding's name step and the profile settings page — both
// collect the same User.displayName field and must apply the same rule.
// The length limits are also enforced server-side in firestore.rules; the
// rest of the format is only checked here (see display-name.ts), so this is
// the one place that decides what a display name may look like.
export function validateDisplayName(value: string, transloco: TranslocoService): string | null {
  const error = getDisplayNameFormatError(normalizeDisplayName(value));
  if (!error) return null;
  return transloco.translate(`user.displayName.${error}`, {
    minLength: DISPLAY_NAME_MIN_LENGTH,
    maxLength: DISPLAY_NAME_MAX_LENGTH,
    maxRun: MAX_REPEATED_CHARACTER_RUN,
  });
}
