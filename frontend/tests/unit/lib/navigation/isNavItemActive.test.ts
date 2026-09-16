import { describe, it, expect } from 'vitest';
import { isNavItemActive } from '@/lib/navigation/isNavItemActive';

describe('isNavItemActive', () => {
  it('matches the exact route', () => {
    expect(isNavItemActive('/wardrobe', '/wardrobe')).toBe(true);
  });

  it('matches a sub-route', () => {
    expect(isNavItemActive('/wardrobe/upload', '/wardrobe')).toBe(true);
    expect(isNavItemActive('/wardrobe/abc/edit', '/wardrobe')).toBe(true);
  });

  it('does not match a sibling or a prefix collision', () => {
    expect(isNavItemActive('/outfits', '/wardrobe')).toBe(false);
    expect(isNavItemActive('/wardrobe-archive', '/wardrobe')).toBe(false);
  });

  it('ignores trailing slashes on both sides', () => {
    expect(isNavItemActive('/wardrobe/', '/wardrobe')).toBe(true);
    expect(isNavItemActive('/wardrobe', '/wardrobe/')).toBe(true);
  });

  it('root href only matches root', () => {
    expect(isNavItemActive('/', '/')).toBe(true);
    expect(isNavItemActive('/wardrobe', '/')).toBe(false);
  });
});
