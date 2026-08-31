// Keep in sync with firebase.json's hosting rewrite (which routes this
// exact path to the mercadoLibreCallback function) and whatever redirect_uri
// is registered in the MercadoLibre developer app.
export const APP_ORIGIN = 'https://undermarket.store';
export const REDIRECT_URI = `${APP_ORIGIN}/api/mercadolibre/callback`;
export const SETTINGS_URL = `${APP_ORIGIN}/settings/mercado-libre`;

// MercadoLibre Argentina only, per the app's currency/category scope.
export const ML_AUTH_HOST = 'https://auth.mercadolibre.com.ar';
export const ML_API_HOST = 'https://api.mercadolibre.com';

// Both collections are denied to all client access in firestore.rules —
// only these functions (via the Admin SDK, which bypasses rules) ever
// touch them. Never move tokens into a client-readable document.
export const AUTH_SESSIONS_COLLECTION = 'mercadoLibreAuthSessions';
export const CONNECTIONS_COLLECTION = 'mercadoLibreConnections';
