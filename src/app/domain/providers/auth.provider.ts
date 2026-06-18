import type { User } from '../models/user.model';

export interface AuthProvider {
  login(email: string, password: string): Promise<User>;
  register(email: string, password: string): Promise<User>;
  loginWithGoogle(): Promise<User>;
  logout(): Promise<void>;
  currentUser(): User | null;
}
