import { inject, Injectable } from '@angular/core';
import {
  Auth,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  FacebookAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  OAuthProvider as FirebaseOAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { FIREBASE_AUTH } from '../../../core/configuration/tokens';
import { DEFAULT_LANGUAGE } from '../../../core/i18n/languages';
import type { AuthProvider } from '../../../domain/auth/auth.provider';
import type { OAuthProvider } from '../../../domain/auth/oauth-provider';
import type { AuthProviderId, User } from '../../../domain/user/user.model';

const oauthProviderMap = {
  google: () => new GoogleAuthProvider(),
  apple: () => new FirebaseOAuthProvider('apple.com'),
  facebook: () => new FacebookAuthProvider(),
};

// Maps a Firebase providerData providerId back to the OAuth popup provider
// needed to reauthenticate — password accounts reauth with a credential
// instead, handled separately in reauthenticate().
const providerIdToOAuthProvider: Partial<
  Record<string, () => import('firebase/auth').AuthProvider>
> = {
  'google.com': oauthProviderMap.google,
  'apple.com': oauthProviderMap.apple,
  'facebook.com': oauthProviderMap.facebook,
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

  async changePassword(newPassword: string, currentPassword?: string): Promise<void> {
    const user = this.requireCurrentFirebaseUser();
    await this.reauthenticate(user, currentPassword);
    await updatePassword(user, newPassword);
  }

  async deleteAccount(currentPassword?: string): Promise<void> {
    const user = this.requireCurrentFirebaseUser();
    await this.reauthenticate(user, currentPassword);
    await deleteUser(user);
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

  private requireCurrentFirebaseUser(): FirebaseUser {
    const user = this.auth.currentUser;
    if (!user) throw new Error('No user is currently signed in.');
    return user;
  }

  // Firebase rejects updatePassword()/deleteUser() with auth/requires-recent-login
  // unless the session is very recent — reauthenticate first, either with the
  // user's current password (password accounts) or by re-triggering the OAuth
  // popup (Google/Apple/Facebook accounts, which never have a password here).
  private async reauthenticate(user: FirebaseUser, currentPassword?: string): Promise<void> {
    const providerId = user.providerData[0]?.providerId;
    if (providerId === 'password') {
      if (!currentPassword) throw new Error('Current password is required.');
      const credential = EmailAuthProvider.credential(user.email ?? '', currentPassword);
      await reauthenticateWithCredential(user, credential);
      return;
    }
    const oauthProvider = providerId ? providerIdToOAuthProvider[providerId] : undefined;
    if (!oauthProvider) throw new Error('This account cannot be reauthenticated.');
    await reauthenticateWithPopup(user, oauthProvider());
  }

  private mapUser(firebaseUser: FirebaseUser): User {
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email ?? '',
      displayName: firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'Anonymous',
      photoUrl: firebaseUser.photoURL ?? undefined,
      // Auth carries no preferences — the stored language lives on the
      // Firestore profile, which LanguageService reads once a session exists.
      // This is only the value a brand-new profile is seeded with.
      settings: { language: DEFAULT_LANGUAGE },
      providerId: firebaseUser.isAnonymous
        ? 'anonymous'
        : ((firebaseUser.providerData[0]?.providerId as AuthProviderId) ?? 'password'),
      createdAt: new Date(firebaseUser.metadata.creationTime ?? Date.now()),
    };
  }
}
