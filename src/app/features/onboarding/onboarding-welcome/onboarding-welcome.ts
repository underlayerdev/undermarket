import { Component, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { ButtonComponent, NavbarComponent } from '@underlayerdev/ui';
import { OnboardingService } from '../onboarding.service';

// A full-page intro screen rather than a shell child: no stepper (there's no
// progress to report yet) and no Back button. It still drives its button
// through OnboardingService so the label and destination come from
// ONBOARDING_STEPS like every other step's.
@Component({
  selector: 'um-onboarding-welcome',
  templateUrl: './onboarding-welcome.html',
  styleUrl: './onboarding-welcome.scss',
  imports: [ButtonComponent, TranslocoDirective, NavbarComponent],
})
export class OnboardingWelcomeComponent {
  readonly onboardingService = inject(OnboardingService);

  constructor() {
    this.onboardingService.startStep({ id: 'welcome' });
  }

  startOnboarding(): void {
    void this.onboardingService.continue();
  }
}
