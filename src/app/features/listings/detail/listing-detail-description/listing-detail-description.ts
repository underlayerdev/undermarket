import { Component, computed, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { CollapseComponent, RichTextComponent } from '@underlayerdev/ui';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
@Component({
  selector: 'um-listing-detail-description',
  templateUrl: './listing-detail-description.html',
  imports: [TranslocoDirective, CollapseComponent, RichTextComponent],
})
export class ListingDetailDescriptionComponent {
  readonly description = input<string>('');

  // Descriptions are authored in a plain <textarea>, so they arrive as text with
  // newlines — handing that straight to ul-rich-text (which renders HTML) would
  // collapse the whole thing into one run-on paragraph. Escape first, since the
  // text is user-supplied and a description like "fits boxes < 30cm" must render
  // those characters literally rather than as markup, then promote
  // blank-line-separated blocks to <p> and single newlines to <br>. When the
  // listing form grows a real rich-text editor this conversion goes away and the
  // stored HTML gets passed through as-is.
  readonly descriptionHtml = computed(() => {
    const description = this.description().trim();
    if (!description) return '';
    return description
      .split(/\n{2,}/)
      .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br />')}</p>`)
      .join('');
  });
}
