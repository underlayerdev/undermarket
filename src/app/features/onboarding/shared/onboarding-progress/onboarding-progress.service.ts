import { Service, signal } from '@angular/core';

const TOTAL_STEPS = 3;

// Each step route reports its own position here on activation — simpler
// than deriving it from ActivatedRoute data across a shell that stays
// mounted while only its router-outlet's child swaps.
@Service()
export class OnboardingProgressService {
  readonly totalSteps = TOTAL_STEPS;
  readonly currentStep = signal(1);
}
