import { Injectable, signal } from '@angular/core';

export type SettingsFeedbackVariant = 'success' | 'error';

/**
 * Drives the one feedback modal mounted in SettingsComponent (see
 * settings.html), so every settings page reports "saved" / "something went
 * wrong" the same way instead of each toggling its own modal's open state.
 * A modal rather than a toast because these are the confirmations for
 * settings a user just deliberately changed — a message that can vanish
 * on its own before they've read it isn't good enough here.
 */
@Injectable({ providedIn: 'root' })
export class SettingsFeedbackService {
  readonly open = signal(false);
  readonly variant = signal<SettingsFeedbackVariant>('success');
  readonly message = signal('');

  success(message: string): void {
    this.show('success', message);
  }

  error(message: string): void {
    this.show('error', message);
  }

  dismiss(): void {
    this.open.set(false);
  }

  private show(variant: SettingsFeedbackVariant, message: string): void {
    this.variant.set(variant);
    this.message.set(message);
    this.open.set(true);
  }
}
