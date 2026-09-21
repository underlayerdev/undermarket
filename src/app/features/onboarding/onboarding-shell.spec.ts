import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../application/services/auth.service';
import { ErrorService } from '../../application/services/error.service';
import { UserService } from '../../application/services/user.service';
import { mockUser } from '../../domain/user/user.mock';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';
import { OnboardingService } from './onboarding.service';
import { OnboardingShellComponent } from './onboarding-shell';

describe('OnboardingShellComponent', () => {
  function setup() {
    const profile = mockUser({ id: 'user-1' });

    TestBed.configureTestingModule({
      imports: [OnboardingShellComponent, getTranslocoTestingModule()],
      providers: [
        provideRouter([]),
        { provide: UserService, useValue: { profile: () => profile, updateProfile: vi.fn() } },
        {
          provide: AuthService,
          useValue: {
            currentUser: () => profile,
            updateDisplayName: vi.fn(),
            updatePhotoUrl: vi.fn(),
          },
        },
        { provide: ErrorService, useValue: { toUserMessage: () => 'Something went wrong.' } },
      ],
    });

    const fixture = TestBed.createComponent(OnboardingShellComponent);
    fixture.detectChanges();
    return { fixture, onboardingService: TestBed.inject(OnboardingService) };
  }

  it('should create', () => {
    const { fixture } = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render one stepper item per step of the config', () => {
    const { fixture } = setup();

    const items: HTMLLIElement[] = fixture.nativeElement.querySelectorAll('.ul-stepper__item');
    expect(items).toHaveLength(3);
    expect(Array.from(items, (item) => item.textContent?.trim())).toEqual([
      'Name',
      'Photo',
      'Location',
    ]);
  });

  it('should mark the step the routed child registered as current', () => {
    const { fixture, onboardingService } = setup();

    // What a routed step does on init; the shell has no say in which one is active.
    onboardingService.startStep({ id: 'photo' });
    fixture.detectChanges();

    const items: HTMLLIElement[] = fixture.nativeElement.querySelectorAll('.ul-stepper__item');
    expect(items[1].getAttribute('aria-current')).toBe('step');
    expect(items[0].getAttribute('aria-current')).toBeNull();
  });
});
