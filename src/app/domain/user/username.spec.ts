import { getUsernameFormatError, normalizeUsername } from './username';

describe('normalizeUsername', () => {
  it('should trim, strip a leading @ and lowercase', () => {
    expect(normalizeUsername('  @Jane.Doe ')).toBe('jane.doe');
  });

  it('should only strip a single leading @', () => {
    expect(normalizeUsername('@@jane')).toBe('@jane');
  });
});

describe('getUsernameFormatError', () => {
  it.each(['jane', 'jane.doe', 'jane_doe', 'j4ne', 'a'.repeat(20)])('should accept %s', (name) => {
    expect(getUsernameFormatError(name)).toBeNull();
  });

  it.each([
    ['required', ''],
    ['tooShort', 'ab'],
    ['tooLong', 'a'.repeat(21)],
    ['invalid', 'Jane'],
    ['invalid', '.jane'],
    ['invalid', 'jane_'],
    ['invalid', 'jane..doe'],
    ['invalid', 'jane-doe'],
    ['invalid', 'jаne'],
    ['invalid', '12345'],
    ['reserved', 'settings'],
    ['reserved', 'undermarket'],
  ])('should return %s for %s', (error, name) => {
    expect(getUsernameFormatError(name)).toBe(error);
  });
});
