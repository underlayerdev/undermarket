import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterLink } from '@angular/router';
import { MenuComponent } from '@underlayerdev/ui';
import { ListingDetailActionsComponent } from './listing-detail-actions';
import { ListingDetailStore } from '../listing-detail.store';
import { ShareService } from '../../../../shared/share/share.service';
import { AuthService } from '../../../../application/services/auth.service';
import { getTranslocoTestingModule } from '../../../../../testing/transloco-testing';
import {
  AUTH_PROVIDER,
  IMAGE_STORAGE,
  LISTING_REPOSITORY,
  USER_REPOSITORY,
} from '../../../../core/configuration/tokens';
import type { AuthProvider } from '../../../../domain/auth/auth.provider';
import type { ImageStorage } from '../../../../domain/image-storage/image-storage.provider';
import type { ListingRepository } from '../../../../domain/listing/listing.repository';
import type { Listing } from '../../../../domain/listing/listing.model';
import type { User } from '../../../../domain/user/user.model';
import { mockUser } from '../../../../domain/user/user.mock';

// A raw DOM click's handler chain (onPublishClick → store.publish →
// listingService.update, then back up to the actionResult emit) crosses
// more microtask boundaries than a fixed number of `await Promise.resolve()`
// reliably covers — a real macrotask boundary guarantees every pending
// microtask has drained, same helper listing-detail.spec.ts uses for the
// same reason.
function flushAsync(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'listing-1',
    ownerId: 'owner-1',
    title: 'A nice chair',
    description: 'A nice chair, barely used.',
    price: 1000,
    currency: 'USD',
    category: 'Furniture',
    imageUrls: [],
    status: 'active',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createAuthProviderMock(): AuthProvider & { emitAuthState: (user: User | null) => void } {
  let listener: ((user: User | null) => void) | null = null;
  return {
    login: async () => {
      throw new Error('not implemented');
    },
    register: async () => {
      throw new Error('not implemented');
    },
    loginWithOAuth: async () => {
      throw new Error('not implemented');
    },
    loginAnonymously: async () => {
      throw new Error('not implemented');
    },
    sendPasswordResetEmail: async () => undefined,
    confirmPasswordReset: async () => undefined,
    changePassword: async () => undefined,
    updateDisplayName: async () => undefined,
    updatePhotoUrl: async () => undefined,
    deleteAccount: async () => undefined,
    logout: async () => undefined,
    currentUser: () => null,
    onAuthStateChange: (callback) => {
      listener = callback;
      return () => {
        listener = null;
      };
    },
    emitAuthState: (user) => listener?.(user),
  };
}

async function setup(
  options: {
    updateSpy?: ReturnType<typeof vi.fn<ListingRepository['update']>>;
    initialListing?: Listing;
    currentUser?: User | null;
    shareSpy?: ReturnType<typeof vi.fn>;
  } = {},
): Promise<{
  fixture: ReturnType<typeof TestBed.createComponent<ListingDetailActionsComponent>>;
  store: ListingDetailStore;
}> {
  const listingRepositoryMock: Partial<ListingRepository> = {
    getById: vi.fn(async () => options.initialListing ?? listing()),
    update: options.updateSpy ?? vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
  };
  const authProviderMock = createAuthProviderMock();

  TestBed.configureTestingModule({
    imports: [ListingDetailActionsComponent, getTranslocoTestingModule()],
    providers: [
      ListingDetailStore,
      provideRouter([]),
      { provide: AUTH_PROVIDER, useValue: authProviderMock },
      { provide: LISTING_REPOSITORY, useValue: listingRepositoryMock },
      { provide: USER_REPOSITORY, useValue: { getById: vi.fn(async () => null) } },
      { provide: IMAGE_STORAGE, useValue: { upload: vi.fn() } as ImageStorage },
      { provide: ShareService, useValue: { share: options.shareSpy ?? vi.fn() } },
    ],
  });

  // AuthService only registers its listener with the provider from its own
  // constructor — injecting it here forces that construction, so
  // emitAuthState below actually reaches someone.
  const authService = TestBed.inject(AuthService);
  authProviderMock.emitAuthState(options.currentUser ?? null);
  await authService.ready;

  const store = TestBed.inject(ListingDetailStore);
  await store.load('listing-1');

  const fixture = TestBed.createComponent(ListingDetailActionsComponent);
  return { fixture, store };
}

describe('ListingDetailActionsComponent', () => {
  it('should create', async () => {
    const { fixture } = await setup();
    fixture.componentRef.setInput('variant', 'list');
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('variant="menu"', () => {
    it('should render a ul-menu trigger', async () => {
      const { fixture } = await setup();
      fixture.componentRef.setInput('variant', 'menu');
      fixture.detectChanges();

      const menu = fixture.nativeElement.querySelector('ul-menu');
      expect(menu).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.listing-detail__owner-actions')).toBeNull();
    });

    it('should offer only share to a non-owner', async () => {
      const { fixture } = await setup({ currentUser: null });
      fixture.componentRef.setInput('variant', 'menu');
      fixture.detectChanges();

      const items = fixture.debugElement
        .query(By.directive(MenuComponent))
        .componentInstance.items() as { value?: string }[];
      expect(items.map((item) => item.value)).toEqual(['share']);
    });

    it("should append the owner's actions after share for the owner", async () => {
      const { fixture } = await setup({ currentUser: mockUser({ id: 'owner-1' }) });
      fixture.componentRef.setInput('variant', 'menu');
      fixture.detectChanges();

      const items = fixture.debugElement
        .query(By.directive(MenuComponent))
        .componentInstance.items() as { value?: string }[];
      expect(items.map((item) => item.value)).toEqual(['share', 'edit', 'markSold', 'delete']);
    });

    describe('share', () => {
      // Simulates ul-menu itself firing itemSelected (its own bottom
      // sheet/dropdown panel isn't necessarily open in the DOM here), the
      // same way it does for a real selection — the template's own
      // (itemSelected)="onActionSelected($event)" binding does the rest.
      function selectShare(
        fixture: ReturnType<typeof TestBed.createComponent<ListingDetailActionsComponent>>,
      ): void {
        fixture.debugElement
          .query(By.directive(MenuComponent))
          .componentInstance.itemSelected.emit({ label: 'Share', value: 'share' });
      }

      it('should share via ShareService with the listing title and current URL', async () => {
        const shareSpy = vi.fn(async () => 'shared' as const);
        const { fixture } = await setup({ shareSpy });
        fixture.componentRef.setInput('variant', 'menu');
        fixture.detectChanges();

        selectShare(fixture);
        await flushAsync();

        expect(shareSpy).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'A nice chair', url: location.href }),
        );
      });

      it('should report a success result when the share falls back to the clipboard', async () => {
        const shareSpy = vi.fn(async () => 'copied' as const);
        const { fixture } = await setup({ shareSpy });
        fixture.componentRef.setInput('variant', 'menu');
        fixture.detectChanges();
        const actionResultSpy = vi.fn();
        fixture.componentInstance.actionResult.subscribe(actionResultSpy);

        selectShare(fixture);
        await flushAsync();

        expect(actionResultSpy).toHaveBeenCalledWith(
          expect.objectContaining({ variant: 'success' }),
        );
      });

      it('should not emit a result when the native share sheet was used or dismissed', async () => {
        const shareSpy = vi.fn(async () => 'shared' as const);
        const { fixture } = await setup({ shareSpy });
        fixture.componentRef.setInput('variant', 'menu');
        fixture.detectChanges();
        const actionResultSpy = vi.fn();
        fixture.componentInstance.actionResult.subscribe(actionResultSpy);

        selectShare(fixture);
        await flushAsync();

        expect(actionResultSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('variant="list"', () => {
    it('should render one button per owner action, offering publish only for a draft listing', async () => {
      const { fixture } = await setup({ initialListing: listing({ status: 'draft' }) });
      fixture.componentRef.setInput('variant', 'list');
      fixture.detectChanges();

      const labels = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('ul-button'),
      ).map((button) => button.textContent?.trim());
      expect(labels).toEqual(['Publish listing', 'Edit listing', 'Mark as sold', 'Delete listing']);
    });

    it('should not offer mark-as-sold for a listing that is already sold', async () => {
      const { fixture } = await setup({ initialListing: listing({ status: 'sold' }) });
      fixture.componentRef.setInput('variant', 'list');
      fixture.detectChanges();

      const labels = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('ul-button'),
      ).map((button) => button.textContent?.trim());
      expect(labels).not.toContain('Mark as sold');
    });
  });

  describe('publish', () => {
    it('should update the listing via the store and emit a success result', async () => {
      const updateSpy = vi.fn<ListingRepository['update']>(async () => undefined);
      const { fixture, store } = await setup({
        initialListing: listing({ status: 'draft' }),
        updateSpy,
      });
      fixture.componentRef.setInput('variant', 'list');
      fixture.detectChanges();
      const actionResultSpy = vi.fn();
      fixture.componentInstance.actionResult.subscribe(actionResultSpy);

      const publishButton = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('ul-button'),
      ).find((button) => button.textContent?.includes('Publish listing')) as HTMLElement;
      publishButton
        .querySelector('button')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flushAsync();

      expect(store.listing()?.status).toBe('active');
      expect(actionResultSpy).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }));
    });

    it('should emit an error result with a user-facing message when the update fails', async () => {
      const updateSpy = vi.fn<ListingRepository['update']>(async () => {
        throw new Error('offline');
      });
      const { fixture } = await setup({ initialListing: listing({ status: 'draft' }), updateSpy });
      fixture.componentRef.setInput('variant', 'list');
      fixture.detectChanges();
      const actionResultSpy = vi.fn();
      fixture.componentInstance.actionResult.subscribe(actionResultSpy);

      const publishButton = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('ul-button'),
      ).find((button) => button.textContent?.includes('Publish listing')) as HTMLElement;
      publishButton
        .querySelector('button')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flushAsync();

      expect(actionResultSpy).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error' }));
    });
  });

  describe('delete', () => {
    it('should emit deleteRequested rather than deleting directly', async () => {
      const { fixture, store } = await setup();
      fixture.componentRef.setInput('variant', 'list');
      fixture.detectChanges();
      const deleteRequestedSpy = vi.fn();
      fixture.componentInstance.deleteRequested.subscribe(deleteRequestedSpy);

      const deleteButton = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('ul-button'),
      ).find((button) => button.textContent?.includes('Delete listing')) as HTMLElement;
      deleteButton
        .querySelector('button')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(deleteRequestedSpy).toHaveBeenCalledTimes(1);
      // Confirms the component never deletes on its own — that stays with
      // whichever component owns the (single, non-duplicated) confirmation
      // dialog, per ListingDetailActionsComponent's own class doc.
      expect(store.listing()).not.toBeNull();
    });
  });

  describe('edit', () => {
    it('should bind [routerLink] to the edit page for the current listing', async () => {
      const { fixture } = await setup();
      fixture.componentRef.setInput('variant', 'list');
      fixture.detectChanges();

      const editLink = fixture.debugElement.query(By.directive(RouterLink));
      expect(editLink.injector.get(RouterLink).urlTree?.toString()).toBe(
        '/listings/a-nice-chair-listing-1/edit',
      );
    });
  });
});
