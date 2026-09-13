import { Component, computed, input } from '@angular/core';
import { AvatarComponent } from '@underlayerdev/ui';
import { getInitials } from '../../../domain/user/user-display';
import { User } from '../../../domain/user/user.model';

@Component({
  selector: 'um-profile-info',
  templateUrl: 'profile-info.html',
  imports: [AvatarComponent],
})
export class ProfileInfoComponent {
  readonly user = input.required<User>();

  readonly avatarInitials = computed(() => getInitials(this.user()));
  readonly avatarSrc = computed(() => this.user()?.photoUrl);
}
