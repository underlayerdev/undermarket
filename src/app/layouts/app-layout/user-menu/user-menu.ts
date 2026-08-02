import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../application/services/auth.service';
import { AvatarComponent, IconComponent, ListItemComponent } from '@underlayerdev/ui';

@Component({
  selector: 'um-user-menu',
  standalone: true,
  imports: [
    CdkMenuTrigger,
    CdkMenu,
    CdkMenuItem,
    RouterLink,
    AvatarComponent,
    IconComponent,
    ListItemComponent,
  ],
  templateUrl: './user-menu.html',
  styleUrl: './user-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
