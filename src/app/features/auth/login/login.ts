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
  isValidEmail,
  validateEmail,
  validatePassword,
} from '../../../shared/utils/auth-validation';
import { ButtonComponent, InputComponent } from '@underlayerdev/ui';
import { GoogleSignInButtonComponent } from '../components/google-sign-in-button/google-sign-in-button';

type Step = 'email' | 'password';

@Component({
  selector: 'um-login',
  standalone: true,
  imports: [ButtonComponent, InputComponent, RouterLink, GoogleSignInButtonComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly errorService = inject(ErrorService);
  private readonly seoService = inject(SeoService);
  private readonly router = inject(Router);

  readonly step = signal<Step>('email');
  readonly errorMessage = signal<string | null>(null);
  readonly isLoading = signal(false);

  readonly emailValue = signal('');
  readonly passwordValue = signal('');
  readonly emailTouched = signal(false);
  readonly passwordTouched = signal(false);

  readonly emailError = computed(() =>
    this.emailTouched() ? validateEmail(this.emailValue()) : null,
  );

  readonly passwordError = computed(() =>
    this.passwordTouched() ? validatePassword(this.passwordValue()) : null,
  );

  readonly isEmailValid = computed(() => isValidEmail(this.emailValue()));

  readonly signInButtonLabel = computed(() =>
    this.isLoading()
      ? $localize`:@@auth.signingIn:Signing in...`
      : $localize`:@@auth.signIn:Sign In`,
  );

  ngOnInit(): void {
    this.seoService.setPage($localize`:@@auth.signInPageTitle:Sign In`);
  }

  onContinue(): void {
    this.emailTouched.set(true);
    if (!this.isEmailValid()) return;
    this.step.set('password');
    this.errorMessage.set(null);
  }

  onBack(): void {
    this.step.set('email');
    this.passwordValue.set('');
    this.passwordTouched.set(false);
    this.errorMessage.set(null);
  }

  async onLogin(): Promise<void> {
    this.passwordTouched.set(true);
    if (!this.passwordValue() || this.passwordValue().length < 6) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      await this.authService.login(this.emailValue(), this.passwordValue());
      await this.router.navigate(['/home']);
    } catch (err) {
      this.errorMessage.set(this.errorService.toUserMessage(err));
    } finally {
      this.isLoading.set(false);
    }
  }
}
