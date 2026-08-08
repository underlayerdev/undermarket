import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '../../../application/services/notification.service';
import type { Notification } from '../../../domain/models/notification.model';
import { ButtonComponent, IconComponent } from '@underlayerdev/ui';

/** 'icon' (default): standalone bell+badge button for the navbar. 'dock': styled to match ul-dock-item, for placement inside ul-dock. */
export type NotificationsLayout = 'icon' | 'dock';

@Component({
  selector: 'um-notifications',
  standalone: true,
  imports: [CdkMenuTrigger, CdkMenu, CdkMenuItem, ButtonComponent, IconComponent, DatePipe],
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

  onNotificationClick(notification: Notification): void {
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id);
    }
    if (notification.url) {
      this.router.navigateByUrl(notification.url);
    }
  }

  onMarkAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }
}
