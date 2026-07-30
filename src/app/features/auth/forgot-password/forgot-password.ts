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
import { ButtonComponent, InputComponent } from '@underlayerdev/ui';

@Component({
  selector: 'um-forgot-password',
  standalone: true,
  imports: [ButtonComponent, InputComponent, RouterLink],
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

  readonly emailError = computed(() => {
    if (!this.touched()) return null;
    const v = this.emailValue().trim();
    if (!v) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Please enter a valid email address.';
    return null;
  });

  readonly isEmailValid = computed(() => {
    const v = this.emailValue().trim();
    return !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  });

  ngOnInit(): void {
    this.seoService.setPage('Reset Password');
  }

  async onSubmit(): Promise<void> {
    this.touched.set(true);
    if (!this.isEmailValid()) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    try {
      await this.authService.sendPasswordResetEmail(this.emailValue().trim());
      this.successMessage.set('Check your inbox — we sent a password reset link.');
    } catch (err) {
      this.errorMessage.set(this.errorService.toUserMessage(err));
    } finally {
      this.isLoading.set(false);
    }
  }
}
