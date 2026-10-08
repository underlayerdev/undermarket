import { Location } from '@angular/common';
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
import { normalizeUsername } from '../../../domain/user/username';
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
  private readonly location = inject(Location);
  private readonly seoService = inject(SeoService);
  private readonly transloco = inject(TranslocoService);
  private readonly errorService = inject(ErrorService);
  private readonly toastService = inject(ToastService);

  // Exactly one is set, depending on the route: /profile/:userId (the
  // original, uid-keyed link) or /u/:username (the shareable one).
  readonly userId = input<UserId>();
  readonly username = input<string>();

  readonly profileUser = signal<User | null>(null);
  readonly isLoading = signal(true);
  readonly notFound = signal(false);

  async ngOnInit(): Promise<void> {
    // currentUser() reads a signal that's still null until the restored
    // session (if any) has been applied — without this, viewing your own
    // profile link right after a reload would render the public view first
    // and only redirect a beat later.
    await this.authService.ready;

    const userId = this.userId();
    if (userId && this.authService.currentUser()?.id === userId) {
      await this.router.navigateByUrl('/profile');
      return;
    }

    this.isLoading.set(true);
    try {
      const username = this.username();
      const requestedUsername = username ? normalizeUsername(username) : null;
      const user = requestedUsername
        ? await this.userRepository.getByUsername(requestedUsername)
        : userId
          ? await this.userRepository.getById(userId)
          : null;

      if (user && this.authService.currentUser()?.id === user.id) {
        await this.router.navigateByUrl('/profile');
        return;
      }
      // A handle its owner has since replaced still resolves to them (see
      // USERNAME_RELEASE_LOCK_DAYS) — show the profile, but under its
      // current URL. replaceState rather than navigate(): /u/:username to
      // /u/:username reuses this component, so ngOnInit wouldn't run again.
      if (user && requestedUsername && user.username !== requestedUsername) {
        this.location.replaceState(`/u/${user.username}`);
      }

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
