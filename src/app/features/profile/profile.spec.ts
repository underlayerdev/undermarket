import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProfileComponent } from './profile';
import { AuthService } from '../../application/services/auth.service';
import { ListingService } from '../../application/services/listing.service';
import { UserService } from '../../application/services/user.service';
import { LISTING_REPOSITORY } from '../../core/configuration/tokens';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';

describe('ProfileComponent', () => {
  let ensureProfileSpy: ReturnType<typeof vi.fn>;

  function setup(
    currentUser: { id: string; email: string } | null = { id: 'user-1', email: 'a@b.com' },
  ) {
    ensureProfileSpy = vi.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      imports: [ProfileComponent, getTranslocoTestingModule()],
      providers: [
        { provide: AuthService, useValue: { currentUser: () => currentUser } },
        {
          provide: UserService,
          useValue: {
            profile: () => (currentUser ? { displayName: 'Test User', photoUrl: null } : null),
            ensureProfile: ensureProfileSpy,
          },
        },
        // ProfileListingsComponent (rendered once the profile loads) injects
        // these directly — minimal stubs keep it from erroring on init.
        { provide: LISTING_REPOSITORY, useValue: { getByOwner: vi.fn().mockResolvedValue([]) } },
        { provide: ListingService, useValue: {} },
        provideRouter([]),
      ],
    });

    const fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should ensure the profile exists for the current user', async () => {
    const fixture = setup();
    await fixture.whenStable();

    expect(ensureProfileSpy).toHaveBeenCalledWith({ id: 'user-1', email: 'a@b.com' });
  });

  it('should do nothing when there is no signed-in user', async () => {
    const fixture = setup(null);
    await fixture.whenStable();

    expect(ensureProfileSpy).not.toHaveBeenCalled();
  });
});
