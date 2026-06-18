import { inject, Injectable, signal } from '@angular/core';
import { USER_REPOSITORY } from '../../core/configuration/tokens';
import type { User, UserId, UserSettings } from '../../domain/models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly userRepository = inject(USER_REPOSITORY);

  readonly profile = signal<User | null>(null);

  async loadProfile(id: UserId): Promise<void> {
    const user = await this.userRepository.getById(id);
    this.profile.set(user);
  }

  async updateProfile(user: User): Promise<void> {
    await this.userRepository.update(user);
    this.profile.set(user);
  }

  async updateSettings(settings: UserSettings): Promise<void> {
    const current = this.profile();
    if (!current) return;
    const updated: User = { ...current, settings };
    await this.userRepository.update(updated);
    this.profile.set(updated);
  }
}
