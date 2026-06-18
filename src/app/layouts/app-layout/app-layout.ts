import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../application/services/auth.service';
import {
  NavbarComponent,
  NavbarLogoSlotDirective,
  NavbarSearchSlotDirective,
  ToastContainerComponent,
  ToastService,
} from '@underlayerdev/ui';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, NavbarComponent, NavbarLogoSlotDirective, NavbarSearchSlotDirective, ToastContainerComponent],
  providers: [ToastService],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutComponent {
  protected readonly authService = inject(AuthService);

  readonly avatarInitials = computed(() => {
    const name = this.authService.currentUser()?.displayName;
    return name ? name.charAt(0).toUpperCase() : undefined;
  });
}
