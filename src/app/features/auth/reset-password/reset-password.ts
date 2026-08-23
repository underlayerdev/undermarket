import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../application/services/auth.service';
import { ErrorService } from '../../../application/services/error.service';
import { SeoService } from '../../../core/seo/seo.service';
import { validateConfirmPassword, validatePassword } from '../../../shared/utils/auth-validation';
import { ButtonComponent, InputComponent, StatusComponent } from '@underlayerdev/ui';

@Component({
  selector: 'um-reset-password',
  standalone: true,
  imports: [ButtonComponent, InputComponent, RouterLink, StatusComponent, TranslocoDirective],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly errorService = inject(ErrorService);
  private readonly seoService = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  private readonly transloco = inject(TranslocoService);

  private oobCode = '';

  readonly passwordValue = signal('');
  readonly confirmPasswordValue = signal('');
  readonly touched = signal(false);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly invalidLink = signal(false);
  readonly passwordChanged = signal(false);

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

  readonly isFormValid = computed(() => !this.passwordError() && !this.confirmPasswordError());

  readonly submitButtonLabel = computed(() => {
    this.transloco.activeLang();
    return this.isLoading()
      ? this.transloco.translate('resetPassword.saving')
      : this.transloco.translate('resetPassword.setNewPassword');
  });

  ngOnInit(): void {
    this.seoService.setPage(this.transloco.translate('resetPassword.pageTitle'));
    this.oobCode = this.route.snapshot.queryParamMap.get('oobCode') ?? '';
    if (!this.oobCode) this.invalidLink.set(true);
  }

  async onSubmit(): Promise<void> {
    this.touched.set(true);
    if (!this.isFormValid()) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      await this.authService.confirmPasswordReset(this.oobCode, this.passwordValue());
      this.passwordChanged.set(true);
    } catch (err) {
      this.errorMessage.set(this.errorService.toUserMessage(err));
    } finally {
      this.isLoading.set(false);
    }
  }
}
