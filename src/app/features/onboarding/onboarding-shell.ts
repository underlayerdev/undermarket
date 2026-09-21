import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { NavbarComponent, StepperComponent } from '@underlayerdev/ui';
import { OnboardingService } from './onboarding.service';
import { OnboardingFooterComponent } from './shared/onboarding-footer/onboarding-footer';

// Layout for the data-entry steps: a fixed-height navbar + stepper, the active
// step's body, and the one shared footer. The stepper's length, position and
// labels all come from ONBOARDING_STEPS via OnboardingService, so a step is
// never listed here.
@Component({
  selector: 'um-onboarding-shell',
  templateUrl: './onboarding-shell.html',
  styleUrl: './onboarding-shell.scss',
  imports: [
    RouterOutlet,
    StepperComponent,
    NavbarComponent,
    TranslocoDirective,
    OnboardingFooterComponent,
  ],
})
export class OnboardingShellComponent {
  readonly onboardingService = inject(OnboardingService);
}
