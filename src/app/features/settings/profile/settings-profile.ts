import { Component, inject, OnInit } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { AuthService } from '../../../application/services/auth.service';
import { UserService } from '../../../application/services/user.service';
import { SettingsLayoutComponent } from '../shared/settings-layout/settings-layout';
import { SettingsProfileAvatarComponent } from './settings-profile-avatar/settings-profile-avatar';
import { SettingsProfileCityComponent } from './settings-profile-city/settings-profile-city';
import { SettingsProfileDisplayNameComponent } from './settings-profile-display-name/settings-profile-display-name';
import { SettingsProfileUsernameComponent } from './settings-profile-username/settings-profile-username';
import { SettingsProfileStore } from './settings-profile.store';

// What other people see about you: who you are (photo, name, @handle) and
// where you are. Sign-in and security live under Account.
@Component({
  selector: 'um-settings-profile',
  imports: [
    SettingsLayoutComponent,
    SettingsProfileAvatarComponent,
    SettingsProfileCityComponent,
    SettingsProfileDisplayNameComponent,
    SettingsProfileUsernameComponent,
    TranslocoDirective,
  ],
  // Shared by every panel on this page, so their profile writes queue up
  // behind each other instead of each spreading a stale profile.
  providers: [SettingsProfileStore],
  templateUrl: './settings-profile.html',
  styleUrl: './settings-profile.scss',
})
export class SettingsProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      // The onboarding-required guard already guarantees a doc exists by
      // the time this page is reachable — this is just a normal read.
      void this.userService.loadProfile(user.id);
    }
  }
}
