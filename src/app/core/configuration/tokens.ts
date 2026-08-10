import { InjectionToken } from '@angular/core';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { AuthProvider } from '../../domain/auth/auth.provider';
import type { ImageStorage } from '../../domain/image-storage/image-storage.provider';
import type { NotificationProvider } from '../../domain/notification/notification.provider';
import type { UserRepository } from '../../domain/user/user.repository';
import type { ListingRepository } from '../../domain/listing/listing.repository';

export const FIREBASE_APP = new InjectionToken<FirebaseApp>('FIREBASE_APP');
export const FIREBASE_AUTH = new InjectionToken<Auth>('FIREBASE_AUTH');
export const FIREBASE_FIRESTORE = new InjectionToken<Firestore>('FIREBASE_FIRESTORE');
export const AUTH_PROVIDER = new InjectionToken<AuthProvider>('AUTH_PROVIDER');
export const USER_REPOSITORY = new InjectionToken<UserRepository>('USER_REPOSITORY');
export const LISTING_REPOSITORY = new InjectionToken<ListingRepository>('LISTING_REPOSITORY');
export const IMAGE_STORAGE = new InjectionToken<ImageStorage>('IMAGE_STORAGE');
export const NOTIFICATION_PROVIDER = new InjectionToken<NotificationProvider>(
  'NOTIFICATION_PROVIDER',
);
