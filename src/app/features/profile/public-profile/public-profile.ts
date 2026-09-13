import { Component, inject, input, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import {
  ButtonComponent,
  SkeletonComponent,
  StatusComponent,
  ToastService,
} from '@underlayerdev/ui';
import { AuthService } from '../../../application/services/auth.service';
import { ErrorService } from '../../../application/services/error.service';
import { USER_REPOSITORY } from '../../../core/configuration/tokens';
import { SeoService } from '../../../core/seo/seo.service';
import type { User, UserId } from '../../../domain/user/user.model';
import { ProfileInfoComponent } from '../profile-info/profile-info';
import { ProfileListingsComponent } from '../profile-listings/profile-listings';

@Component({
  selector: 'um-public-profile',
  imports: [
    RouterLink,
    TranslocoDirective,
    ButtonComponent,
    SkeletonComponent,
    StatusComponent,
    ProfileInfoComponent,
    ProfileListingsComponent,
  ],
  providers: [ToastService],
  templateUrl: './public-profile.html',
  styleUrl: './public-profile.scss',
})
export class PublicProfileComponent implements OnInit {
  private readonly userRepository = inject(USER_REPOSITORY);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly seoService = inject(SeoService);
  private readonly transloco = inject(TranslocoService);
  private readonly errorService = inject(ErrorService);
  private readonly toastService = inject(ToastService);

  readonly userId = input.required<UserId>();

  readonly profileUser = signal<User | null>(null);
  readonly isLoading = signal(true);
  readonly notFound = signal(false);

  async ngOnInit(): Promise<void> {
    // currentUser() reads a signal that's still null until the restored
    // session (if any) has been applied — without this, viewing your own
    // profile link right after a reload would render the public view first
    // and only redirect a beat later.
    await this.authService.ready;

    if (this.authService.currentUser()?.id === this.userId()) {
      await this.router.navigateByUrl('/profile');
      return;
    }

    this.isLoading.set(true);
    try {
      const user = await this.userRepository.getById(this.userId());
      if (!user) {
        this.notFound.set(true);
        this.seoService.setPage(this.transloco.translate('common.error'));
      } else {
        this.profileUser.set(user);
        this.seoService.setPage(user.displayName);
      }
    } catch (err) {
      this.notFound.set(true);
      this.toastService.error(this.errorService.toUserMessage(err));
    } finally {
      this.isLoading.set(false);
    }
  }
}
