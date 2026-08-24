import type { OAuthProvider } from './oauth-provider';
import type { User } from '../user/user.model';

export interface AuthProvider {
  login(email: string, password: string): Promise<User>;
  register(email: string, password: string): Promise<User>;
  loginWithOAuth(provider: OAuthProvider): Promise<User>;
  loginAnonymously(): Promise<User>;
  sendPasswordResetEmail(email: string): Promise<void>;
  confirmPasswordReset(oobCode: string, newPassword: string): Promise<void>;
  /** Reauthenticates (password re-entry for email/password accounts, an OAuth popup for others) before changing the password — Firebase rejects updatePassword() otherwise unless the session is very recent. */
  changePassword(newPassword: string, currentPassword?: string): Promise<void>;
  /** Reauthenticates the same way as changePassword, then permanently deletes the Firebase Auth account. Does not touch the user's Firestore document — callers must delete that separately. */
  deleteAccount(currentPassword?: string): Promise<void>;
  logout(): Promise<void>;
  currentUser(): User | null;
  /** Invoked whenever the underlying auth state changes (login, logout, or a session restored on load). Returns an unsubscribe function. */
  onAuthStateChange(callback: (user: User | null) => void): () => void;
}
