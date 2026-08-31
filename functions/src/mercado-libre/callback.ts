import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';
import { firestore } from '../admin';
import {
  AUTH_SESSIONS_COLLECTION,
  CONNECTIONS_COLLECTION,
  ML_API_HOST,
  REDIRECT_URI,
  SETTINGS_URL,
} from './constants';
import { mercadoLibreClientId, mercadoLibreClientSecret } from './secrets';

interface MercadoLibreTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: number;
}

// The registered redirect_uri (see firebase.json's hosting rewrite) —
// MercadoLibre redirects the browser here with no Firebase Auth context,
// so the uid is recovered from the auth-session doc startMercadoLibreAuth
// created, keyed by `state`.
export const mercadoLibreCallback = onRequest(
  { region: 'us-central1', secrets: [mercadoLibreClientId, mercadoLibreClientSecret] },
  async (req, res) => {
    const { code, state, error } = req.query as Record<string, string | undefined>;

    if (error || !code || !state) {
      res.redirect(`${SETTINGS_URL}?error=${encodeURIComponent(error ?? 'missing_code')}`);
      return;
    }

    const sessionRef = firestore.collection(AUTH_SESSIONS_COLLECTION).doc(state);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      res.redirect(`${SETTINGS_URL}?error=invalid_state`);
      return;
    }
    const { uid, codeVerifier } = sessionSnap.data() as { uid: string; codeVerifier: string };

    try {
      const tokenResponse = await fetch(`${ML_API_HOST}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: mercadoLibreClientId.value(),
          client_secret: mercadoLibreClientSecret.value(),
          code,
          redirect_uri: REDIRECT_URI,
          code_verifier: codeVerifier,
        }),
      });

      if (!tokenResponse.ok) {
        logger.error('MercadoLibre token exchange failed', await tokenResponse.text());
        res.redirect(`${SETTINGS_URL}?error=token_exchange_failed`);
        return;
      }

      const tokenData = (await tokenResponse.json()) as MercadoLibreTokenResponse;

      await firestore
        .collection(CONNECTIONS_COLLECTION)
        .doc(uid)
        .set({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          mlUserId: tokenData.user_id,
          expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
          connectedAt: new Date(),
        });

      await sessionRef.delete();

      res.redirect(`${SETTINGS_URL}?connected=true`);
    } catch (err) {
      logger.error('MercadoLibre callback failed', err);
      res.redirect(`${SETTINGS_URL}?error=unexpected`);
    }
  },
);
