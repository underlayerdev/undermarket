import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { NavbarComponent, StepperComponent } from '@underlayerdev/ui';
import { OnboardingProgressService } from './shared/onboarding-progress/onboarding-progress.service';

@Component({
  selector: 'um-onboarding-shell',
  templateUrl: './onboarding-shell.html',
  styleUrl: './onboarding-shell.scss',
  imports: [RouterOutlet, StepperComponent, NavbarComponent, TranslocoDirective],
})
export class OnboardingShellComponent {
  readonly onboardingProgress = inject(OnboardingProgressService);
}
