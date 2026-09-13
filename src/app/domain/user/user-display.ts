import { User } from './user.model';

export function getInitials(user: User | null | undefined): string | undefined {
  const trimmedName = user?.displayName.trim();
  return trimmedName ? trimmedName.charAt(0).toUpperCase() : undefined;
}
