import { inject, Injectable } from '@angular/core';
import {
  Auth,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  FacebookAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  OAuthProvider as FirebaseOAuthProvider,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { FIREBASE_AUTH } from '../../../core/configuration/tokens';
import type { AuthProvider } from '../../../domain/providers/auth.provider';
import type { OAuthProvider } from '../../../domain/models/oauth-provider';
import type { User } from '../../../domain/models/user.model';

const oauthProviderMap = {
  google: () => new GoogleAuthProvider(),
  apple: () => new FirebaseOAuthProvider('apple.com'),
  facebook: () => new FacebookAuthProvider(),
};

@Injectable({ providedIn: null })
export class FirebaseAuthProvider implements AuthProvider {
  private readonly auth: Auth = inject(FIREBASE_AUTH);

  async login(email: string, password: string): Promise<User> {
    const { user } = await signInWithEmailAndPassword(this.auth, email, password);
    return this.mapUser(user);
  }

  async register(email: string, password: string): Promise<User> {
    const { user } = await createUserWithEmailAndPassword(this.auth, email, password);
    await updateProfile(user, { displayName: email.split('@')[0] });
    return this.mapUser(user);
  }

  async loginWithOAuth(provider: OAuthProvider): Promise<User> {
    const { user } = await signInWithPopup(this.auth, oauthProviderMap[provider]());
    return this.mapUser(user);
  }

  async loginAnonymously(): Promise<User> {
    const { user } = await signInAnonymously(this.auth);
    return this.mapUser(user);
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email);
  }

  async confirmPasswordReset(oobCode: string, newPassword: string): Promise<void> {
    await confirmPasswordReset(this.auth, oobCode, newPassword);
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
  }

  currentUser(): User | null {
    const user = this.auth.currentUser;
    return user ? this.mapUser(user) : null;
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(this.auth, (firebaseUser) => {
      callback(firebaseUser ? this.mapUser(firebaseUser) : null);
    });
  }

  private mapUser(firebaseUser: import('firebase/auth').User): User {
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email ?? '',
      displayName: firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'Anonymous',
      photoUrl: firebaseUser.photoURL ?? undefined,
      settings: { theme: 'light', language: 'en' },
      createdAt: new Date(firebaseUser.metadata.creationTime ?? Date.now()),
    };
  }
}
