import { TestBed } from '@angular/core/testing';
import * as firebaseAuthModule from 'firebase/auth';
import { FirebaseAuthProvider } from './firebase-auth.provider';
import { FIREBASE_AUTH } from '../../../core/configuration/tokens';

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
  updatePassword: vi.fn().mockResolvedValue(undefined),
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

  it('should expose only the session identity, never profile data', () => {
    const provider = createProvider({
      uid: 'user-1',
      email: 'jane@example.com',
      displayName: 'Jane Doe',
      photoURL: 'https://example.com/jane.jpg',
      isAnonymous: false,
      providerData: [{ providerId: 'google.com' }],
      metadata: { creationTime: '2026-01-01T00:00:00Z' },
    });

    expect(provider.currentUser()).toEqual({ id: 'user-1', providerId: 'google.com' });
  });

  it('should map an anonymous user to the anonymous provider', () => {
    const provider = createProvider({ uid: 'user-1', isAnonymous: true, providerData: [] });

    expect(provider.currentUser()).toEqual({ id: 'user-1', providerId: 'anonymous' });
  });

  it('should fall back to the password provider when none is listed', () => {
    const provider = createProvider({ uid: 'user-1', isAnonymous: false, providerData: [] });

    expect(provider.currentUser()?.providerId).toBe('password');
  });

  it('should return null when nobody is signed in', () => {
    expect(createProvider(null).currentUser()).toBeNull();
  });

  it('should map auth state changes to AuthUser, and sign-out to null', () => {
    vi.mocked(firebaseAuthModule.onAuthStateChanged).mockImplementation(((
      _auth: unknown,
      next: (user: unknown) => void,
    ) => {
      next({ uid: 'user-1', isAnonymous: false, providerData: [{ providerId: 'password' }] });
      next(null);
      return () => undefined;
    }) as never);
    const callback = vi.fn();

    createProvider(null).onAuthStateChange(callback);

    expect(callback).toHaveBeenNthCalledWith(1, { id: 'user-1', providerId: 'password' });
    expect(callback).toHaveBeenNthCalledWith(2, null);
  });

  it('should throw when changing the password with no user signed in', async () => {
    await expect(createProvider(null).changePassword('new-password')).rejects.toThrow(
      'No user is currently signed in.',
    );
    expect(firebaseAuthModule.updatePassword).not.toHaveBeenCalled();
  });
});
