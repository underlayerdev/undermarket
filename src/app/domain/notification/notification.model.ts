export type NotificationId = string;

export interface Notification {
  id: NotificationId;
  message: string;
  read: boolean;
  createdAt: Date;
  /** Optional route to navigate to when the notification is clicked (e.g. a listing or profile page). */
  url?: string;
}
