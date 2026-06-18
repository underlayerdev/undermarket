// TODO: inject Firebase SDK — import { Auth, signInWithEmailAndPassword, ... } from 'firebase/auth'
import { Injectable } from '@angular/core';
import type { AuthProvider } from '../../../domain/providers/auth.provider';
import type { User } from '../../../domain/models/user.model';

@Injectable({ providedIn: null })
export class FirebaseAuthProvider implements AuthProvider {
  login(_email: string, _password: string): Promise<User> {
    throw new Error('Not implemented');
  }

  register(_email: string, _password: string): Promise<User> {
    throw new Error('Not implemented');
  }

  loginWithGoogle(): Promise<User> {
    throw new Error('Not implemented');
  }

  logout(): Promise<void> {
    throw new Error('Not implemented');
  }

  currentUser(): User | null {
    // TODO: return Firebase Auth currentUser mapped to domain User
    return null;
  }
}
