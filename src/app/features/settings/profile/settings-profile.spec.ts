import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { SettingsProfileComponent } from './settings-profile';
import { SettingsProfileStore } from './settings-profile.store';
import { AuthService } from '../../../application/services/auth.service';
import { SearchLocationService } from '../../../application/services/search-location.service';
import { UserService } from '../../../application/services/user.service';
import {
  GEOCODING_PROVIDER,
  GEOLOCATION_PROVIDER,
  IMAGE_STORAGE,
} from '../../../core/configuration/tokens';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';
import { mockUser } from '../../../domain/user/user.mock';

describe('SettingsProfileComponent', () => {
  let loadProfileSpy: ReturnType<typeof vi.fn>;

  function setup(signedIn = true) {
    loadProfileSpy = vi.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      imports: [SettingsProfileComponent, getTranslocoTestingModule()],
      providers: [
        {
          provide: AuthService,
          useValue: { currentUser: () => (signedIn ? { id: 'user-1' } : null) },
        },
        {
          provide: UserService,
          useValue: {
            profile: signal(mockUser({ id: 'user-1' })),
            loadProfile: loadProfileSpy,
            updateProfile: vi.fn(),
            isUsernameAvailable: vi.fn(),
            changeUsername: vi.fn(),
          },
        },
        { provide: ActivatedRoute, useValue: {} },
        { provide: GEOCODING_PROVIDER, useValue: { search: vi.fn(), reverseGeocode: vi.fn() } },
        { provide: GEOLOCATION_PROVIDER, useValue: { getCurrentPosition: vi.fn() } },
        { provide: IMAGE_STORAGE, useValue: { upload: vi.fn() } },
        { provide: SearchLocationService, useValue: { searchLocation: () => null } },
      ],
    });

    const fixture = TestBed.createComponent(SettingsProfileComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    expect(setup().componentInstance).toBeTruthy();
  });

  it('should reload the signed-in user profile on init', () => {
    setup();

    expect(loadProfileSpy).toHaveBeenCalledWith('user-1');
  });

  it('should not try to load a profile when nobody is signed in', () => {
    setup(false);

    expect(loadProfileSpy).not.toHaveBeenCalled();
  });

  it('should group photo, display name and username in one panel', () => {
    const identity: HTMLElement = setup().nativeElement.querySelector(
      '.settings-profile__identity',
    );

    expect(identity.querySelector('um-settings-profile-avatar')).toBeTruthy();
    expect(identity.querySelector('um-settings-profile-display-name')).toBeTruthy();
    expect(identity.querySelector('um-settings-profile-username')).toBeTruthy();
    expect(identity.querySelector('um-settings-profile-city')).toBeNull();
  });

  it('should show the city panel after the identity panel', () => {
    const fixture = setup();

    expect(fixture.nativeElement.querySelector('um-settings-profile-city')).toBeTruthy();
  });

  it('should give every panel the same store instance', () => {
    const fixture = setup();
    const store = fixture.debugElement.injector.get(SettingsProfileStore);

    expect(
      fixture.debugElement.children
        .flatMap((child) => child.queryAll(() => true))
        .every((element) => element.injector.get(SettingsProfileStore) === store),
    ).toBe(true);
  });
});
