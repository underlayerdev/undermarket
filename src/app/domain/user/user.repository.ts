import type { User, UserId, UserSettings } from './user.model';

export interface UserRepository {
  getById(id: UserId): Promise<User | null>;
  create(user: User): Promise<void>;
  update(user: User): Promise<void>;
  /** Persists only the settings, so a preference can be saved without the rest of the profile. */
  updateSettings(id: UserId, settings: UserSettings): Promise<void>;
  delete(id: UserId): Promise<void>;
}
