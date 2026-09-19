import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { LanguageService } from './language.service';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { LANGUAGE_STORAGE_KEY } from '../../core/i18n/languages';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';
import { installFakeLocalStorage } from '../../../testing/fake-local-storage';
import { mockUser } from '../../domain/user/user.mock';
import type { User } from '../../domain/user/user.model';

describe('LanguageService', () => {
  let currentUser: ReturnType<typeof signal<User | null>>;
  let profile: ReturnType<typeof signal<User | null>>;
  let loadProfileSpy: ReturnType<typeof vi.fn>;
  let updateSettingsSpy: ReturnType<typeof vi.fn>;
  let transloco: TranslocoService;

  /** `storedProfile` is what loadProfile resolves with — null means "doesn't exist yet". */
  function setup(storedProfile: User | null = null) {
    currentUser = signal<User | null>(null);
    profile = signal<User | null>(null);
    updateSettingsSpy = vi.fn().mockResolvedValue(undefined);
    loadProfileSpy = vi.fn().mockImplementation(async () => {
      profile.set(storedProfile);
    });

    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [
        { provide: AuthService, useValue: { currentUser } },
        {
          provide: UserService,
          useValue: { profile, loadProfile: loadProfileSpy, updateSettings: updateSettingsSpy },
        },
      ],
    });

    transloco = TestBed.inject(TranslocoService);
    return TestBed.inject(LanguageService);
  }

  let restoreLocalStorage: () => void;

  beforeEach(() => {
    restoreLocalStorage = installFakeLocalStorage();
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US']);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    restoreLocalStorage();
  });

  it('should create', () => {
    expect(setup()).toBeTruthy();
  });

  it('should apply the cached language on startup', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'es');
    setup();
    expect(transloco.getActiveLang()).toBe('es');
  });

  it('should fall back to the browser language when nothing is cached', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['es-ES']);
    setup();
    expect(transloco.getActiveLang()).toBe('es');
  });

  it('should fall back to Spanish when the browser asks for a language we do not ship', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['fr-FR', 'de']);
    setup();
    expect(transloco.getActiveLang()).toBe('es');
  });

  it('should apply the stored preference once a session is restored', async () => {
    const service = setup(mockUser({ settings: { language: 'es' } }));
    expect(transloco.getActiveLang()).toBe('en');

    currentUser.set(mockUser());
    TestBed.tick();
    await service.whenSynced();

    expect(transloco.getActiveLang()).toBe('es');
  });

  it('should load the profile for the restored session and not error when it does not exist yet', async () => {
    const service = setup(null);

    currentUser.set(mockUser());
    TestBed.tick();
    await service.whenSynced();

    expect(loadProfileSpy).toHaveBeenCalledWith('user-1');
    expect(transloco.getActiveLang()).toBe('en');
  });

  it('should apply and persist a language change', async () => {
    const service = setup(mockUser());
    currentUser.set(mockUser());
    TestBed.tick();

    await service.setLanguage('es');

    expect(transloco.getActiveLang()).toBe('es');
    expect(updateSettingsSpy).toHaveBeenCalledWith('user-1', { language: 'es' });
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('es');
  });

  it('should persist after the in-flight profile load settles, not race it', async () => {
    // A slow loadProfile is the realistic case: the settings page is usable
    // before it resolves, so a language change can be made while it's still
    // in flight. Ordering matters — if updateSettings's local profile.set()
    // patch landed first, the load resolving afterwards would overwrite it
    // with the pre-change value. Record the sequence to prove it doesn't.
    const writes: string[] = [];
    let releaseLoad: () => void = () => undefined;
    const loaded = new Promise<void>((resolve) => {
      releaseLoad = resolve;
    });

    const service = setup(null);
    const user = mockUser();
    loadProfileSpy.mockImplementation(async () => {
      await loaded;
      writes.push('load');
      profile.set(user);
    });
    updateSettingsSpy.mockImplementation(async () => {
      writes.push('update');
    });

    currentUser.set(user);
    TestBed.tick();

    const change = service.setLanguage('en');
    releaseLoad();
    await change;

    expect(writes).toEqual(['load', 'update']);
    expect(updateSettingsSpy).toHaveBeenCalledWith('user-1', { language: 'en' });
    expect(transloco.getActiveLang()).toBe('en');
  });

  it('should apply a language change without a session but not persist it', async () => {
    const service = setup();

    await service.setLanguage('es');

    expect(transloco.getActiveLang()).toBe('es');
    expect(updateSettingsSpy).not.toHaveBeenCalled();
  });

  it('should ignore a language the app does not ship', async () => {
    const service = setup();

    await service.setLanguage('fr');

    expect(transloco.getActiveLang()).toBe('en');
    expect(updateSettingsSpy).not.toHaveBeenCalled();
  });
});
