import { TestBed } from '@angular/core/testing';
import { OnboardingProgressService } from './onboarding-progress.service';

describe('OnboardingProgressService', () => {
  it('should start at step 1 of 3', () => {
    const service = TestBed.inject(OnboardingProgressService);

    expect(service.currentStep()).toBe(1);
    expect(service.totalSteps).toBe(3);
  });

  it('should let a step report its own position', () => {
    const service = TestBed.inject(OnboardingProgressService);

    service.currentStep.set(2);

    expect(service.currentStep()).toBe(2);
  });
});
