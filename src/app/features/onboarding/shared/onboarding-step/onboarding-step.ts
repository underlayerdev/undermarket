import { Component, input, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { ButtonComponent } from '@underlayerdev/ui';

// The shared shape every onboarding step renders into: a centered content
// column plus a full-width footer. Each step owns *whether* it can
// continue and *what* continuing/going back means (validate, upload,
// save+navigate...) — this component only owns the look of the buttons.
@Component({
  selector: 'um-onboarding-step',
  templateUrl: './onboarding-step.html',
  styleUrl: './onboarding-step.scss',
  imports: [ButtonComponent, TranslocoDirective],
})
export class OnboardingStepComponent {
  readonly centered = input(false);
  readonly showBack = input(true);
  readonly canContinue = input(true);
  readonly isLoading = input(false);
  readonly continueLabel = input<string | undefined>(undefined);
  readonly errorMessage = input<string | null>(null);

  readonly back = output<void>();
  readonly continueClicked = output<void>();
}
