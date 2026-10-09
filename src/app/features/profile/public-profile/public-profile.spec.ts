import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PublicProfileComponent } from './public-profile';
import { AuthService } from '../../../application/services/auth.service';
import { LISTING_REPOSITORY, USER_REPOSITORY } from '../../../core/configuration/tokens';
import { mockUser } from '../../../domain/user/user.mock';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';

function flushAsync(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('PublicProfileComponent', () => {
  let getByIdSpy: ReturnType<typeof vi.fn>;
  let getByUsernameSpy: ReturnType<typeof vi.fn>;
  let navigateByUrlSpy: ReturnType<typeof vi.fn>;
  let replaceStateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getByIdSpy = vi.fn();
    getByUsernameSpy = vi.fn();
    navigateByUrlSpy = vi.fn().mockResolvedValue(true);
    replaceStateSpy = vi.fn();
  });

  function setup(
    currentUser: { id: string } | null,
    userId = 'other-user',
    inputName: 'userId' | 'username' = 'userId',
  ) {
    TestBed.configureTestingModule({
      imports: [PublicProfileComponent, getTranslocoTestingModule()],
      providers: [
        {
          provide: AuthService,
          useValue: {
            currentUser: () => currentUser,
            ready: Promise.resolve(),
          },
        },
        {
          provide: USER_REPOSITORY,
          useValue: { getById: getByIdSpy, getByUsername: getByUsernameSpy },
        },
        { provide: Location, useValue: { replaceState: replaceStateSpy } },
        {
          provide: LISTING_REPOSITORY,
          useValue: { getPublicByOwner: vi.fn().mockResolvedValue([]) },
        },
        { provide: Router, useValue: { navigateByUrl: navigateByUrlSpy } },
        { provide: ActivatedRoute, useValue: {} },
      ],
    });

    const fixture = TestBed.createComponent(PublicProfileComponent);
    fixture.componentRef.setInput(inputName, userId);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    getByIdSpy.mockResolvedValue(mockUser());
    const fixture = setup(null);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should redirect to /profile when viewing your own profile', async () => {
    setup({ id: 'own-id' }, 'own-id');
    await flushAsync();

    expect(navigateByUrlSpy).toHaveBeenCalledWith('/profile');
    expect(getByIdSpy).not.toHaveBeenCalled();
  });

  it('should load and show the requested user', async () => {
    getByIdSpy.mockResolvedValue(mockUser({ id: 'other-user', displayName: 'Jane Seller' }));
    const fixture = setup(null, 'other-user');
    await flushAsync();
    fixture.detectChanges();

    expect(getByIdSpy).toHaveBeenCalledWith('other-user');
    expect(fixture.componentInstance.profileUser()?.displayName).toBe('Jane Seller');
    expect(fixture.nativeElement.textContent).toContain('Jane Seller');
    expect(fixture.componentInstance.notFound()).toBe(false);
  });

  it('should show a not-found state when the user does not exist', async () => {
    getByIdSpy.mockResolvedValue(null);
    const fixture = setup(null, 'missing-user');
    await flushAsync();
    fixture.detectChanges();

    expect(fixture.componentInstance.notFound()).toBe(true);
    expect(fixture.componentInstance.profileUser()).toBeNull();
  });

  it("should allow a signed-in user to view someone else's profile without redirecting", async () => {
    getByIdSpy.mockResolvedValue(mockUser({ id: 'other-user' }));
    const fixture = setup({ id: 'viewer-id' }, 'other-user');
    await flushAsync();
    fixture.detectChanges();

    expect(navigateByUrlSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.profileUser()).not.toBeNull();
  });

  describe('via /u/:username', () => {
    it('should resolve the handle (normalized) and show its owner', async () => {
      getByUsernameSpy.mockResolvedValue(
        mockUser({ id: 'other-user', username: 'jane.doe', displayName: 'Jane Seller' }),
      );
      const fixture = setup(null, 'Jane.Doe', 'username');
      await flushAsync();

      expect(getByUsernameSpy).toHaveBeenCalledWith('jane.doe');
      expect(getByIdSpy).not.toHaveBeenCalled();
      expect(fixture.componentInstance.profileUser()?.displayName).toBe('Jane Seller');
      expect(replaceStateSpy).not.toHaveBeenCalled();
    });

    it('should show the profile under its current handle when an old one was used', async () => {
      getByUsernameSpy.mockResolvedValue(mockUser({ id: 'other-user', username: 'jane.new' }));
      const fixture = setup(null, 'jane.old', 'username');
      await flushAsync();

      expect(replaceStateSpy).toHaveBeenCalledWith('/u/jane.new');
      expect(fixture.componentInstance.profileUser()?.username).toBe('jane.new');
    });

    it('should redirect to /profile when the handle is your own', async () => {
      getByUsernameSpy.mockResolvedValue(mockUser({ id: 'own-id', username: 'me' }));
      setup({ id: 'own-id' }, 'me', 'username');
      await flushAsync();

      expect(navigateByUrlSpy).toHaveBeenCalledWith('/profile');
    });

    it('should show not-found for an unknown handle', async () => {
      getByUsernameSpy.mockResolvedValue(null);
      const fixture = setup(null, 'nobody', 'username');
      await flushAsync();

      expect(fixture.componentInstance.notFound()).toBe(true);
    });
  });
});
