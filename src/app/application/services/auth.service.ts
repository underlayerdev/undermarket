import { inject, Injectable, signal } from '@angular/core';
import { AUTH_PROVIDER } from '../../core/configuration/tokens';
import type { OAuthProvider } from '../../domain/auth/oauth-provider';
import type { User } from '../../domain/user/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authProvider = inject(AUTH_PROVIDER);

  readonly currentUser = signal<User | null>(null);

  /** Resolves once the first auth-state emission (including a session restored from storage) has been applied. Guards should await this before reading currentUser(). */
  readonly ready: Promise<void>;

  constructor() {
    this.ready = new Promise<void>((resolve) => {
      this.authProvider.onAuthStateChange((user) => {
        this.currentUser.set(user);
        resolve();
      });
    });
  }

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

  async changePassword(newPassword: string, currentPassword?: string): Promise<void> {
    await this.authProvider.changePassword(newPassword, currentPassword);
  }

  async deleteAccount(currentPassword?: string): Promise<void> {
    await this.authProvider.deleteAccount(currentPassword);
    this.currentUser.set(null);
  }

  async logout(): Promise<void> {
    await this.authProvider.logout();
    this.currentUser.set(null);
  }
}
