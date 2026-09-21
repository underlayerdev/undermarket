import { Component, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { ButtonComponent, NavbarComponent } from '@underlayerdev/ui';
import { OnboardingService } from '../onboarding.service';

// A congratulations screen, not another input step — a full-page sibling of the
// shell (own navbar, no stepper, no Back button), same shape as
// OnboardingWelcomeComponent. Reachable only once onboardingDoneGuard confirms
// the profile really is onboarded; see guards/onboarding-done.guard.ts.
//
// Its Continue leads out of the flow entirely (ONBOARDING_EXIT_ROUTE), which is
// why the destination is worth reading from the config rather than inlining.
@Component({
  selector: 'um-onboarding-done',
  templateUrl: './onboarding-done.html',
  styleUrl: './onboarding-done.scss',
  imports: [ButtonComponent, NavbarComponent, TranslocoDirective],
})
export class OnboardingDoneComponent {
  readonly onboardingService = inject(OnboardingService);

  constructor() {
    this.onboardingService.startStep({ id: 'done' });
  }

  goToHome(): void {
    void this.onboardingService.continue();
  }
}
