import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { AUTH_PROVIDER } from '../../core/configuration/tokens';
import type { AuthProvider } from '../../domain/auth/auth.provider';
import type { User } from '../../domain/user/user.model';

const testUser: User = {
  id: 'u1',
  email: 'test@example.com',
  displayName: 'Test User',
  settings: { theme: 'light', language: 'en' },
  createdAt: new Date(),
};

function createAuthProviderMock(): AuthProvider & { emitAuthState: (user: User | null) => void } {
  let listener: ((user: User | null) => void) | null = null;
  return {
    login: async () => testUser,
    register: async () => testUser,
    loginWithOAuth: async () => testUser,
    loginAnonymously: async () => testUser,
    sendPasswordResetEmail: async () => undefined,
    confirmPasswordReset: async () => undefined,
    logout: async () => undefined,
    currentUser: () => null,
    onAuthStateChange: (callback) => {
      listener = callback;
      return () => {
        listener = null;
      };
    },
    emitAuthState: (user) => listener?.(user),
  };
}

describe('AuthService', () => {
  let authProviderMock: ReturnType<typeof createAuthProviderMock>;

  function setup(): AuthService {
    authProviderMock = createAuthProviderMock();
    TestBed.configureTestingModule({
      providers: [{ provide: AUTH_PROVIDER, useValue: authProviderMock }],
    });
    return TestBed.inject(AuthService);
  }

  it('should create', () => {
    expect(setup()).toBeTruthy();
  });

  it('should resolve ready and set currentUser once the provider emits a restored session', async () => {
    const service = setup();

    expect(service.currentUser()).toBeNull();
    authProviderMock.emitAuthState(testUser);
    await service.ready;

    expect(service.currentUser()).toEqual(testUser);
  });

  it('should resolve ready with a null user when no session is restored', async () => {
    const service = setup();

    authProviderMock.emitAuthState(null);
    await service.ready;

    expect(service.currentUser()).toBeNull();
  });

  it('should update currentUser on login', async () => {
    const service = setup();
    authProviderMock.emitAuthState(null);
    await service.ready;

    await service.login('test@example.com', 'password123');

    expect(service.currentUser()).toEqual(testUser);
  });

  it('should clear currentUser on logout', async () => {
    const service = setup();
    authProviderMock.emitAuthState(testUser);
    await service.ready;

    await service.logout();

    expect(service.currentUser()).toBeNull();
  });
});
