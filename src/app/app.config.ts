import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import {
  AUTH_PROVIDER,
  FIREBASE_APP,
  FIREBASE_AUTH,
  FIREBASE_FIRESTORE,
  IMAGE_STORAGE,
  LISTING_REPOSITORY,
  USER_REPOSITORY,
} from './core/configuration/tokens';
import { FirebaseAuthProvider } from './infrastructure/firebase/auth/firebase-auth.provider';
import { FirestoreUserRepository } from './infrastructure/firebase/firestore/firestore-user.repository';
import { FirestoreListingRepository } from './infrastructure/firebase/firestore/firestore-listing.repository';
import { CloudinaryImageStorage } from './infrastructure/cloudinary/cloudinary-image-storage';

const firebaseApp = initializeApp(environment.firebase);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    { provide: FIREBASE_APP, useValue: firebaseApp },
    { provide: FIREBASE_AUTH, useValue: getAuth(firebaseApp) },
    { provide: FIREBASE_FIRESTORE, useValue: getFirestore(firebaseApp) },
    { provide: AUTH_PROVIDER, useClass: FirebaseAuthProvider },
    { provide: USER_REPOSITORY, useClass: FirestoreUserRepository },
    { provide: LISTING_REPOSITORY, useClass: FirestoreListingRepository },
    { provide: IMAGE_STORAGE, useClass: CloudinaryImageStorage },
  ],
};
