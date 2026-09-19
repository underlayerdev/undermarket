import { Component, computed, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { RadialComponent } from '@underlayerdev/ui';
import { UserService } from './application/services/user.service';

@Component({
  selector: 'um-root',
  imports: [RouterOutlet, TranslocoDirective, RadialComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly userService = inject(UserService);
  private router = inject(Router);

  isNavigating = computed(() => !!this.router.currentNavigation());
}
