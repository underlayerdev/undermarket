import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { NotificationsComponent } from './notifications';
import { NotificationService } from '../../../application/services/notification.service';
import type { Notification } from '../../../domain/notification/notification.model';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';

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
      imports: [NotificationsComponent, getTranslocoTestingModule()],
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

  it('should navigate when a clicked notification has a url', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    const withUrl: Notification = { ...notifications[0], url: '/listings/foo' };

    fixture.componentInstance.onNotificationClick(withUrl);

    expect(navigateByUrlSpy).toHaveBeenCalledWith('/listings/foo');
  });

  it('should not mark notifications as read while the panel is open', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    fixture.componentRef.setInput('layout', 'dock');
    fixture.detectChanges();

    fixture.componentInstance.isOpen.set(true);
    fixture.detectChanges();

    expect(markAllAsReadSpy).not.toHaveBeenCalled();
  });

  it('should mark all notifications as read once the panel closes', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    fixture.componentRef.setInput('layout', 'dock');
    fixture.detectChanges();

    fixture.componentInstance.isOpen.set(true);
    fixture.detectChanges();
    fixture.componentInstance.isOpen.set(false);
    fixture.detectChanges();

    expect(markAllAsReadSpy).toHaveBeenCalled();
  });

  it('should not mark as read on initial render, before the panel is ever opened', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    fixture.detectChanges();

    expect(markAllAsReadSpy).not.toHaveBeenCalled();
  });

  it('should mark all notifications as read once the desktop dropdown closes', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    fixture.detectChanges();

    fixture.componentInstance.isOpen.set(true);
    fixture.detectChanges();
    fixture.componentInstance.isOpen.set(false);
    fixture.detectChanges();

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

  it('should not render the mobile panel until opened, for the dock layout', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    fixture.componentRef.setInput('layout', 'dock');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.um-notifications__mobile-panel')).toBeNull();
  });

  it('should open the full-screen mobile panel when the dock trigger is clicked', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    fixture.componentRef.setInput('layout', 'dock');
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.ul-dock-item').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.um-notifications__mobile-panel')).toBeTruthy();
  });

  it('should close the mobile panel when its close button is clicked', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    fixture.componentRef.setInput('layout', 'dock');
    fixture.detectChanges();
    fixture.componentInstance.isOpen.set(true);
    fixture.detectChanges();

    const closeButton = fixture.nativeElement.querySelector(
      '.um-notifications__mobile-header ul-button button',
    );
    closeButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.um-notifications__mobile-panel')).toBeNull();
  });

  it('should close the mobile panel when a notification is clicked', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    fixture.componentRef.setInput('layout', 'dock');
    fixture.detectChanges();
    fixture.componentInstance.isOpen.set(true);
    fixture.detectChanges();

    fixture.componentInstance.onNotificationClick(notifications[1]);

    expect(fixture.componentInstance.isOpen()).toBe(false);
  });
});
