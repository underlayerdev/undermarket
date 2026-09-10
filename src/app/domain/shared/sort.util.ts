import type { SortDirection } from './sort.model';

export function sortByDate<T>(
  items: T[],
  getDate: (item: T) => Date,
  direction: SortDirection,
): T[] {
  const sorted = [...items];
  sorted.sort((a, b) =>
    direction === 'asc'
      ? getDate(a).getTime() - getDate(b).getTime()
      : getDate(b).getTime() - getDate(a).getTime(),
  );
  return sorted;
}

export function sortByText<T>(
  items: T[],
  getText: (item: T) => string,
  direction: SortDirection,
): T[] {
  const sorted = [...items];
  sorted.sort((a, b) =>
    direction === 'asc'
      ? getText(a).localeCompare(getText(b))
      : getText(b).localeCompare(getText(a)),
  );
  return sorted;
}
