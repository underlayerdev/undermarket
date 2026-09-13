import { getInitials } from './user-display';
import { mockUser } from './user.mock';

describe('getInitials', () => {
  it('should return the uppercased first letter of a display name', () => {
    expect(getInitials(mockUser({ displayName: 'lukitas' }))).toBe('L');
  });

  it('should return the uppercased first letter for a multi-word name', () => {
    expect(getInitials(mockUser({ displayName: 'Lucas Yamone' }))).toBe('L');
  });

  it('should return undefined for an empty or whitespace-only name', () => {
    expect(getInitials(mockUser({ displayName: '   ' }))).toBeUndefined();
  });

  it('should return undefined for a null or undefined user', () => {
    expect(getInitials(null)).toBeUndefined();
    expect(getInitials(undefined)).toBeUndefined();
  });
});
