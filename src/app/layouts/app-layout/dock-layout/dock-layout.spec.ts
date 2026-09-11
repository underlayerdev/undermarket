import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DockLayout } from './dock-layout';
import { NotificationService } from '../../../application/services/notification.service';
import type { User } from '../../../domain/user/user.model';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';

const user: User = {
  id: '1',
  email: 'user@example.com',
  displayName: 'Lucas Yamone',
  photoUrl: 'https://example.com/avatar.png',
  settings: { language: 'en' },
  providerId: 'password',
  createdAt: new Date(),
};

describe('DockLayout', () => {
  function setup(currentUser: User = user) {
    TestBed.configureTestingModule({
      imports: [DockLayout, getTranslocoTestingModule()],
      providers: [
        provideRouter([]),
        {
          provide: NotificationService,
          useValue: {
            notifications: signal([]),
            unreadCount: signal(0),
            markAllAsRead: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(DockLayout);
    fixture.componentRef.setInput('currentUser', currentUser);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should derive avatar initials from the current user display name', () => {
    const fixture = setup();
    expect(fixture.componentInstance.avatarInitials()).toBe('L');
  });

  it('should return undefined avatar initials when the display name is blank', () => {
    const fixture = setup({ ...user, displayName: '  ' });
    expect(fixture.componentInstance.avatarInitials()).toBeUndefined();
  });

  it('should expose the current user photo as the avatar image', () => {
    const fixture = setup();
    expect(fixture.componentInstance.userImage()).toBe('https://example.com/avatar.png');
  });

  it('should render a dock item per navigation destination', () => {
    const fixture = setup();
    const items = fixture.nativeElement.querySelectorAll('ul-dock-item');
    expect(items.length).toBe(4);
  });
});
