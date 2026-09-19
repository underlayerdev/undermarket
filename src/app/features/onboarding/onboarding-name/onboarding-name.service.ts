import { computed, inject, Service, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../application/services/auth.service';
import { validateDisplayName } from '../../../domain/user/user-display.validator';

// Root-scoped (not step-local) because the display name entered here is
// read again by the location step's final save, after this step's own
// component has been destroyed by the router.
@Service()
export class OnboardingNameService {
  private readonly authService = inject(AuthService);
  private readonly transloco = inject(TranslocoService);

  readonly displayNameValue = signal(this.authService.currentUser()?.displayName ?? '');
  readonly displayNameTouched = signal(false);

  readonly displayNameError = computed(() => {
    if (!this.displayNameTouched()) return null;
    return validateDisplayName(this.displayNameValue(), this.transloco);
  });

  // Only this step requires anything — the rest can always be continued
  // past, which is what "skipping" means here (no separate Skip button).
  readonly canContinue = computed(
    () => !!this.displayNameValue().trim() && !this.displayNameError(),
  );

  markTouched(): void {
    this.displayNameTouched.set(true);
  }
}
