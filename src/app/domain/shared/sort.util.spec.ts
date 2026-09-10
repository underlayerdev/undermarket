import { describe, expect, it } from 'vitest';
import { sortByDate, sortByText } from './sort.util';

describe('sortByDate', () => {
  it('sorts ascending by the mapped date', () => {
    const items = [{ createdAt: new Date('2026-06-01') }, { createdAt: new Date('2026-01-01') }];
    const sorted = sortByDate(items, (item) => item.createdAt, 'asc');
    expect(sorted.map((item) => item.createdAt.toISOString())).toEqual([
      '2026-01-01T00:00:00.000Z',
      '2026-06-01T00:00:00.000Z',
    ]);
  });

  it('sorts descending by the mapped date', () => {
    const items = [{ createdAt: new Date('2026-01-01') }, { createdAt: new Date('2026-06-01') }];
    const sorted = sortByDate(items, (item) => item.createdAt, 'desc');
    expect(sorted.map((item) => item.createdAt.toISOString())).toEqual([
      '2026-06-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
    ]);
  });

  it('does not mutate the input array', () => {
    const items = [{ createdAt: new Date('2026-01-01') }, { createdAt: new Date('2026-06-01') }];
    sortByDate(items, (item) => item.createdAt, 'desc');
    expect(items[0].createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('sortByText', () => {
  it('sorts ascending by the mapped text', () => {
    const items = [{ title: 'Zebra' }, { title: 'Antique' }];
    expect(sortByText(items, (item) => item.title, 'asc').map((item) => item.title)).toEqual([
      'Antique',
      'Zebra',
    ]);
  });

  it('sorts descending by the mapped text', () => {
    const items = [{ title: 'Antique' }, { title: 'Zebra' }];
    expect(sortByText(items, (item) => item.title, 'desc').map((item) => item.title)).toEqual([
      'Zebra',
      'Antique',
    ]);
  });
});
