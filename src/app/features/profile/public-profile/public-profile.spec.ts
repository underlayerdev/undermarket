import { TestBed } from '@angular/core/testing';
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
  let navigateByUrlSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getByIdSpy = vi.fn();
    navigateByUrlSpy = vi.fn().mockResolvedValue(true);
  });

  function setup(currentUser: { id: string } | null, userId = 'other-user') {
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
        { provide: USER_REPOSITORY, useValue: { getById: getByIdSpy } },
        {
          provide: LISTING_REPOSITORY,
          useValue: { getPublicByOwner: vi.fn().mockResolvedValue([]) },
        },
        { provide: Router, useValue: { navigateByUrl: navigateByUrlSpy } },
        { provide: ActivatedRoute, useValue: {} },
      ],
    });

    const fixture = TestBed.createComponent(PublicProfileComponent);
    fixture.componentRef.setInput('userId', userId);
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

  it("should not show the requested user's email", async () => {
    getByIdSpy.mockResolvedValue(mockUser({ email: 'secret@example.com' }));
    const fixture = setup(null, 'other-user');
    await flushAsync();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('secret@example.com');
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
});
