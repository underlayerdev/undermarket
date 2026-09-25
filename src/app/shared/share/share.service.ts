import { Service } from '@angular/core';

export interface ShareRequest {
  title: string;
  text?: string;
  url: string;
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'unsupported';

/**
 * Wraps the Web Share API with a clipboard fallback. `navigator.share`
 * hands off to the OS's own share sheet on Android/iOS (and any desktop
 * browser that offers one) — WhatsApp, Telegram, Messages, etc. all show up
 * there for free, no per-app integration needed. Where it's unavailable
 * (most desktop browsers today), copying the link is the next best thing.
 */
@Service()
export class ShareService {
  async share(request: ShareRequest): Promise<ShareResult> {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(request);
        return 'shared';
      } catch (err) {
        // A user dismissing the share sheet also rejects the promise —
        // that's not a failure worth falling back from.
        if (err instanceof DOMException && err.name === 'AbortError') {
          return 'cancelled';
        }
      }
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(request.url);
        return 'copied';
      } catch {
        // Permission denied, an unfocused document, etc. — reported the
        // same as no clipboard API at all rather than left to reject
        // uncaught, since every caller here fires this off without
        // awaiting it (there's no UI for it to block on).
      }
    }

    return 'unsupported';
  }
}
