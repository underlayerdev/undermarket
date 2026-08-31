import { inject, Injectable, signal } from '@angular/core';
import { MERCADO_LIBRE_PROVIDER } from '../../core/configuration/tokens';
import type {
  MercadoLibreImportResult,
  MercadoLibreStatus,
} from '../../domain/mercado-libre/mercado-libre.provider';

@Injectable({ providedIn: 'root' })
export class MercadoLibreService {
  private readonly mercadoLibreProvider = inject(MERCADO_LIBRE_PROVIDER);

  readonly status = signal<MercadoLibreStatus | null>(null);
  readonly connecting = signal(false);
  readonly importing = signal(false);

  async refreshStatus(): Promise<void> {
    this.status.set(await this.mercadoLibreProvider.getStatus());
  }

  /** Starts the OAuth flow and navigates the browser away to MercadoLibre — there is no return value, the user comes back via the callback redirect. */
  async connect(): Promise<void> {
    this.connecting.set(true);
    try {
      const { authUrl } = await this.mercadoLibreProvider.startAuth();
      window.location.href = authUrl;
    } finally {
      this.connecting.set(false);
    }
  }

  async importListings(): Promise<MercadoLibreImportResult> {
    this.importing.set(true);
    try {
      const result = await this.mercadoLibreProvider.importListings();
      await this.refreshStatus();
      return result;
    } finally {
      this.importing.set(false);
    }
  }
}
