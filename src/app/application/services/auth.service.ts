import { inject, Injectable, signal } from '@angular/core';
import { AUTH_PROVIDER } from '../../core/configuration/tokens';
import type { OAuthProvider } from '../../domain/models/oauth-provider';
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

  async loginWithOAuth(provider: OAuthProvider): Promise<void> {
    const user = await this.authProvider.loginWithOAuth(provider);
    this.currentUser.set(user);
  }

  async loginAnonymously(): Promise<void> {
    const user = await this.authProvider.loginAnonymously();
    this.currentUser.set(user);
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    await this.authProvider.sendPasswordResetEmail(email);
  }

  async confirmPasswordReset(oobCode: string, newPassword: string): Promise<void> {
    await this.authProvider.confirmPasswordReset(oobCode, newPassword);
  }

  async logout(): Promise<void> {
    await this.authProvider.logout();
    this.currentUser.set(null);
  }
}
