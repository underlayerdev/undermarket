import { Component, inject, OnInit } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../application/services/auth.service';
import { UserService } from '../../application/services/user.service';
import { ErrorService } from '../../application/services/error.service';
import { SeoService } from '../../core/seo/seo.service';
import { SkeletonComponent, ToastService } from '@underlayerdev/ui';
import { ProfileListingsComponent } from './profile-listings/profile-listings';
import { ProfileInfoComponent } from './profile-info/profile-info';

@Component({
  selector: 'um-profile',
  imports: [SkeletonComponent, ProfileListingsComponent, ProfileInfoComponent],
  providers: [ToastService],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  protected readonly userService = inject(UserService);
  private readonly seoService = inject(SeoService);
  private readonly transloco = inject(TranslocoService);
  private readonly errorService = inject(ErrorService);
  private readonly toastService = inject(ToastService);
  readonly currentUser = this.userService.profile;

  async ngOnInit(): Promise<void> {
    this.seoService.setPage(this.transloco.translate('profile.pageTitle'));

    const user = this.authService.currentUser();
    if (!user) return;

    try {
      // ensureProfile, not loadProfile: an account with no Firestore doc yet
      // would otherwise render an empty profile instead of the auth details.
      await this.userService.ensureProfile(user);
    } catch (err) {
      this.toastService.error(this.errorService.toUserMessage(err));
    }
  }
}
