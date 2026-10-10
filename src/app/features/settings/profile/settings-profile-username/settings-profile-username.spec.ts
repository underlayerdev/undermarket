import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ToastService } from '@underlayerdev/ui';
import { SettingsProfileUsernameComponent } from './settings-profile-username';
import { SettingsProfileStore } from '../settings-profile.store';
import { UserService } from '../../../../application/services/user.service';
import { getTranslocoTestingModule } from '../../../../../testing/transloco-testing';
import { mockUser } from '../../../../domain/user/user.mock';
import type { User } from '../../../../domain/user/user.model';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('SettingsProfileUsernameComponent', () => {
  let changeUsernameSpy: ReturnType<typeof vi.fn>;
  let isUsernameAvailableSpy: ReturnType<typeof vi.fn>;

  function setup(initialProfile: User | null = mockUser({ username: 'old.handle' })) {
    const profile = signal<User | null>(initialProfile);
    changeUsernameSpy = vi.fn(async (username: string) => {
      const current = profile();
      if (current) profile.set({ ...current, username, usernameChangedAt: new Date() });
    });
    isUsernameAvailableSpy = vi.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      imports: [SettingsProfileUsernameComponent, getTranslocoTestingModule()],
      providers: [
        SettingsProfileStore,
        {
          provide: UserService,
          useValue: {
            profile,
            updateProfile: vi.fn(),
            changeUsername: changeUsernameSpy,
            isUsernameAvailable: isUsernameAvailableSpy,
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(SettingsProfileUsernameComponent);
    fixture.detectChanges();
    return {
      fixture,
      component: fixture.componentInstance,
      store: TestBed.inject(SettingsProfileStore),
      profile,
    };
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(setup().component).toBeTruthy();
  });

  it('should seed the draft from the saved handle', () => {
    const { component } = setup();

    expect(component.usernameValue()).toBe('old.handle');
    expect(component.canSave()).toBe(false);
  });

  it('should normalize what the user types', () => {
    const { component } = setup();

    component.onUsernameInput('@Jane.Doe');

    expect(component.usernameValue()).toBe('jane.doe');
  });

  it('should show availability once the debounced check resolves', async () => {
    vi.useFakeTimers();
    const { component } = setup();

    component.onUsernameInput('jane.doe');
    expect(component.usernameHelperText()).toBe('Checking availability...');
    expect(component.canSave()).toBe(false);
    await vi.advanceTimersByTimeAsync(400);

    expect(component.usernameHelperText()).toBe('@jane.doe is available.');
    expect(component.canSave()).toBe(true);
  });

  it('should show a taken handle as an error and block saving', async () => {
    vi.useFakeTimers();
    const { component } = setup();
    isUsernameAvailableSpy.mockResolvedValue(false);

    component.onUsernameInput('jane.doe');
    await vi.advanceTimersByTimeAsync(400);

    expect(component.usernameError()).toBe('That username is already taken.');
    expect(component.canSave()).toBe(false);
  });

  it('should reject a badly formatted handle on save without calling the server', async () => {
    const { component } = setup();
    component.onUsernameInput('a..b');

    await component.onSaveUsername();

    expect(component.usernameError()).toContain('lowercase letters');
    expect(changeUsernameSpy).not.toHaveBeenCalled();
  });

  it('should save a valid handle and show a success toast', async () => {
    vi.useFakeTimers();
    const { component, profile } = setup();
    const successSpy = vi.spyOn(TestBed.inject(ToastService), 'success');
    component.onUsernameInput('jane.doe');
    await vi.advanceTimersByTimeAsync(400);

    await component.onSaveUsername();

    expect(changeUsernameSpy).toHaveBeenCalledWith('jane.doe');
    expect(profile()?.username).toBe('jane.doe');
    expect(successSpy).toHaveBeenCalledWith('Username updated.');
  });

  it('should map a failed claim to a user-facing error toast', async () => {
    vi.useFakeTimers();
    const { component } = setup();
    changeUsernameSpy.mockRejectedValue({ code: 'functions/already-exists' });
    const errorSpy = vi.spyOn(TestBed.inject(ToastService), 'error');
    component.onUsernameInput('jane.doe');
    await vi.advanceTimersByTimeAsync(400);

    await component.onSaveUsername();

    expect(errorSpy).toHaveBeenCalledWith('That username is already taken.');
  });

  it('should lock the field during the change cooldown', () => {
    const { component, fixture } = setup(
      mockUser({ username: 'old.handle', usernameChangedAt: new Date(Date.now() - 5 * DAY_MS) }),
    );
    fixture.detectChanges();

    expect(component.nextChangeAt()).not.toBeNull();
    expect(component.canSave()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('You can change your username again on');
  });

  it('should unlock the field once the cooldown has passed', () => {
    const { component } = setup(
      mockUser({ username: 'old.handle', usernameChangedAt: new Date(Date.now() - 31 * DAY_MS) }),
    );

    expect(component.nextChangeAt()).toBeNull();
  });
});
