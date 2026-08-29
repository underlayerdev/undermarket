import { getInitials } from './user-display';

describe('getInitials', () => {
  it('should return the uppercased first letter of a display name', () => {
    expect(getInitials('lukitas')).toBe('L');
  });

  it('should return the uppercased first letter for a multi-word name', () => {
    expect(getInitials('Lucas Yamone')).toBe('L');
  });

  it('should return undefined for an empty or whitespace-only name', () => {
    expect(getInitials('   ')).toBeUndefined();
  });
});
