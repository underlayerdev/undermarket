import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../application/services/auth.service';
import { ErrorService } from '../../../application/services/error.service';
import { SeoService } from '../../../core/seo/seo.service';
import { isValidEmail, validateEmail } from '../../../shared/utils/auth-validation';
import { ButtonComponent, InputComponent, StatusComponent } from '@underlayerdev/ui';

@Component({
  selector: 'um-forgot-password',
  standalone: true,
  imports: [ButtonComponent, InputComponent, RouterLink, StatusComponent],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly errorService = inject(ErrorService);
  private readonly seoService = inject(SeoService);

  readonly emailValue = signal('');
  readonly touched = signal(false);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly emailError = computed(() => (this.touched() ? validateEmail(this.emailValue()) : null));

  readonly isEmailValid = computed(() => isValidEmail(this.emailValue()));

  readonly sendButtonLabel = computed(() =>
    this.isLoading()
      ? $localize`:@@forgotPassword.sending:Sending...`
      : $localize`:@@forgotPassword.sendLink:Send Reset Link`,
  );

  ngOnInit(): void {
    this.seoService.setPage($localize`:@@forgotPassword.pageTitle:Reset Password`);
  }

  async onSubmit(): Promise<void> {
    this.touched.set(true);
    if (!this.isEmailValid()) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    try {
      await this.authService.sendPasswordResetEmail(this.emailValue().trim());
      this.successMessage.set(
        $localize`:@@forgotPassword.successMessage:Check your inbox — we sent a password reset link.`,
      );
    } catch (err) {
      this.errorMessage.set(this.errorService.toUserMessage(err));
    } finally {
      this.isLoading.set(false);
    }
  }
}
