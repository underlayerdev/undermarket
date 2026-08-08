// These limits are also enforced server-side in firestore.rules — keep both in sync.
export const LISTING_TITLE_MAX_LENGTH = 100;
export const LISTING_DESCRIPTION_MAX_LENGTH = 2000;
export const LISTING_MAX_PRICE = 1_000_000;
