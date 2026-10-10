// Mirror of src/app/domain/user/display-name.ts (and the limits in
// user-constraints.ts) — this copy is the enforcement, the client's only lets
// the form say no before a round trip. Keep both in sync; the cases in
// display-name.spec.ts are the same on both sides.
const DISPLAY_NAME_MIN_LENGTH = 2;
const DISPLAY_NAME_MAX_LENGTH = 50;

export type DisplayNameFormatError =
  | 'required'
  | 'tooShort'
  | 'tooLong'
  | 'invalidCharacters'
  | 'noLetters'
  | 'badPunctuation'
  | 'repeatedCharacters'
  | 'mixedScripts'
  | 'looksLikeLink'
  | 'tooManyDigits'
  | 'reserved';

// Names that would let someone pose as the platform or its staff. Compared
// against the whole name with everything but letters/digits removed, so
// "Admin", "a.d.m.i.n" and "ADMIN" are all the same name.
const RESERVED_DISPLAY_NAMES: ReadonlySet<string> = new Set([
  'admin',
  'administrator',
  'everyone',
  'help',
  'here',
  'moderator',
  'official',
  'root',
  'security',
  'staff',
  'support',
  'system',
  'team',
]);

// Brand names are reserved wherever they appear: "Undermarket Support" is
// exactly the kind of name a scammer would pick.
const BRAND_TOKENS: readonly string[] = ['undermarket', 'underlayer'];

// Letters, combining marks (so "é" typed as e + ´ still works), decimal
// digits, a plain space and the few punctuation marks real names use.
// Emoji, symbols and invisible/control characters are all outside it.
const ALLOWED_CHARACTERS = /^[\p{L}\p{M}\p{Nd} '’.-]+$/u;
const PUNCTUATION = /['’.-]/u;
const NAME_PART_SEPARATORS = /[ '’.-]/u;

// Scripts with letters that look like Latin ones. A word that mixes them
// ("pаypal" with a Cyrillic "а") is how names get spoofed. Mixing across
// *words* ("Anna Иванова") is normal and stays allowed.
const LOOKALIKE_SCRIPTS: readonly RegExp[] = [
  /\p{Script=Latin}/u,
  /\p{Script=Cyrillic}/u,
  /\p{Script=Greek}/u,
  /\p{Script=Armenian}/u,
  /\p{Script=Cherokee}/u,
];

// Marketplaces attract off-platform scams, and a display name is the one
// field shown everywhere. Six digits is already phone-number territory.
const MAX_DIGITS = 5;
export const MAX_REPEATED_CHARACTER_RUN = 3;
// "mary.smith", "shop.es": a dot between letters that isn't an initial ("J.R.").
const DOTTED_LINK = /[\p{L}\p{Nd}]\.\p{L}{2,}/u;

/**
 * What the user typed → the stored form. NFKC folds look-alike forms into
 * plain ones (fancy "𝓛𝓾𝓬𝓪𝓼" → "Lucas", fullwidth letters, ligatures), which is
 * what RFC 8266 (the nickname profile of PRECIS) prescribes; runs of
 * whitespace collapse to one space and the ends are trimmed. Casing is left
 * alone, since "McNamara" and "van der Berg" are real.
 */
export function normalizeDisplayName(value: string): string {
  return value.normalize('NFKC').replace(/\s+/gu, ' ').trim();
}

function hasMixedScripts(name: string): boolean {
  return name
    .split(new RegExp(NAME_PART_SEPARATORS, 'gu'))
    .some((word) => LOOKALIKE_SCRIPTS.filter((script) => script.test(word)).length > 1);
}

function isReserved(name: string): boolean {
  const key = name.toLowerCase().replace(/[^\p{L}\p{Nd}]/gu, '');
  return RESERVED_DISPLAY_NAMES.has(key) || BRAND_TOKENS.some((brand) => key.includes(brand));
}

/** Expects an already-normalized value — see normalizeDisplayName(). */
export function getDisplayNameFormatError(name: string): DisplayNameFormatError | null {
  if (!name) return 'required';
  if (name.length < DISPLAY_NAME_MIN_LENGTH) return 'tooShort';
  if (name.length > DISPLAY_NAME_MAX_LENGTH) return 'tooLong';
  if (!ALLOWED_CHARACTERS.test(name)) return 'invalidCharacters';
  if (!/\p{L}/u.test(name)) return 'noLetters';
  if (
    !/^[\p{L}\p{Nd}]/u.test(name) ||
    !/[\p{L}\p{M}\p{Nd}.]$/u.test(name) ||
    new RegExp(`${PUNCTUATION.source}{2}`, 'u').test(name)
  ) {
    return 'badPunctuation';
  }
  if (new RegExp(`(.)\\1{${MAX_REPEATED_CHARACTER_RUN},}`, 'su').test(name)) {
    return 'repeatedCharacters';
  }
  if (hasMixedScripts(name)) return 'mixedScripts';
  if (DOTTED_LINK.test(name)) return 'looksLikeLink';
  if ([...name].filter((char) => /\p{Nd}/u.test(char)).length > MAX_DIGITS) {
    return 'tooManyDigits';
  }
  if (isReserved(name)) return 'reserved';
  return null;
}
