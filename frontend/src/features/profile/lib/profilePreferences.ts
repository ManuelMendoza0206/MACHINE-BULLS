/**
 * Default-aesthetic preference, stored per-user in `localStorage` (profile-flow/spec.md §2.1).
 * Deliberately **not** synced to the backend — `defaultAesthetic` isn't a field on `User`
 * (`plan-base.md` §10.1) and isn't shared across devices (gap §6.2). Read by `useOutfitFilters`
 * (outfits-flow spec 03 §2.2) to prefill the aesthetic filter when the URL has none.
 */
function storageKey(userId: string): string {
  return `styleme:profile:${userId}:defaultAesthetic`;
}

export function getDefaultAesthetic(userId: string): string | null {
  try {
    return localStorage.getItem(storageKey(userId));
  } catch {
    // Private browsing / storage disabled — informational preference, never a hard failure.
    return null;
  }
}

export function setDefaultAesthetic(userId: string, aesthetic: string | null): void {
  try {
    if (aesthetic === null) {
      localStorage.removeItem(storageKey(userId));
    } else {
      localStorage.setItem(storageKey(userId), aesthetic);
    }
  } catch {
    // Same as above — swallow, the preference just won't persist this session.
  }
}
