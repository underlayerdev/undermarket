import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { NotificationsComponent } from './notifications';
import { NotificationService } from '../../../application/services/notification.service';
import type { Notification } from '../../../domain/models/notification.model';

const notifications: Notification[] = [
  { id: '1', message: 'First', read: false, createdAt: new Date() },
  { id: '2', message: 'Second', read: true, createdAt: new Date() },
];

describe('NotificationsComponent', () => {
  let markAsReadSpy: ReturnType<typeof vi.fn>;
  let markAllAsReadSpy: ReturnType<typeof vi.fn>;
  let navigateByUrlSpy: ReturnType<typeof vi.fn>;
  let notificationsSignal: ReturnType<typeof signal<Notification[]>>;

  beforeEach(() => {
    notificationsSignal = signal(notifications);
    markAsReadSpy = vi.fn().mockResolvedValue(undefined);
    markAllAsReadSpy = vi.fn().mockResolvedValue(undefined);
    navigateByUrlSpy = vi.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      imports: [NotificationsComponent],
      providers: [
        {
          provide: NotificationService,
          useValue: {
            notifications: notificationsSignal,
            unreadCount: () => notificationsSignal().filter((n) => !n.read).length,
            markAsRead: markAsReadSpy,
            markAllAsRead: markAllAsReadSpy,
          },
        },
        { provide: Router, useValue: { navigateByUrl: navigateByUrlSpy } },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should expose the unread count from the service', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    expect(fixture.componentInstance.unreadCount()).toBe(1);
  });

  it('should mark an unread notification as read and navigate when it has a url', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    const withUrl: Notification = { ...notifications[0], url: '/listings/foo' };

    fixture.componentInstance.onNotificationClick(withUrl);

    expect(markAsReadSpy).toHaveBeenCalledWith('1');
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/listings/foo');
  });

  it('should not call markAsRead for an already-read notification', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);

    fixture.componentInstance.onNotificationClick(notifications[1]);

    expect(markAsReadSpy).not.toHaveBeenCalled();
  });

  it('should mark all notifications as read', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);

    fixture.componentInstance.onMarkAllAsRead();

    expect(markAllAsReadSpy).toHaveBeenCalled();
  });

  it('should render the icon-only trigger by default', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('.um-notifications__trigger');
    expect(trigger).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.ul-dock-item')).toBeNull();
  });

  it('should render as a ul-dock-item with a badge when layout is dock', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    fixture.componentRef.setInput('layout', 'dock');
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('.ul-dock-item');
    expect(trigger).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.um-notifications__trigger')).toBeNull();
    expect(fixture.nativeElement.querySelector('.ul-dock-item__badge')?.textContent.trim()).toBe(
      '1',
    );
  });
});
