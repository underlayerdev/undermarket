import type { TranslocoService } from '@jsverse/transloco';
import { getUsernameFormatError } from './username';
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from './user-constraints';

// Format-only, like validateDisplayName — whether the handle is actually
// free is a server question (see claimUsername), so availability is a
// separate async check, not part of this.
export function validateUsername(username: string, transloco: TranslocoService): string | null {
  const error = getUsernameFormatError(username);
  if (!error) return null;
  return transloco.translate(`user.username.${error}`, {
    minLength: USERNAME_MIN_LENGTH,
    maxLength: USERNAME_MAX_LENGTH,
  });
}
