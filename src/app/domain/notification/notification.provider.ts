import type { Notification, NotificationId } from './notification.model';

export interface NotificationProvider {
  /**
   * Invoked immediately with the current list, then again whenever it changes.
   * A real backend (e.g. Firestore) would use a live listener here; a mock
   * implementation can just emit the same static list once. Returns an
   * unsubscribe function.
   */
  observe(callback: (notifications: Notification[]) => void): () => void;
  markAsRead(id: NotificationId): Promise<void>;
  markAllAsRead(): Promise<void>;
}
