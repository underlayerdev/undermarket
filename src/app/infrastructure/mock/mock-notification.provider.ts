import { Injectable } from '@angular/core';
import type { NotificationProvider } from '../../domain/notification/notification.provider';
import type { Notification, NotificationId } from '../../domain/notification/notification.model';

const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    message: $localize`:@@mockNotifications.newMessage:You have a new message about "Vintage leather jacket".`,
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
    url: '/listings/vintage-leather-jacket-1',
  },
  {
    id: '2',
    message: $localize`:@@mockNotifications.priceDrop:A saved item just dropped in price.`,
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
  },
  {
    id: '3',
    message: $localize`:@@mockNotifications.listingPublished:Your listing "Mountain bike" was published.`,
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
];

/**
 * Mock notification source: no real backend event exists yet. Swap for a
 * Firestore-backed NotificationProvider (real-time via onSnapshot) by
 * changing the NOTIFICATION_PROVIDER registration in app.config.ts — the
 * rest of the app only depends on the NotificationProvider interface.
 */
@Injectable({ providedIn: 'root' })
export class MockNotificationProvider implements NotificationProvider {
  private notifications: Notification[] = SEED_NOTIFICATIONS;
  private readonly listeners = new Set<(notifications: Notification[]) => void>();

  observe(callback: (notifications: Notification[]) => void): () => void {
    this.listeners.add(callback);
    callback(this.notifications);
    return () => {
      this.listeners.delete(callback);
    };
  }

  async markAsRead(id: NotificationId): Promise<void> {
    this.notifications = this.notifications.map((notification) =>
      notification.id === id ? { ...notification, read: true } : notification,
    );
    this.notifyListeners();
  }

  async markAllAsRead(): Promise<void> {
    this.notifications = this.notifications.map((notification) => ({
      ...notification,
      read: true,
    }));
    this.notifyListeners();
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.notifications);
    }
  }
}
