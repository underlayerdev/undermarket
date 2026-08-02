import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '../../../application/services/notification.service';
import type { Notification } from '../../../domain/models/notification.model';
import { ButtonComponent, IconComponent } from '@underlayerdev/ui';

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
