import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { NotificationService } from '../../../application/services/notification.service';
import type { Notification } from '../../../domain/notification/notification.model';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { ButtonComponent, IconComponent } from '@underlayerdev/ui';

/** 'icon' (default): standalone bell+badge button for the navbar, opens a small CDK Menu dropdown. 'dock': styled to match ul-dock-item, for placement inside the mobile ul-dock — opens a full-screen panel instead of a dropdown, matching new-listing's mobile takeover, since ul-dock is mobile-only. */
export type NotificationsLayout = 'icon' | 'dock';

@Component({
  selector: 'um-notifications',
  standalone: true,
  imports: [
    CdkMenuTrigger,
    CdkMenu,
    CdkMenuItem,
    ButtonComponent,
    IconComponent,
    RelativeTimePipe,
    TranslocoDirective,
  ],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsComponent {
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  layout = input<NotificationsLayout>('icon');

  readonly notifications = this.notificationService.notifications;
  readonly unreadCount = this.notificationService.unreadCount;

  readonly isOpen = signal(false);

  private wasOpen = false;

  constructor() {
    // Mark everything read as soon as the panel closes — seeing the list
    // is enough, same as most notification centers; readers shouldn't
    // have to click each item individually just to clear the unread badge.
    effect(() => {
      const isOpen = this.isOpen();
      if (this.wasOpen && !isOpen) {
        this.notificationService.markAllAsRead();
      }
      this.wasOpen = isOpen;
    });
  }

  onNotificationClick(notification: Notification): void {
    if (notification.url) {
      this.router.navigateByUrl(notification.url);
    }
    if (this.layout() === 'dock') {
      this.isOpen.set(false);
    }
  }
}
