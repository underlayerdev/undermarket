import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../../application/services/auth.service';
import { ErrorService } from '../../../application/services/error.service';
import { SeoService } from '../../../core/seo/seo.service';
import {
  validateConfirmPassword,
  validateEmail,
  validatePassword,
} from '../../../shared/utils/auth-validation';
import { ButtonComponent, InputComponent } from '@underlayerdev/ui';
import { GoogleSignInButtonComponent } from '../components/google-sign-in-button/google-sign-in-button';

@Component({
  selector: 'um-register',
  standalone: true,
  imports: [ButtonComponent, InputComponent, RouterLink, GoogleSignInButtonComponent],
  templateUrl: './register.html',
  styleUrl: './register.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly errorService = inject(ErrorService);
  private readonly seoService = inject(SeoService);
  private readonly router = inject(Router);

  readonly errorMessage = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly touched = signal(false);

  readonly emailValue = signal('');
  readonly passwordValue = signal('');
  readonly confirmPasswordValue = signal('');

  readonly emailError = computed(() => (this.touched() ? validateEmail(this.emailValue()) : null));

  readonly passwordError = computed(() =>
    this.touched() ? validatePassword(this.passwordValue()) : null,
  );

  readonly confirmPasswordError = computed(() =>
    this.touched()
      ? validateConfirmPassword(this.confirmPasswordValue(), this.passwordValue())
      : null,
  );

  readonly isFormValid = computed(
    () => !this.emailError() && !this.passwordError() && !this.confirmPasswordError(),
  );

  readonly registerButtonLabel = computed(() =>
    this.isLoading()
      ? $localize`:@@register.creatingAccount:Creating account...`
      : $localize`:@@register.createAccount:Create Account`,
  );

  ngOnInit(): void {
    this.seoService.setPage($localize`:@@register.pageTitle:Create Account`);
  }

  async onRegister(): Promise<void> {
    this.touched.set(true);
    if (!this.isFormValid()) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      await this.authService.register(this.emailValue(), this.passwordValue());
      await this.router.navigate(['/home']);
    } catch (err) {
      this.errorMessage.set(this.errorService.toUserMessage(err));
    } finally {
      this.isLoading.set(false);
    }
  }
}
