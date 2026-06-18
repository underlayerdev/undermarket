import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { AUTH_PROVIDER, IMAGE_STORAGE, LISTING_REPOSITORY, USER_REPOSITORY } from './core/configuration/tokens';
import { FirebaseAuthProvider } from './infrastructure/firebase/auth/firebase-auth.provider';
import { FirestoreUserRepository } from './infrastructure/firebase/firestore/firestore-user.repository';
import { FirestoreListingRepository } from './infrastructure/firebase/firestore/firestore-listing.repository';
import { CloudinaryImageStorage } from './infrastructure/cloudinary/cloudinary-image-storage';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    { provide: AUTH_PROVIDER, useClass: FirebaseAuthProvider },
    { provide: USER_REPOSITORY, useClass: FirestoreUserRepository },
    { provide: LISTING_REPOSITORY, useClass: FirestoreListingRepository },
    { provide: IMAGE_STORAGE, useClass: CloudinaryImageStorage },
  ],
};
