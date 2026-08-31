import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { firestore } from '../admin';
import { AUTH_SESSIONS_COLLECTION, ML_AUTH_HOST, REDIRECT_URI } from './constants';
import { generateCodeChallenge, generateCodeVerifier, generateState } from './pkce';
import { mercadoLibreClientId } from './secrets';

export const startMercadoLibreAuth = onCall(
  { secrets: [mercadoLibreClientId] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in to connect MercadoLibre.');
    }

    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Recovers the uid + codeVerifier in the callback, which MercadoLibre
    // redirects to with no Firebase Auth context of its own.
    await firestore.collection(AUTH_SESSIONS_COLLECTION).doc(state).set({
      uid: request.auth.uid,
      codeVerifier,
      createdAt: new Date(),
    });

    const authUrl = new URL(`${ML_AUTH_HOST}/authorization`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', mercadoLibreClientId.value());
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    return { authUrl: authUrl.toString() };
  },
);
