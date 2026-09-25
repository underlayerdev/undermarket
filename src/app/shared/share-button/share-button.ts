import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ButtonComponent, IconComponent } from '@underlayerdev/ui';
import { ShareService } from '../share/share.service';

/**
 * A single icon button sharing the current page. `ShareService` hands off
 * to the OS share sheet where available; when it falls back to copying the
 * URL instead, the icon and aria-label swap to a checkmark for a couple of
 * seconds so that path — the only one with no native UI of its own — still
 * gets visible confirmation.
 */
@Component({
  selector: 'um-share-button',
  template: `
    <ng-container *transloco="let t">
      <ul-button
        type="button"
        theme="ghost-white"
        size="md"
        [iconOnly]="true"
        [ariaLabel]="copied() ? t('shareButton.copied') : t('shareButton.share')"
        (buttonClick)="onClick()"
      >
        <ul-icon [icon]="copied() ? 'check' : 'share'" size="5" />
      </ul-button>
    </ng-container>
  `,
  imports: [ButtonComponent, IconComponent, TranslocoDirective],
})
export class ShareButtonComponent {
  readonly title = input.required<string>();
  readonly text = input<string>();

  private readonly shareService = inject(ShareService);
  private copiedTimeout?: ReturnType<typeof setTimeout>;

  protected readonly copied = signal(false);

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.copiedTimeout));
  }

  protected async onClick(): Promise<void> {
    const result = await this.shareService.share({
      title: this.title(),
      text: this.text(),
      url: location.href,
    });
    if (result === 'copied') {
      this.showCopied();
    }
  }

  private showCopied(): void {
    clearTimeout(this.copiedTimeout);
    this.copied.set(true);
    this.copiedTimeout = setTimeout(() => this.copied.set(false), 2000);
  }
}
