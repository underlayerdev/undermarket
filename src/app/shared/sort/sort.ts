import { Component, input, model } from '@angular/core';
import { SelectComponent } from '@underlayerdev/ui';
import type { SelectOption } from '@underlayerdev/ui';

@Component({
  selector: 'um-sort',
  template: `<ul-select
    class="um-sort"
    [placeholder]="placeholder()"
    [options]="sortOptions()"
    [(value)]="sort"
  />`,
  styleUrl: 'sort.scss',
  imports: [SelectComponent],
})
export class SortComponent {
  readonly placeholder = input('');

  // The caller supplies which sort choices are even allowed for its own
  // entity (already translated) — this component only renders the controls,
  // it has no notion of what "sort" means for any given feature.
  readonly sortOptions = input<SelectOption[]>([]);

  readonly sort = model<string | null>(null);
}
