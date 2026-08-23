import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { ButtonComponent } from '@underlayerdev/ui';
import { AuthService } from '../../../../application/services/auth.service';
import { ErrorService } from '../../../../application/services/error.service';

@Component({
  selector: 'um-google-sign-in-button',
  standalone: true,
  imports: [ButtonComponent, TranslocoDirective],
  templateUrl: './google-sign-in-button.html',
  styleUrl: './google-sign-in-button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleSignInButtonComponent {
  private readonly authService = inject(AuthService);
  private readonly errorService = inject(ErrorService);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);

  async onGoogleLogin(): Promise<void> {
    this.isLoading.set(true);
    try {
      await this.authService.loginWithOAuth('google');
      await this.router.navigate(['/home']);
    } catch (err) {
      console.error(this.errorService.toUserMessage(err));
    } finally {
      this.isLoading.set(false);
    }
  }
}
