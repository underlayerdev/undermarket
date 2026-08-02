import { Injectable } from '@angular/core';
import type { NotificationProvider } from '../../domain/providers/notification.provider';
import type { Notification, NotificationId } from '../../domain/models/notification.model';

const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    message: 'You have a new message about "Vintage leather jacket".',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
    url: '/listings/vintage-leather-jacket-1',
  },
  {
    id: '2',
    message: 'A saved item just dropped in price.',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
  },
  {
    id: '3',
    message: 'Your listing "Mountain bike" was published.',
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
    this.notifications = this.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    this.notifyListeners();
  }

  async markAllAsRead(): Promise<void> {
    this.notifications = this.notifications.map((n) => ({ ...n, read: true }));
    this.notifyListeners();
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.notifications);
    }
  }
}
