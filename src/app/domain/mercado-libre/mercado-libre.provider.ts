export interface MercadoLibreStatus {
  connected: boolean;
  lastImportAt: number | null;
  importedCount: number;
}

export interface MercadoLibreImportResult {
  importedCount: number;
  skippedCount: number;
}

/** Talks to the mercado-libre Cloud Functions — never handles MercadoLibre tokens directly, those never leave the server. */
export interface MercadoLibreProvider {
  /** Starts the OAuth flow; resolves with the URL to redirect the browser to. */
  startAuth(): Promise<{ authUrl: string }>;
  getStatus(): Promise<MercadoLibreStatus>;
  importListings(): Promise<MercadoLibreImportResult>;
}
