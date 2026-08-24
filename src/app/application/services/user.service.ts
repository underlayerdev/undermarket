import { inject, Injectable, signal } from '@angular/core';
import { USER_REPOSITORY } from '../../core/configuration/tokens';
import type { User, UserId, UserSettings } from '../../domain/user/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly userRepository = inject(USER_REPOSITORY);

  readonly profile = signal<User | null>(null);

  async loadProfile(id: UserId): Promise<void> {
    const user = await this.userRepository.getById(id);
    this.profile.set(user);
  }

  /**
   * Returns the stored profile, writing one from the auth-derived user if this
   * account has never had a Firestore doc. Authentication alone does not create
   * one, so without this every read comes back null and nothing can be saved
   * against it.
   */
  async ensureProfile(user: User): Promise<User> {
    const existing = await this.userRepository.getById(user.id);
    if (existing) {
      this.profile.set(existing);
      return existing;
    }

    await this.userRepository.create(user);
    this.profile.set(user);
    return user;
  }

  async updateProfile(user: User): Promise<void> {
    await this.userRepository.update(user);
    this.profile.set(user);
  }

  /**
   * Takes the id explicitly rather than reading it off `profile()` so a
   * preference can be saved before (or without) the profile being loaded.
   */
  async updateSettings(id: UserId, settings: UserSettings): Promise<void> {
    await this.userRepository.updateSettings(id, settings);
    const current = this.profile();
    if (current?.id === id) {
      this.profile.set({ ...current, settings });
    }
  }

  async deleteAccount(id: UserId): Promise<void> {
    await this.userRepository.delete(id);
    this.profile.set(null);
  }
}
