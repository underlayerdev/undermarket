import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';
import { NOTIFICATION_PROVIDER } from '../../core/configuration/tokens';
import type { NotificationProvider } from '../../domain/notification/notification.provider';
import type { Notification } from '../../domain/notification/notification.model';

const notifications: Notification[] = [
  { id: '1', message: 'First', read: false, createdAt: new Date() },
  { id: '2', message: 'Second', read: false, createdAt: new Date() },
];

function createProviderMock(): NotificationProvider & { emit: (n: Notification[]) => void } {
  let listener: ((n: Notification[]) => void) | null = null;
  return {
    observe: (callback) => {
      listener = callback;
      callback(notifications);
      return () => {
        listener = null;
      };
    },
    markAsRead: vi.fn().mockResolvedValue(undefined),
    markAllAsRead: vi.fn().mockResolvedValue(undefined),
    emit: (n) => listener?.(n),
  };
}

describe('NotificationService', () => {
  function setup() {
    const providerMock = createProviderMock();
    TestBed.configureTestingModule({
      providers: [{ provide: NOTIFICATION_PROVIDER, useValue: providerMock }],
    });
    return { service: TestBed.inject(NotificationService), providerMock };
  }

  it('should create and populate notifications from the provider on init', () => {
    const { service } = setup();
    expect(service.notifications()).toEqual(notifications);
  });

  it('should compute unreadCount from the current notifications', () => {
    const { service } = setup();
    expect(service.unreadCount()).toBe(2);
  });

  it('should reflect provider updates reactively', () => {
    const { service, providerMock } = setup();

    providerMock.emit([{ ...notifications[0], read: true }, notifications[1]]);

    expect(service.unreadCount()).toBe(1);
  });

  it('should delegate markAsRead to the provider', async () => {
    const { service, providerMock } = setup();
    await service.markAsRead('1');
    expect(providerMock.markAsRead).toHaveBeenCalledWith('1');
  });

  it('should delegate markAllAsRead to the provider', async () => {
    const { service, providerMock } = setup();
    await service.markAllAsRead();
    expect(providerMock.markAllAsRead).toHaveBeenCalled();
  });
});
