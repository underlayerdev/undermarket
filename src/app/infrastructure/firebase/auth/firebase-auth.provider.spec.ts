import { TestBed } from '@angular/core/testing';
import * as firebaseAuthModule from 'firebase/auth';
import { FirebaseAuthProvider } from './firebase-auth.provider';
import { FIREBASE_AUTH } from '../../../core/configuration/tokens';

vi.mock('firebase/auth', () => ({
  updateProfile: vi.fn().mockResolvedValue(undefined),
}));

describe('FirebaseAuthProvider', () => {
  function createProvider(currentUser: unknown): FirebaseAuthProvider {
    TestBed.configureTestingModule({
      providers: [FirebaseAuthProvider, { provide: FIREBASE_AUTH, useValue: { currentUser } }],
    });
    return TestBed.inject(FirebaseAuthProvider);
  }

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should update the display name on the current Firebase user', async () => {
    const firebaseUser = { uid: 'user-1' };
    const provider = createProvider(firebaseUser);

    await provider.updateDisplayName('New Name');

    expect(firebaseAuthModule.updateProfile).toHaveBeenCalledWith(firebaseUser, {
      displayName: 'New Name',
    });
  });

  it('should throw when no user is currently signed in', async () => {
    const provider = createProvider(null);

    await expect(provider.updateDisplayName('New Name')).rejects.toThrow(
      'No user is currently signed in.',
    );
    expect(firebaseAuthModule.updateProfile).not.toHaveBeenCalled();
  });
});
