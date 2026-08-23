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
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
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
  imports: [
    ButtonComponent,
    InputComponent,
    RouterLink,
    GoogleSignInButtonComponent,
    TranslocoDirective,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly errorService = inject(ErrorService);
  private readonly seoService = inject(SeoService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  readonly errorMessage = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly touched = signal(false);

  readonly emailValue = signal('');
  readonly passwordValue = signal('');
  readonly confirmPasswordValue = signal('');

  readonly emailError = computed(() => {
    this.transloco.activeLang();
    return this.touched() ? validateEmail(this.emailValue(), this.transloco) : null;
  });

  readonly passwordError = computed(() => {
    this.transloco.activeLang();
    return this.touched() ? validatePassword(this.passwordValue(), this.transloco) : null;
  });

  readonly confirmPasswordError = computed(() => {
    this.transloco.activeLang();
    return this.touched()
      ? validateConfirmPassword(this.confirmPasswordValue(), this.passwordValue(), this.transloco)
      : null;
  });

  readonly isFormValid = computed(
    () => !this.emailError() && !this.passwordError() && !this.confirmPasswordError(),
  );

  readonly registerButtonLabel = computed(() => {
    this.transloco.activeLang();
    return this.isLoading()
      ? this.transloco.translate('register.creatingAccount')
      : this.transloco.translate('register.createAccount');
  });

  ngOnInit(): void {
    this.seoService.setPage(this.transloco.translate('register.pageTitle'));
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
