import { inject, Injectable } from '@angular/core';
import { httpsCallable, Functions } from 'firebase/functions';
import { FIREBASE_FUNCTIONS } from '../../../core/configuration/tokens';
import type {
  MercadoLibreImportResult,
  MercadoLibreProvider,
  MercadoLibreStatus,
} from '../../../domain/mercado-libre/mercado-libre.provider';

@Injectable({ providedIn: 'root' })
export class FirebaseMercadoLibreProvider implements MercadoLibreProvider {
  private readonly functions: Functions = inject(FIREBASE_FUNCTIONS);

  async startAuth(): Promise<{ authUrl: string }> {
    const call = httpsCallable<void, { authUrl: string }>(this.functions, 'startMercadoLibreAuth');
    const result = await call();
    return result.data;
  }

  async getStatus(): Promise<MercadoLibreStatus> {
    const call = httpsCallable<void, MercadoLibreStatus>(this.functions, 'getMercadoLibreStatus');
    const result = await call();
    return result.data;
  }

  async importListings(): Promise<MercadoLibreImportResult> {
    const call = httpsCallable<void, MercadoLibreImportResult>(
      this.functions,
      'importMercadoLibreListings',
    );
    const result = await call();
    return result.data;
  }
}
