import type { OAuthProvider } from '../models/oauth-provider';
import type { User } from '../models/user.model';

export interface AuthProvider {
  login(email: string, password: string): Promise<User>;
  register(email: string, password: string): Promise<User>;
  loginWithOAuth(provider: OAuthProvider): Promise<User>;
  loginAnonymously(): Promise<User>;
  logout(): Promise<void>;
  currentUser(): User | null;
}
