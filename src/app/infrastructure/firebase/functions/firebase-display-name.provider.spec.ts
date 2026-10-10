import { TestBed } from '@angular/core/testing';
import { httpsCallable } from 'firebase/functions';
import {
  DISPLAY_NAME_INVALID_CODE,
  FirebaseDisplayNameProvider,
} from './firebase-display-name.provider';
import { FIREBASE_FUNCTIONS } from '../../../core/configuration/tokens';

vi.mock('firebase/functions', () => ({ httpsCallable: vi.fn() }));

describe('FirebaseDisplayNameProvider', () => {
  const callMock = vi.fn();
  const functions = {} as never;

  function createProvider(): FirebaseDisplayNameProvider {
    vi.mocked(httpsCallable).mockReturnValue(callMock as never);
    TestBed.configureTestingModule({
      providers: [{ provide: FIREBASE_FUNCTIONS, useValue: functions }],
    });
    return TestBed.inject(FirebaseDisplayNameProvider);
  }

  beforeEach(() => {
    callMock.mockReset();
  });

  it('should call the changeDisplayName callable and return the stored name', async () => {
    callMock.mockResolvedValue({ data: { displayName: 'José María' } });

    const result = await createProvider().change('  José   María ');

    expect(httpsCallable).toHaveBeenCalledWith(functions, 'changeDisplayName');
    expect(callMock).toHaveBeenCalledWith({ displayName: '  José   María ' });
    expect(result).toEqual({ displayName: 'José María' });
  });

  it('should turn a refused name into the display-name-invalid error', async () => {
    callMock.mockRejectedValue({ code: 'functions/invalid-argument' });

    await expect(createProvider().change('Admin')).rejects.toMatchObject({
      code: DISPLAY_NAME_INVALID_CODE,
    });
  });

  it('should let any other failure through unchanged', async () => {
    const failure = { code: 'functions/unavailable' };
    callMock.mockRejectedValue(failure);

    await expect(createProvider().change('Jane Doe')).rejects.toBe(failure);
  });
});
