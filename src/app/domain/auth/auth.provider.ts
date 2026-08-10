import type { OAuthProvider } from './oauth-provider';
import type { User } from '../user/user.model';

export interface AuthProvider {
  login(email: string, password: string): Promise<User>;
  register(email: string, password: string): Promise<User>;
  loginWithOAuth(provider: OAuthProvider): Promise<User>;
  loginAnonymously(): Promise<User>;
  sendPasswordResetEmail(email: string): Promise<void>;
  confirmPasswordReset(oobCode: string, newPassword: string): Promise<void>;
  logout(): Promise<void>;
  currentUser(): User | null;
  /** Invoked whenever the underlying auth state changes (login, logout, or a session restored on load). Returns an unsubscribe function. */
  onAuthStateChange(callback: (user: User | null) => void): () => void;
}
