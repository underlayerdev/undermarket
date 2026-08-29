import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AuthService } from '../../../application/services/auth.service';
import { AvatarComponent, IconComponent, ListItemComponent } from '@underlayerdev/ui';

@Component({
  selector: 'um-user-menu',
  imports: [
    CdkMenuTrigger,
    CdkMenu,
    CdkMenuItem,
    RouterLink,
    AvatarComponent,
    IconComponent,
    ListItemComponent,
    TranslocoDirective,
  ],
  templateUrl: './user-menu.html',
  styleUrl: './user-menu.scss',
})
export class UserMenuComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly avatarInitials = input<string | undefined>(undefined);
  readonly avatarSrc = input<string | undefined>(undefined);

  readonly isOpen = signal(false);

  async onSignOut(): Promise<void> {
    await this.authService.logout();
    await this.router.navigateByUrl('/login');
  }
}
