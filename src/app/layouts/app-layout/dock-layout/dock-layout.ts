import { Component, computed, input } from '@angular/core';
import {
  AvatarComponent,
  DockComponent,
  DockItemComponent,
  DockItemContentSlotDirective,
  IconComponent,
} from '@underlayerdev/ui';
import { NotificationsComponent } from '../notifications/notifications';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { User } from '../../../domain/user/user.model';
import { getInitials } from '../../../shared/utils/user-display';

@Component({
  selector: 'um-dock-layout',
  templateUrl: 'dock-layout.html',
  imports: [
    RouterLink,
    RouterLinkActive,
    AvatarComponent,
    DockComponent,
    DockItemComponent,
    DockItemContentSlotDirective,
    IconComponent,
    NotificationsComponent,
  ],
})
export class DockLayout {
  readonly currentUser = input.required<User>();

  readonly avatarInitials = computed(() => {
    const name = this.currentUser()?.displayName;
    return name ? getInitials(name) : undefined;
  });

  readonly userImage = computed(() => this.currentUser()?.photoUrl);
}
