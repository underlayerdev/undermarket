import { TestBed } from '@angular/core/testing';
import * as functionsModule from 'firebase/functions';
import { FIREBASE_FUNCTIONS } from '../../../core/configuration/tokens';
import { FirebaseUsernameProvider } from './firebase-username.provider';

vi.mock('firebase/functions', () => ({ httpsCallable: vi.fn() }));

describe('FirebaseUsernameProvider', () => {
  function createProvider(): FirebaseUsernameProvider {
    TestBed.configureTestingModule({ providers: [{ provide: FIREBASE_FUNCTIONS, useValue: {} }] });
    return TestBed.inject(FirebaseUsernameProvider);
  }

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call claimUsername and convert the millis timestamp to a Date', async () => {
    const call = vi.fn().mockResolvedValue({
      data: { username: 'jane.doe', usernameChangedAt: Date.UTC(2026, 9, 8) },
    });
    vi.mocked(functionsModule.httpsCallable).mockReturnValue(call as never);

    const result = await createProvider().claim('jane.doe');

    expect(functionsModule.httpsCallable).toHaveBeenCalledWith({}, 'claimUsername');
    expect(call).toHaveBeenCalledWith({ username: 'jane.doe' });
    expect(result).toEqual({
      username: 'jane.doe',
      usernameChangedAt: new Date(Date.UTC(2026, 9, 8)),
    });
  });

  it('should propagate the callable error', async () => {
    const error = { code: 'functions/already-exists' };
    vi.mocked(functionsModule.httpsCallable).mockReturnValue(
      vi.fn().mockRejectedValue(error) as never,
    );

    await expect(createProvider().claim('taken')).rejects.toBe(error);
  });
});
