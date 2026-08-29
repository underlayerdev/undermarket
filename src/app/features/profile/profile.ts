import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../application/services/auth.service';
import { UserService } from '../../application/services/user.service';
import { SeoService } from '../../core/seo/seo.service';
import { LISTING_REPOSITORY } from '../../core/configuration/tokens';
import { ListingPricePipe } from '../../shared/pipes/listing-price/listing-price.pipe';
import { createListingSlug } from '../../shared/utils/slugify';
import { getInitials } from '../../shared/utils/user-display';
import type { Listing } from '../../domain/listing/listing.model';
import {
  AvatarComponent,
  CardComponent,
  SkeletonComponent,
  StatusComponent,
} from '@underlayerdev/ui';

@Component({
  selector: 'um-profile',
  imports: [
    RouterLink,
    AvatarComponent,
    CardComponent,
    SkeletonComponent,
    StatusComponent,
    ListingPricePipe,
    TranslocoDirective,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class ProfileComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly userService = inject(UserService);
  private readonly listingRepository = inject(LISTING_REPOSITORY);
  private readonly seoService = inject(SeoService);
  private readonly transloco = inject(TranslocoService);

  readonly createListingSlug = createListingSlug;
  readonly userListings = signal<Listing[]>([]);
  readonly isLoading = signal(true);

  readonly avatarInitials = computed(() => {
    const name = this.userService.profile()?.displayName;
    return name ? getInitials(name) : undefined;
  });

  readonly avatarSrc = computed(() => this.userService.profile()?.photoUrl ?? undefined);

  async ngOnInit(): Promise<void> {
    this.seoService.setPage(this.transloco.translate('profile.pageTitle'));

    const user = this.authService.currentUser();
    if (!user) return;

    try {
      // ensureProfile, not loadProfile: an account with no Firestore doc yet
      // would otherwise render an empty profile instead of the auth details.
      await this.userService.ensureProfile(user);
      const listings = await this.listingRepository.getByOwner(user.id);
      this.userListings.set(listings);
    } finally {
      this.isLoading.set(false);
    }
  }
}
