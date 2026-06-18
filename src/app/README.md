# Undermarket — App Architecture

## Overview

Undermarket follows a **clean architecture** approach with four explicit layers. The goal is to keep business logic independent from infrastructure so that Firebase, Cloudinary, or any other backend can be swapped without touching a single feature component.

---

## Layers

```
domain/          ← pure TypeScript interfaces & types — no Angular, no SDKs
application/     ← Angular services that orchestrate domain objects
infrastructure/  ← concrete implementations (Firebase, Cloudinary, etc.)
features/        ← Angular components — consume application services only
```

### `domain/`

Contains:
- **Models** — plain TypeScript interfaces (`User`, `Listing`) and branded types (`UserId`, `ListingId`)
- **Repositories** — interfaces that describe data access (`UserRepository`, `ListingRepository`)
- **Providers** — interfaces that describe external services (`AuthProvider`, `ImageStorage`)

**Rule**: No Angular imports. No SDK imports. Pure TypeScript only.

### `application/`

Contains Angular `@Injectable` services (`AuthService`, `ListingService`, `UserService`, `ErrorService`).

- Orchestrates domain operations
- Holds application state via signals (`signal<User | null>(null)`)
- Injects infrastructure via **InjectionTokens** — never directly

**Rule**: Never import concrete infrastructure classes. Always use tokens.

### `infrastructure/`

Contains concrete implementations of domain interfaces:

| Class | Implements | SDK |
|---|---|---|
| `FirebaseAuthProvider` | `AuthProvider` | Firebase Auth |
| `FirestoreUserRepository` | `UserRepository` | Firestore |
| `FirestoreListingRepository` | `ListingRepository` | Firestore |
| `CloudinaryImageStorage` | `ImageStorage` | Cloudinary |

All are currently **stubs** — methods throw `Error('Not implemented')` until the Firebase and Cloudinary SDKs are installed.

Bound to their tokens in `app.config.ts`:
```ts
{ provide: AUTH_PROVIDER, useClass: FirebaseAuthProvider }
```

### `features/`

Angular standalone components — one folder per page/feature. Components inject application services only.

---

## Swapping Firebase for Web3 / another backend

1. Create a new class implementing the relevant domain interface, e.g. `Web3AuthProvider implements AuthProvider`
2. In `app.config.ts` change one line:
   ```ts
   { provide: AUTH_PROVIDER, useClass: Web3AuthProvider }
   ```
3. Nothing else changes — features and application services are unaware of the implementation.

The same pattern applies to `UserRepository` and `ListingRepository`.

---

## Swapping Cloudinary for IPFS

1. Create `IpfsImageStorage implements ImageStorage` in `infrastructure/ipfs/`
2. In `app.config.ts`:
   ```ts
   { provide: IMAGE_STORAGE, useClass: IpfsImageStorage }
   ```
3. Done — `ListingService` calls `imageStorage.upload(file)` and receives a URL regardless.

---

## Current stub status

All infrastructure classes are stubs. When you are ready to wire Firebase:

1. `npm install firebase @angular/fire` (or the bare `firebase` SDK)
2. Implement each method in `infrastructure/firebase/`
3. Remove the `// TODO: inject Firebase SDK` comments

No feature code changes needed.

---

## State management

Application state lives in signals on services:

- `authService.currentUser` — currently authenticated user
- `listingService.listings` — current page of listings (home or search results)
- `userService.profile` — loaded user profile

There is no global store, no NgRx, no BehaviorSubject. Signals are sufficient for MVP.
