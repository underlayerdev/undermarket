export interface ConditionOption {
  value: 'New' | 'Used';
  // Transloco key for the display label — not the label itself, so this
  // stays plain data usable from contexts with no TranslocoService (e.g.
  // listing.validator.ts's pure functions). Mirrors CurrencyOption.labelKey.
  labelKey: string;
}

// Deliberately just these two — Vinted's own 5-tier scale (New with tags,
// New without tags, Very good, Good, Satisfactory) turned out to be more
// granularity than sellers here actually want to pick between; "is it new
// or has it been used" is the only distinction that matters.
export const CONDITIONS: readonly ConditionOption[] = [
  { value: 'New', labelKey: 'condition.new' },
  { value: 'Used', labelKey: 'condition.used' },
];

export type Condition = ConditionOption['value'];

export function getCondition(value: string): ConditionOption | undefined {
  return CONDITIONS.find((condition) => condition.value === value);
}
