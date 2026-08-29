import { Component, computed, input, output, signal, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import {
  ButtonComponent,
  IconComponent,
  InputComponent,
  NavbarAvatarSlotDirective,
  NavbarComponent,
  NavbarLogoSlotDirective,
  NavbarSearchSlotDirective,
} from '@underlayerdev/ui';
import { User } from '../../../domain/user/user.model';
import { getInitials } from '../../../shared/utils/user-display';
import { NotificationsComponent } from '../notifications/notifications';
import { UserMenuComponent } from '../user-menu/user-menu';

@Component({
  selector: 'um-navbar-layout',
  templateUrl: './navbar-layout.html',
  styleUrl: 'navbar-layout.scss',
  // ul-navbar/ul-button render with ViewEncapsulation.None, so their internal
  // markup (.ul-navbar__bar, .ul-navbar__sidebar_toggle) carries no Angular
  // scoping attribute. An Emulated stylesheet here would compile selectors
  // like `.ul-navbar__bar[_ngcontent-xxx]`, which never matches that markup —
  // the override silently does nothing. None keeps this component consistent
  // with the library elements it's overriding.
  encapsulation: ViewEncapsulation.None,
  imports: [
    RouterLink,
    TranslocoDirective,
    ButtonComponent,
    IconComponent,
    NavbarComponent,
    NavbarLogoSlotDirective,
    NavbarSearchSlotDirective,
    NavbarAvatarSlotDirective,
    InputComponent,
    NotificationsComponent,
    UserMenuComponent,
  ],
})
export class NavbarLayoutComponent {
  readonly sidebarOpen = input(false);
  readonly currentUser = input<User | null>();
  readonly toggleSidebar = output();
  readonly submitSearch = output<string>();

  readonly avatarInitials = computed(() => getInitials(this.currentUser()?.displayName));
  readonly searchQuery = signal('');
}
