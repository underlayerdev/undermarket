import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { ButtonComponent, NavbarComponent } from '@underlayerdev/ui';
import { onboardingNamePath } from '../onboarding.routes';

@Component({
  selector: 'um-onboarding-welcome',
  templateUrl: './onboarding-welcome.html',
  styleUrl: './onboarding-welcome.scss',
  imports: [ButtonComponent, TranslocoDirective, NavbarComponent],
})
export class OnboardingWelcomeComponent {
  private readonly router = inject(Router);

  startOnboarding(): void {
    void this.router.navigateByUrl(onboardingNamePath);
  }
}
