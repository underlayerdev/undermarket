import { provideHttpClient } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  indexedDBLocalPersistence,
  inMemoryPersistence,
  initializeAuth,
} from 'firebase/auth';
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
  NOTIFICATION_PROVIDER,
  USER_REPOSITORY,
} from './core/configuration/tokens';
import { FirebaseAuthProvider } from './infrastructure/firebase/auth/firebase-auth.provider';
import { FirestoreUserRepository } from './infrastructure/firebase/firestore/firestore-user.repository';
import { FirestoreListingRepository } from './infrastructure/firebase/firestore/firestore-listing.repository';
import { CloudinaryImageStorage } from './infrastructure/cloudinary/cloudinary-image-storage';
import { MockNotificationProvider } from './infrastructure/mock/mock-notification.provider';
import { TranslocoHttpLoader } from './core/i18n/transloco-http-loader';
import { AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE } from './core/i18n/languages';
import { LanguageService } from './application/services/language.service';

const firebaseApp = initializeApp(environment.firebase);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(),
    provideTransloco({
      config: {
        availableLangs: [...AVAILABLE_LANGUAGES],
        defaultLang: DEFAULT_LANGUAGE,
        fallbackLang: DEFAULT_LANGUAGE,
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
    // LanguageService is otherwise only injected by the settings page, so
    // without this the stored preference would never be applied on startup.
    provideAppInitializer(() => {
      inject(LanguageService);
    }),
    { provide: FIREBASE_APP, useValue: firebaseApp },
    {
      provide: FIREBASE_AUTH,
      useValue: initializeAuth(firebaseApp, {
        // Session persists across reloads/browser restarts. IndexedDB is tried first;
        // Firebase falls back through the chain for browsers/contexts where it's unavailable
        // (e.g. Safari private mode), down to in-memory as the last resort.
        persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence],
      }),
    },
    { provide: FIREBASE_FIRESTORE, useValue: getFirestore(firebaseApp) },
    { provide: AUTH_PROVIDER, useClass: FirebaseAuthProvider },
    { provide: USER_REPOSITORY, useClass: FirestoreUserRepository },
    { provide: LISTING_REPOSITORY, useClass: FirestoreListingRepository },
    { provide: IMAGE_STORAGE, useClass: CloudinaryImageStorage },
    // TODO: swap for a Firestore-backed NotificationProvider once real
    // notification-triggering events are defined.
    { provide: NOTIFICATION_PROVIDER, useClass: MockNotificationProvider },
  ],
};
