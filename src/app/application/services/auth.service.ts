import { inject, Injectable, signal } from '@angular/core';
import { AUTH_PROVIDER } from '../../core/configuration/tokens';
import type { User } from '../../domain/models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authProvider = inject(AUTH_PROVIDER);

  readonly currentUser = signal<User | null>(null);

  async login(email: string, password: string): Promise<void> {
    const user = await this.authProvider.login(email, password);
    this.currentUser.set(user);
  }

  async register(email: string, password: string): Promise<void> {
    const user = await this.authProvider.register(email, password);
    this.currentUser.set(user);
  }

  async loginWithGoogle(): Promise<void> {
    const user = await this.authProvider.loginWithGoogle();
    this.currentUser.set(user);
  }

  async logout(): Promise<void> {
    await this.authProvider.logout();
    this.currentUser.set(null);
  }
}
