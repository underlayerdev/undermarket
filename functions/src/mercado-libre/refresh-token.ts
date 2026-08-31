import { firestore } from '../admin';
import { CONNECTIONS_COLLECTION, ML_API_HOST } from './constants';
import { mercadoLibreClientId, mercadoLibreClientSecret } from './secrets';

interface StoredConnection {
  accessToken: string;
  refreshToken: string;
  mlUserId: number;
  expiresAt: FirebaseFirestore.Timestamp;
}

interface AccessToken {
  accessToken: string;
  mlUserId: number;
}

const EXPIRY_SAFETY_MARGIN_MS = 60_000;

/** Returns the current access token, refreshing it first if it's expired (or about to). Returns null if there's no connection to refresh. */
export async function getValidAccessToken(uid: string): Promise<AccessToken | null> {
  const ref = firestore.collection(CONNECTIONS_COLLECTION).doc(uid);
  const snapshot = await ref.get();
  if (!snapshot.exists) return null;

  const data = snapshot.data() as StoredConnection;
  if (Date.now() < data.expiresAt.toMillis() - EXPIRY_SAFETY_MARGIN_MS) {
    return { accessToken: data.accessToken, mlUserId: data.mlUserId };
  }

  const response = await fetch(`${ML_API_HOST}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: mercadoLibreClientId.value(),
      client_secret: mercadoLibreClientSecret.value(),
      refresh_token: data.refreshToken,
    }),
  });
  if (!response.ok) {
    throw new Error('Failed to refresh the MercadoLibre access token — reconnecting is required.');
  }

  const tokenData = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user_id: number;
  };

  // MercadoLibre rotates the refresh token on every use — the old one stops
  // working, so it must be replaced, not just the access token.
  await ref.update({
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
  });

  return { accessToken: tokenData.access_token, mlUserId: tokenData.user_id };
}
