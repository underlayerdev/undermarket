import { inject, Injectable } from '@angular/core';
import { httpsCallable, Functions } from 'firebase/functions';
import { FIREBASE_FUNCTIONS } from '../../../core/configuration/tokens';
import type { ClaimUsernameResult, UsernameProvider } from '../../../domain/user/username.provider';

@Injectable({ providedIn: 'root' })
export class FirebaseUsernameProvider implements UsernameProvider {
  private readonly functions: Functions = inject(FIREBASE_FUNCTIONS);

  async claim(username: string): Promise<ClaimUsernameResult> {
    const call = httpsCallable<
      { username: string },
      { username: string; usernameChangedAt: number }
    >(this.functions, 'claimUsername');
    const result = await call({ username });
    return {
      username: result.data.username,
      usernameChangedAt: new Date(result.data.usernameChangedAt),
    };
  }
}
