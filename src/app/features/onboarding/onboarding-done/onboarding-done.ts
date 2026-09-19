import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { ButtonComponent, NavbarComponent } from '@underlayerdev/ui';

// A congratulations screen, not another input step — a sibling of the shell
// (own navbar/layout, no stepper), same shape as OnboardingWelcomeComponent.
// Reachable only once onboardingDoneGuard confirms the profile is actually
// onboarded; see guards/onboarding-done.guard.ts.
@Component({
  selector: 'um-onboarding-done',
  templateUrl: './onboarding-done.html',
  styleUrl: './onboarding-done.scss',
  imports: [ButtonComponent, NavbarComponent, TranslocoDirective],
})
export class OnboardingDoneComponent {
  private readonly router = inject(Router);

  goToHome(): void {
    void this.router.navigateByUrl('/home');
  }
}
