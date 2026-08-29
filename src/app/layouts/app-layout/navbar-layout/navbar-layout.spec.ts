import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { NavbarLayoutComponent } from './navbar-layout';
import { AuthService } from '../../../application/services/auth.service';
import { NOTIFICATION_PROVIDER } from '../../../core/configuration/tokens';
import type { User } from '../../../domain/user/user.model';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';

const user: User = {
  id: '1',
  email: 'user@example.com',
  displayName: 'Lucas Yamone',
  settings: { language: 'en' },
  providerId: 'password',
  createdAt: new Date(),
};

describe('NavbarLayoutComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NavbarLayoutComponent, getTranslocoTestingModule()],
      providers: [
        { provide: AuthService, useValue: { logout: vi.fn().mockResolvedValue(undefined) } },
        { provide: Router, useValue: { navigateByUrl: vi.fn().mockResolvedValue(true) } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: NOTIFICATION_PROVIDER, useValue: { observe: () => () => {} } },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(NavbarLayoutComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should derive avatar initials from the current user display name', () => {
    const fixture = TestBed.createComponent(NavbarLayoutComponent);
    fixture.componentRef.setInput('currentUser', user);

    expect(fixture.componentInstance.avatarInitials()).toBe('L');
  });

  it('should not render notifications or the user menu when there is no current user', () => {
    const fixture = TestBed.createComponent(NavbarLayoutComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('um-notifications')).toBeNull();
    expect(fixture.nativeElement.querySelector('um-user-menu')).toBeNull();
  });

  it('should render notifications and the user menu when there is a current user', () => {
    const fixture = TestBed.createComponent(NavbarLayoutComponent);
    fixture.componentRef.setInput('currentUser', user);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('um-notifications')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('um-user-menu')).toBeTruthy();
  });

  it('should emit toggleSidebar when the navbar requests it', () => {
    const fixture = TestBed.createComponent(NavbarLayoutComponent);
    fixture.detectChanges();
    const emitted = vi.fn();
    fixture.componentInstance.toggleSidebar.subscribe(emitted);

    fixture.debugElement.query(By.css('ul-navbar')).triggerEventHandler('sidebarToggle', undefined);

    expect(emitted).toHaveBeenCalled();
  });

  it('should emit submitSearch with the trimmed query on enter', () => {
    const fixture = TestBed.createComponent(NavbarLayoutComponent);
    fixture.detectChanges();
    const emitted = vi.fn();
    fixture.componentInstance.submitSearch.subscribe(emitted);
    fixture.componentInstance.searchQuery.set('  shoes  ');

    fixture.debugElement.query(By.css('ul-input')).triggerEventHandler('inputEnter', undefined);

    expect(emitted).toHaveBeenCalledWith('shoes');
  });
});
