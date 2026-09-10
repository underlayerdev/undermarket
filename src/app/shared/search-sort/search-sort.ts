import { Component, input, model } from '@angular/core';
import { InputComponent, SelectComponent } from '@underlayerdev/ui';
import type { SelectOption } from '@underlayerdev/ui';

@Component({
  selector: 'um-search-sort',
  templateUrl: 'search-sort.html',
  styleUrl: 'search-sort.scss',
  imports: [InputComponent, SelectComponent],
})
export class SearchSortComponent {
  readonly searchPlaceholder = input('');
  readonly sortPlaceholder = input('');

  // The caller supplies which sort choices are even allowed for its own
  // entity (already translated) — this component only renders the controls,
  // it has no notion of what "sort" means for any given feature.
  readonly sortOptions = input<SelectOption[]>([]);

  // Two-way: parent owns the actual query text and sort choice (e.g. to
  // combine them into a repository call).
  readonly query = model('');
  readonly sort = model<string | null>(null);
}
