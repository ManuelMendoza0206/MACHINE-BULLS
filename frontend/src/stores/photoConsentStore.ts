import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Whether the user has accepted the photo consent/retention notice, gating garment uploads.
 *
 * **Placeholder policy, not Jaicel's real Q5 design** (`docs/sprint-plans/sprint-3/sprint-3-init-jaicel.md`
 * Tarea 1 — no spec, no ADR-008, no risk-register entry exist yet at time of writing). This
 * implements the minimum-viable fallback that doc itself prescribes for exactly this situation:
 * explicit consent shown once before the first upload, the photo retained only while the
 * garment stays active in the wardrobe. Replace this store (and `PhotoConsentGate`'s copy) the
 * moment the real Q5 spec lands — do not treat this as a ratified policy decision.
 *
 * Persisted to `localStorage` (survives a browser restart) rather than `sessionStorage` — asking
 * again every tab/session for a wardrobe app would be poor UX, and there is no per-account
 * backend record to defer to yet. Revisit once Q5 adds a server-side consent record.
 */
export interface PhotoConsentState {
  consentGiven: boolean;
  /** Records that the user accepted the current consent copy. */
  grant: () => void;
}

export const usePhotoConsentStore = create<PhotoConsentState>()(
  persist(
    set => ({
      consentGiven: false,
      grant: () => set({ consentGiven: true }),
    }),
    {
      name: 'photo-consent-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
