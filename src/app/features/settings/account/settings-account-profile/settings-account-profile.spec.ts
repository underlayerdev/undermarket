import { TestBed } from '@angular/core/testing';
import { ToastService } from '@underlayerdev/ui';
import { SettingsAccountProfileComponent } from './settings-account-profile';
import { UserService } from '../../../../application/services/user.service';
import { GEOCODING_PROVIDER, GEOLOCATION_PROVIDER } from '../../../../core/configuration/tokens';
import { getTranslocoTestingModule } from '../../../../../testing/transloco-testing';
import { mockUser } from '../../../../domain/user/user.mock';
import type { User } from '../../../../domain/user/user.model';

describe('SettingsAccountProfileComponent', () => {
  let currentUser: User | null;
  let updateProfileSpy: ReturnType<typeof vi.fn>;

  function setup() {
    updateProfileSpy = vi.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      imports: [SettingsAccountProfileComponent, getTranslocoTestingModule()],
      providers: [
        {
          provide: UserService,
          useValue: {
            profile: () => currentUser,
            updateProfile: updateProfileSpy,
          },
        },
        { provide: GEOCODING_PROVIDER, useValue: { search: vi.fn(), reverseGeocode: vi.fn() } },
        { provide: GEOLOCATION_PROVIDER, useValue: { getCurrentPosition: vi.fn() } },
      ],
    });

    const fixture = TestBed.createComponent(SettingsAccountProfileComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    currentUser = mockUser();
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should seed showCity as false when the profile has no city set', () => {
    currentUser = mockUser({ profileCity: undefined });
    const fixture = setup();

    expect(fixture.componentInstance.showCity()).toBe(false);
  });

  it('should seed showCity and selectedCity from an existing profile city', () => {
    currentUser = mockUser({
      profileCity: {
        displayName: 'Palermo, Buenos Aires',
        city: 'Buenos Aires',
        region: 'Buenos Aires',
        countryCode: 'AR',
      },
    });
    const fixture = setup();

    expect(fixture.componentInstance.showCity()).toBe(true);
    expect(fixture.componentInstance.selectedCity()?.city).toBe('Buenos Aires');
  });

  it('should clear the profile city immediately when the toggle is switched off', async () => {
    currentUser = mockUser({
      profileCity: {
        displayName: 'Palermo, Buenos Aires',
        city: 'Buenos Aires',
        region: 'Buenos Aires',
        countryCode: 'AR',
      },
    });
    const fixture = setup();

    fixture.componentInstance.onToggleShowCity(false);
    await Promise.resolve();

    expect(fixture.componentInstance.selectedCity()).toBeNull();
    expect(updateProfileSpy).toHaveBeenCalledWith(
      expect.objectContaining({ profileCity: undefined }),
    );
  });

  it('should not save anything just from checking the box, before a city is picked', () => {
    currentUser = mockUser({ profileCity: undefined });
    const fixture = setup();

    fixture.componentInstance.onToggleShowCity(true);

    expect(fixture.componentInstance.showCity()).toBe(true);
    expect(updateProfileSpy).not.toHaveBeenCalled();
  });

  it('should save the picked city and update selectedCity', async () => {
    currentUser = mockUser({ profileCity: undefined });
    const fixture = setup();

    await fixture.componentInstance.onCityPicked({
      id: 'place.1',
      displayName: 'Recoleta, Buenos Aires',
      countryCode: 'AR',
      region: 'Buenos Aires',
      city: 'Buenos Aires',
      neighborhood: 'Recoleta',
      latitude: -34.5875,
      longitude: -58.3974,
    });

    expect(fixture.componentInstance.selectedCity()).toEqual({
      displayName: 'Recoleta, Buenos Aires',
      countryCode: 'AR',
      region: 'Buenos Aires',
      city: 'Buenos Aires',
    });
    expect(updateProfileSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        profileCity: {
          displayName: 'Recoleta, Buenos Aires',
          countryCode: 'AR',
          region: 'Buenos Aires',
          city: 'Buenos Aires',
        },
      }),
    );
  });

  it('should show an error toast when saving the profile city fails', async () => {
    currentUser = mockUser({ profileCity: undefined });
    const fixture = setup();
    updateProfileSpy.mockRejectedValue(new Error('network down'));
    const toastService = TestBed.inject(ToastService);
    const errorSpy = vi.spyOn(toastService, 'error');

    await fixture.componentInstance.onCityPicked({
      id: 'place.1',
      displayName: 'Recoleta, Buenos Aires',
      countryCode: 'AR',
      region: 'Buenos Aires',
      city: 'Buenos Aires',
      neighborhood: 'Recoleta',
      latitude: -34.5875,
      longitude: -58.3974,
    });

    expect(errorSpy).toHaveBeenCalled();
  });
});
