import { Component, computed, inject, signal } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { InputComponent } from '@underlayerdev/ui';
import { UserService } from '../../../application/services/user.service';
import { normalizeDisplayName } from '../../../domain/user/display-name';
import { validateDisplayName } from '../../../domain/user/user-display.validator';
import { OnboardingService } from '../onboarding.service';

// Collects User.displayName. The shell renders the footer, so this component
// owns only the field and its validity — OnboardingService saves the value and
// decides where Continue goes, both from ONBOARDING_STEPS.
@Component({
  selector: 'um-onboarding-name',
  templateUrl: './onboarding-name.html',
  styles: `
    :host {
      display: contents;
    }
  `,
  imports: [InputComponent, TranslocoDirective],
})
export class OnboardingNameComponent {
  private readonly transloco = inject(TranslocoService);
  private readonly userService = inject(UserService);

  // Assigned automatically at sign-up (onUserCreate) — shown here so it
  // isn't a surprise later, but changed from settings, not in this flow.
  readonly username = computed(() => this.userService.profile()?.username ?? '');

  readonly displayNameValue = signal(this.userService.profile()?.displayName ?? '');
  readonly displayNameTouched = signal(false);

  // Withheld until blur so a half-typed name isn't flagged mid-keystroke; the
  // Continue button is disabled the whole time either way.
  readonly displayNameError = computed(() => (this.displayNameTouched() ? this.validate() : null));

  constructor() {
    inject(OnboardingService).startStep({
      id: 'name',
      // The only required step — the photo and location screens are skippable,
      // which is what having no Skip button means here.
      canContinue: () => !this.validate(),
      changes: () => ({ displayName: normalizeDisplayName(this.displayNameValue()) }),
    });
  }

  markTouched(): void {
    this.displayNameTouched.set(true);
  }

  private validate(): string | null {
    return validateDisplayName(this.displayNameValue(), this.transloco);
  }
}
