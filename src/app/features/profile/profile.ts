import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../application/services/auth.service';
import { ListingService } from '../../application/services/listing.service';
import { UserService } from '../../application/services/user.service';
import { SeoService } from '../../core/seo/seo.service';
import { LISTING_REPOSITORY } from '../../core/configuration/tokens';
import { ListingPricePipe } from '../../shared/pipes/listing-price.pipe';
import { createListingSlug } from '../../shared/utils/slugify';
import type { Listing } from '../../domain/listing/listing.model';
import {
  AvatarComponent,
  CardComponent,
  SkeletonComponent,
  StatusComponent,
} from '@underlayerdev/ui';

@Component({
  selector: 'um-profile',
  standalone: true,
  imports: [
    RouterLink,
    AvatarComponent,
    CardComponent,
    SkeletonComponent,
    StatusComponent,
    ListingPricePipe,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly userService = inject(UserService);
  private readonly listingRepository = inject(LISTING_REPOSITORY);
  private readonly seoService = inject(SeoService);

  readonly createListingSlug = createListingSlug;
  readonly userListings = signal<Listing[]>([]);
  readonly isLoading = signal(true);

  readonly avatarInitials = computed(() => {
    const name = this.userService.profile()?.displayName;
    return name ? name.charAt(0).toUpperCase() : undefined;
  });

  readonly avatarSrc = computed(() => this.userService.profile()?.photoUrl ?? undefined);

  async ngOnInit(): Promise<void> {
    this.seoService.setPage('My Profile');

    const user = this.authService.currentUser();
    if (!user) return;

    try {
      await this.userService.loadProfile(user.id);
      const listings = await this.listingRepository.getByOwner(user.id);
      this.userListings.set(listings);
    } finally {
      this.isLoading.set(false);
    }
  }
}
