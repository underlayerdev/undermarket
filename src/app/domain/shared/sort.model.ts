export type SortDirection = 'asc' | 'desc';

/** One allowed sort choice for a feature's own sort-value union, e.g. ListingSortOption. */
export interface SortOption<TValue extends string = string> {
  value: TValue;
  labelKey: string;
}
