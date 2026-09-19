import { TestBed } from '@angular/core/testing';
import { OnboardingNameService } from './onboarding-name.service';
import { AuthService } from '../../../application/services/auth.service';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';

describe('OnboardingNameService', () => {
  function setup(currentDisplayName?: string) {
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [
        {
          provide: AuthService,
          useValue: { currentUser: () => ({ displayName: currentDisplayName }) },
        },
      ],
    });

    return TestBed.inject(OnboardingNameService);
  }

  it('should seed the display name from the current Auth user, if any', () => {
    const service = setup('Jane Doe');

    expect(service.displayNameValue()).toBe('Jane Doe');
  });

  it('should not show an error before the field is touched', () => {
    const service = setup('');

    expect(service.displayNameError()).toBeNull();
  });

  it('should require a non-blank name once touched', () => {
    const service = setup('');

    service.markTouched();

    expect(service.displayNameError()).toBeTruthy();
    expect(service.canContinue()).toBe(false);
  });

  it('should reject a name under the min length once touched', () => {
    const service = setup('');
    service.displayNameValue.set('a');

    service.markTouched();

    expect(service.displayNameError()).toBeTruthy();
    expect(service.canContinue()).toBe(false);
  });

  it('should reject a name over the max length once touched', () => {
    const service = setup('');
    service.displayNameValue.set('a'.repeat(51));

    service.markTouched();

    expect(service.displayNameError()).toBeTruthy();
    expect(service.canContinue()).toBe(false);
  });

  it('should allow continuing once a valid name is set', () => {
    const service = setup('');
    service.displayNameValue.set('Jane Doe');

    service.markTouched();

    expect(service.displayNameError()).toBeNull();
    expect(service.canContinue()).toBe(true);
  });

  it('should block continuing on a blank name even before touching', () => {
    const service = setup('');

    expect(service.canContinue()).toBe(false);
  });
});
