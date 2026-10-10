import { inject, Injectable } from '@angular/core';
import { httpsCallable, Functions } from 'firebase/functions';
import { FIREBASE_FUNCTIONS } from '../../../core/configuration/tokens';
import type {
  ChangeDisplayNameResult,
  DisplayNameProvider,
} from '../../../domain/user/display-name.provider';

/** Thrown for `functions/invalid-argument`, which for this callable only ever means a refused name. */
export const DISPLAY_NAME_INVALID_CODE = 'user/display-name-invalid';

@Injectable({ providedIn: 'root' })
export class FirebaseDisplayNameProvider implements DisplayNameProvider {
  private readonly functions: Functions = inject(FIREBASE_FUNCTIONS);

  async change(displayName: string): Promise<ChangeDisplayNameResult> {
    const call = httpsCallable<{ displayName: string }, { displayName: string }>(
      this.functions,
      'changeDisplayName',
    );
    try {
      const result = await call({ displayName });
      return { displayName: result.data.displayName };
    } catch (err) {
      if ((err as { code?: string }).code === 'functions/invalid-argument') {
        throw Object.assign(new Error('Display name rejected.'), {
          code: DISPLAY_NAME_INVALID_CODE,
          cause: err,
        });
      }
      throw err;
    }
  }
}
