import { User } from './user.model';

export function getInitials(user: User | null | undefined): string | undefined {
  const trimmedName = user?.displayName.trim();
  return trimmedName ? trimmedName.charAt(0).toUpperCase() : undefined;
}

/**
 * Whether a user has genuinely completed onboarding — the flag alone isn't
 * enough, since a real display name is what onboarding actually exists to
 * collect. Guards use this rather than `user.onboarded` directly so an
 * account can never end up permanently "onboarded" with no name (a future
 * bug, a manually-edited doc) — that combination just re-enters onboarding.
 */
export function isFullyOnboarded(user: User | null): boolean {
  return !!user?.onboarded && !!user.displayName?.trim();
}
