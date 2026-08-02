import { computed, inject, Injectable, signal } from '@angular/core';
import { NOTIFICATION_PROVIDER } from '../../core/configuration/tokens';
import type { Notification, NotificationId } from '../../domain/models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly notificationProvider = inject(NOTIFICATION_PROVIDER);

  readonly notifications = signal<Notification[]>([]);

  readonly unreadCount = computed(() => this.notifications().filter((n) => !n.read).length);

  constructor() {
    this.notificationProvider.observe((notifications) => this.notifications.set(notifications));
  }

  async markAsRead(id: NotificationId): Promise<void> {
    await this.notificationProvider.markAsRead(id);
  }

  async markAllAsRead(): Promise<void> {
    await this.notificationProvider.markAllAsRead();
  }
}
