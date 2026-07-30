import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../application/services/auth.service';
import { ErrorService } from '../../../application/services/error.service';
import { SeoService } from '../../../core/seo/seo.service';
import { ButtonComponent, InputComponent } from '@underlayerdev/ui';

@Component({
  selector: 'um-reset-password',
  standalone: true,
  imports: [ButtonComponent, InputComponent, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly errorService = inject(ErrorService);
  private readonly seoService = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private oobCode = '';

  readonly passwordValue = signal('');
  readonly confirmPasswordValue = signal('');
  readonly touched = signal(false);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly invalidLink = signal(false);

  readonly passwordError = computed(() => {
    if (!this.touched()) return null;
    if (!this.passwordValue()) return 'Password is required.';
    if (this.passwordValue().length < 6) return 'Password must be at least 6 characters.';
    return null;
  });

  readonly confirmPasswordError = computed(() => {
    if (!this.touched()) return null;
    if (!this.confirmPasswordValue()) return 'Please confirm your password.';
    if (this.confirmPasswordValue() !== this.passwordValue()) return 'Passwords do not match.';
    return null;
  });

  readonly isFormValid = computed(() => !this.passwordError() && !this.confirmPasswordError());

  ngOnInit(): void {
    this.seoService.setPage('Set New Password');
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
      await this.router.navigate(['/login'], { replaceUrl: true });
    } catch (err) {
      this.errorMessage.set(this.errorService.toUserMessage(err));
    } finally {
      this.isLoading.set(false);
    }
  }
}
