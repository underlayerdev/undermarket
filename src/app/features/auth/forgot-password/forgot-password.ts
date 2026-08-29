import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../application/services/auth.service';
import { ErrorService } from '../../../application/services/error.service';
import { SeoService } from '../../../core/seo/seo.service';
import { isValidEmail, validateEmail } from '../../../shared/utils/auth-validation';
import { ButtonComponent, InputComponent, StatusComponent } from '@underlayerdev/ui';

@Component({
  selector: 'um-forgot-password',
  imports: [ButtonComponent, InputComponent, RouterLink, StatusComponent, TranslocoDirective],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPasswordComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly errorService = inject(ErrorService);
  private readonly seoService = inject(SeoService);
  private readonly transloco = inject(TranslocoService);

  readonly emailValue = signal('');
  readonly touched = signal(false);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly emailError = computed(() => {
    this.transloco.activeLang();
    return this.touched() ? validateEmail(this.emailValue(), this.transloco) : null;
  });

  readonly isEmailValid = computed(() => isValidEmail(this.emailValue()));

  readonly sendButtonLabel = computed(() => {
    this.transloco.activeLang();
    return this.isLoading()
      ? this.transloco.translate('forgotPassword.sending')
      : this.transloco.translate('forgotPassword.sendLink');
  });

  ngOnInit(): void {
    this.seoService.setPage(this.transloco.translate('forgotPassword.pageTitle'));
  }

  async onSubmit(): Promise<void> {
    this.touched.set(true);
    if (!this.isEmailValid()) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    try {
      await this.authService.sendPasswordResetEmail(this.emailValue().trim());
      this.successMessage.set(this.transloco.translate('forgotPassword.successMessage'));
    } catch (err) {
      this.errorMessage.set(this.errorService.toUserMessage(err));
    } finally {
      this.isLoading.set(false);
    }
  }
}
