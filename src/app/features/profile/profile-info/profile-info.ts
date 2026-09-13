import { Component, computed, input } from '@angular/core';
import { AvatarComponent, IconComponent } from '@underlayerdev/ui';
import { getInitials } from '../../../domain/user/user-display';
import { User } from '../../../domain/user/user.model';

@Component({
  selector: 'um-profile-info',
  templateUrl: 'profile-info.html',
  imports: [AvatarComponent, IconComponent],
})
export class ProfileInfoComponent {
  readonly user = input.required<User>();
  // Off for a public profile view — an email is never shown to anyone but
  // the account owner, unlike the opt-in city below.
  readonly showEmail = input(true);

  readonly avatarInitials = computed(() => getInitials(this.user()));
  readonly avatarSrc = computed(() => this.user()?.photoUrl);
}
