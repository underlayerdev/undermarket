import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { LanguageService } from './language.service';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { LANGUAGE_STORAGE_KEY } from '../../core/i18n/languages';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';
import { installFakeLocalStorage } from '../../../testing/fake-local-storage';
import type { User } from '../../domain/user/user.model';

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'test@example.com',
    displayName: 'Test User',
    settings: { language: 'en' },
    providerId: 'password',
    createdAt: new Date('2024-03-15T10:00:00Z'),
    ...overrides,
  };
}

describe('LanguageService', () => {
  let currentUser: ReturnType<typeof signal<User | null>>;
  let profile: ReturnType<typeof signal<User | null>>;
  let ensureProfileSpy: ReturnType<typeof vi.fn>;
  let updateSettingsSpy: ReturnType<typeof vi.fn>;
  let transloco: TranslocoService;

  /** `storedProfile` is what ensureProfile resolves with — null means "create it". */
  function setup(storedProfile: User | null = null) {
    currentUser = signal<User | null>(null);
    profile = signal<User | null>(null);
    updateSettingsSpy = vi.fn().mockResolvedValue(undefined);
    ensureProfileSpy = vi.fn().mockImplementation(async (user: User) => {
      const resolved = storedProfile ?? user;
      profile.set(resolved);
      return resolved;
    });

    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [
        { provide: AuthService, useValue: { currentUser } },
        {
          provide: UserService,
          useValue: { profile, ensureProfile: ensureProfileSpy, updateSettings: updateSettingsSpy },
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
    const service = setup(createUser({ settings: { language: 'es' } }));
    expect(transloco.getActiveLang()).toBe('en');

    currentUser.set(createUser());
    TestBed.tick();
    await service.whenSynced();

    expect(transloco.getActiveLang()).toBe('es');
  });

  it('should create the profile doc for an account that has none', async () => {
    setup(null);

    currentUser.set(createUser());
    TestBed.tick();
    await Promise.resolve();

    expect(ensureProfileSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1', settings: { language: 'en' } }),
    );
  });

  it('should apply and persist a language change', async () => {
    const service = setup(createUser());
    currentUser.set(createUser());
    TestBed.tick();

    await service.setLanguage('es');

    expect(transloco.getActiveLang()).toBe('es');
    expect(updateSettingsSpy).toHaveBeenCalledWith('user-1', { language: 'es' });
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('es');
  });

  it('should persist after doc creation finishes, not race it', async () => {
    // A slow ensureProfile is the realistic case: the settings page is usable
    // before the doc exists, so a change can be made while it is being created.
    // Ordering is the whole point here, so record the sequence of writes.
    const writes: string[] = [];
    let releaseCreate: () => void = () => undefined;
    const created = new Promise<void>((resolve) => {
      releaseCreate = resolve;
    });

    const service = setup(null);
    const user = createUser();
    ensureProfileSpy.mockImplementation(async (u: User) => {
      await created;
      writes.push('create');
      profile.set(u);
      return u;
    });
    updateSettingsSpy.mockImplementation(async () => {
      writes.push('update');
    });

    currentUser.set(user);
    TestBed.tick();

    const change = service.setLanguage('en');
    releaseCreate();
    await change;

    // The update must land after the create. Reversed, the create's seeded
    // language is the last write to Firestore and the user's choice is lost.
    expect(writes).toEqual(['create', 'update']);
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
