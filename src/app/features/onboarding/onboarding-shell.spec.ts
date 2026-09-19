import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OnboardingShellComponent } from './onboarding-shell';
import { OnboardingProgressService } from './shared/onboarding-progress/onboarding-progress.service';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';

describe('OnboardingShellComponent', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [OnboardingShellComponent, getTranslocoTestingModule()],
      providers: [provideRouter([])],
    });

    const fixture = TestBed.createComponent(OnboardingShellComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should reflect the current step reported by the progress service', () => {
    const fixture = setup();
    TestBed.inject(OnboardingProgressService).currentStep.set(2);
    fixture.detectChanges();

    const items: HTMLLIElement[] = fixture.nativeElement.querySelectorAll('.ul-stepper__item');
    expect(items[1].getAttribute('aria-current')).toBe('step');
    expect(items[0].getAttribute('aria-current')).toBeNull();
  });
});
