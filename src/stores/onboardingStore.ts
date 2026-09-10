import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Client-only state for the two-step onboarding wizard (spec §2.1).
 *
 * Persisted to `sessionStorage` so a page reload mid-onboarding keeps the user's progress; it
 * is cleared by `reset()` when onboarding completes. `pendingGarmentFiles` is deliberately
 * **not** persisted — `File` objects are not serialisable, so only `step`, `targetAesthetic`
 * and `selectedCapsuleGarmentIds` survive a reload (spec §4, "Casos borde").
 */
export interface OnboardingState {
  step: 1 | 2;
  /** Optional aesthetic chosen in step 1; `null` when skipped. */
  targetAesthetic: string | null;
  /** Files chosen in step 2, not yet uploaded/confirmed. Not persisted. */
  pendingGarmentFiles: File[];
  /** Ids of capsule-catalog garments selected in step 2. */
  selectedCapsuleGarmentIds: string[];
  setStep: (step: 1 | 2) => void;
  setTargetAesthetic: (aesthetic: string | null) => void;
  /** Appends to the current selection — the dropzone can be used more than once. */
  addPendingFiles: (files: File[]) => void;
  /** Adds the id if absent, removes it if already selected. */
  toggleCapsuleGarment: (id: string) => void;
  /** Returns every field to its initial value and wipes the persisted copy. */
  reset: () => void;
}

const INITIAL_STATE: Pick<
  OnboardingState,
  'step' | 'targetAesthetic' | 'pendingGarmentFiles' | 'selectedCapsuleGarmentIds'
> = {
  step: 1,
  targetAesthetic: null,
  pendingGarmentFiles: [],
  selectedCapsuleGarmentIds: [],
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    set => ({
      ...INITIAL_STATE,

      setStep: step => set({ step }),

      setTargetAesthetic: targetAesthetic => set({ targetAesthetic }),

      addPendingFiles: files =>
        set(state => ({ pendingGarmentFiles: [...state.pendingGarmentFiles, ...files] })),

      toggleCapsuleGarment: id =>
        set(state => ({
          selectedCapsuleGarmentIds: state.selectedCapsuleGarmentIds.includes(id)
            ? state.selectedCapsuleGarmentIds.filter(existing => existing !== id)
            : [...state.selectedCapsuleGarmentIds, id],
        })),

      reset: () => set({ ...INITIAL_STATE }),
    }),
    {
      name: 'onboarding-store',
      storage: createJSONStorage(() => sessionStorage),
      partialize: state => ({
        step: state.step,
        targetAesthetic: state.targetAesthetic,
        selectedCapsuleGarmentIds: state.selectedCapsuleGarmentIds,
      }),
    }
  )
);
