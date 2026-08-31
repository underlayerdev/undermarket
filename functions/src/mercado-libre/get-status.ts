import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { firestore } from '../admin';
import { CONNECTIONS_COLLECTION } from './constants';

export interface MercadoLibreStatus {
  connected: boolean;
  lastImportAt: number | null;
  importedCount: number;
}

// Never returns tokens — only what the settings UI needs to render.
export const getMercadoLibreStatus = onCall(async (request): Promise<MercadoLibreStatus> => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }

  const snapshot = await firestore.collection(CONNECTIONS_COLLECTION).doc(request.auth.uid).get();
  if (!snapshot.exists) {
    return { connected: false, lastImportAt: null, importedCount: 0 };
  }

  const data = snapshot.data() as { lastImportAt?: { toMillis(): number }; importedCount?: number };
  return {
    connected: true,
    lastImportAt: data.lastImportAt?.toMillis() ?? null,
    importedCount: data.importedCount ?? 0,
  };
});
