import { Component, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { ButtonComponent } from '@underlayerdev/ui';
import { OnboardingService } from '../../onboarding.service';

// The one Continue/Back pair for the whole flow, rendered once by the shell
// rather than by each step. It owns no decisions: the label, whether a Back
// button exists at all, and where either button leads all come from
// ONBOARDING_STEPS via OnboardingService.
@Component({
  selector: 'um-onboarding-footer',
  templateUrl: './onboarding-footer.html',
  styleUrl: './onboarding-footer.scss',
  imports: [ButtonComponent, TranslocoDirective],
})
export class OnboardingFooterComponent {
  readonly onboardingService = inject(OnboardingService);

  continue(): void {
    void this.onboardingService.continue();
  }

  goBack(): void {
    void this.onboardingService.goBack();
  }
}
