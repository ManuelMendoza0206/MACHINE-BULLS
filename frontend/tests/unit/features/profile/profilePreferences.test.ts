import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDefaultAesthetic,
  setDefaultAesthetic,
} from '@/features/profile/lib/profilePreferences';

describe('profilePreferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null for a user with no saved preference (never throws, never undefined)', () => {
    const result = getDefaultAesthetic('user-without-prefs');
    expect(result).toBeNull();
  });

  it('roundtrips a saved preference', () => {
    setDefaultAesthetic('user-1', 'streetwear');
    expect(getDefaultAesthetic('user-1')).toBe('streetwear');
  });

  it('isolates preferences by userId — two users never share a key', () => {
    setDefaultAesthetic('user-1', 'streetwear');
    setDefaultAesthetic('user-2', 'old_money');

    expect(getDefaultAesthetic('user-1')).toBe('streetwear');
    expect(getDefaultAesthetic('user-2')).toBe('old_money');
  });

  it('setting null clears the stored preference', () => {
    setDefaultAesthetic('user-1', 'streetwear');
    setDefaultAesthetic('user-1', null);
    expect(getDefaultAesthetic('user-1')).toBeNull();
  });

  it('uses the documented key format', () => {
    setDefaultAesthetic('abc', 'gorpcore');
    expect(localStorage.getItem('styleme:profile:abc:defaultAesthetic')).toBe('gorpcore');
  });
});
