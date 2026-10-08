import type { User, UserId, UserSettings } from './user.model';

export interface UserRepository {
  getById(id: UserId): Promise<User | null>;
  /**
   * Resolves a handle to its owner. Also resolves a handle its owner gave
   * up recently (it's still reserved for them), so callers should compare
   * against the returned user's current `username` to redirect old links.
   */
  getByUsername(username: string): Promise<User | null>;
  /** True when `userId` could claim `username` right now (free, expired, or already theirs). */
  isUsernameAvailable(username: string, userId: UserId): Promise<boolean>;
  update(user: Partial<User>): Promise<void>;
  /** Persists only the settings, so a preference can be saved without the rest of the profile. */
  updateSettings(id: UserId, settings: UserSettings): Promise<void>;
  delete(id: UserId): Promise<void>;
}
