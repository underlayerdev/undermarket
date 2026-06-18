import { InjectionToken } from '@angular/core';
import type { AuthProvider } from '../../domain/providers/auth.provider';
import type { ImageStorage } from '../../domain/providers/image-storage.provider';
import type { UserRepository } from '../../domain/repositories/user.repository';
import type { ListingRepository } from '../../domain/repositories/listing.repository';

export const AUTH_PROVIDER = new InjectionToken<AuthProvider>('AUTH_PROVIDER');
export const USER_REPOSITORY = new InjectionToken<UserRepository>('USER_REPOSITORY');
export const LISTING_REPOSITORY = new InjectionToken<ListingRepository>('LISTING_REPOSITORY');
export const IMAGE_STORAGE = new InjectionToken<ImageStorage>('IMAGE_STORAGE');
