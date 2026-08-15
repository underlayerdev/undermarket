// These limits are also enforced server-side in firestore.rules — keep both in sync.
// Max price is per-currency — see src/app/domain/currency/currency.model.ts.
export const LISTING_TITLE_MAX_LENGTH = 100;
export const LISTING_TITLE_MIN_LENGTH = 10;
export const LISTING_DESCRIPTION_MIN_LENGTH = 20;
export const LISTING_DESCRIPTION_MAX_LENGTH = 2000;
