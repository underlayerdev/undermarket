import type { OAuthProvider } from './oauth-provider';
import type { AuthUser } from '../user/user.model';

export interface AuthProvider {
  login(email: string, password: string): Promise<AuthUser>;
  register(email: string, password: string): Promise<AuthUser>;
  loginWithOAuth(provider: OAuthProvider): Promise<AuthUser>;
  loginAnonymously(): Promise<AuthUser>;
  sendPasswordResetEmail(email: string): Promise<void>;
  confirmPasswordReset(oobCode: string, newPassword: string): Promise<void>;
  /** Reauthenticates (password re-entry for email/password accounts, an OAuth popup for others) before changing the password — Firebase rejects updatePassword() otherwise unless the session is very recent. */
  changePassword(newPassword: string, currentPassword?: string): Promise<void>;
  /** Reauthenticates the same way as changePassword, then permanently deletes the Firebase Auth account. Does not touch the user's Firestore document — callers must delete that separately. */
  deleteAccount(currentPassword?: string): Promise<void>;
  logout(): Promise<void>;
  currentUser(): AuthUser | null;
  /** Invoked whenever the underlying auth state changes (login, logout, or a session restored on load). Returns an unsubscribe function. */
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void;
}
