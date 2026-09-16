import { describe, it, expect, beforeEach } from 'vitest';
import { useOnboardingStore } from '@/stores/onboardingStore';

const STORAGE_KEY = 'onboarding-store';

function persisted(): Record<string, unknown> {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw).state as Record<string, unknown>) : {};
}

const file = (name: string): File => new File(['x'], name, { type: 'image/jpeg' });

describe('onboardingStore', () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset();
    sessionStorage.clear();
  });

  it('starts on step 1 with an empty selection', () => {
    const s = useOnboardingStore.getState();
    expect(s.step).toBe(1);
    expect(s.targetAesthetic).toBeNull();
    expect(s.pendingGarmentFiles).toEqual([]);
    expect(s.selectedCapsuleGarmentIds).toEqual([]);
  });

  it('moves between step 1 and step 2', () => {
    useOnboardingStore.getState().setStep(2);
    expect(useOnboardingStore.getState().step).toBe(2);
    useOnboardingStore.getState().setStep(1);
    expect(useOnboardingStore.getState().step).toBe(1);
  });

  it('sets and clears the target aesthetic', () => {
    useOnboardingStore.getState().setTargetAesthetic('minimalista');
    expect(useOnboardingStore.getState().targetAesthetic).toBe('minimalista');
    useOnboardingStore.getState().setTargetAesthetic(null);
    expect(useOnboardingStore.getState().targetAesthetic).toBeNull();
  });

  it('appends pending files across multiple calls', () => {
    useOnboardingStore.getState().addPendingFiles([file('a.jpg')]);
    useOnboardingStore.getState().addPendingFiles([file('b.jpg'), file('c.jpg')]);
    expect(useOnboardingStore.getState().pendingGarmentFiles.map(f => f.name)).toEqual([
      'a.jpg',
      'b.jpg',
      'c.jpg',
    ]);
  });

  it('toggles a capsule garment id on and off', () => {
    const { toggleCapsuleGarment } = useOnboardingStore.getState();
    toggleCapsuleGarment('g1');
    toggleCapsuleGarment('g2');
    expect(useOnboardingStore.getState().selectedCapsuleGarmentIds).toEqual(['g1', 'g2']);
    toggleCapsuleGarment('g1');
    expect(useOnboardingStore.getState().selectedCapsuleGarmentIds).toEqual(['g2']);
  });

  it('reset() returns every field to its initial value', () => {
    const s = useOnboardingStore.getState();
    s.setStep(2);
    s.setTargetAesthetic('streetwear');
    s.addPendingFiles([file('a.jpg')]);
    s.toggleCapsuleGarment('g1');

    useOnboardingStore.getState().reset();

    const after = useOnboardingStore.getState();
    expect(after.step).toBe(1);
    expect(after.targetAesthetic).toBeNull();
    expect(after.pendingGarmentFiles).toEqual([]);
    expect(after.selectedCapsuleGarmentIds).toEqual([]);
  });

  it('persists step, aesthetic and capsule ids to sessionStorage', () => {
    const s = useOnboardingStore.getState();
    s.setStep(2);
    s.setTargetAesthetic('old money');
    s.toggleCapsuleGarment('g1');

    expect(persisted()).toMatchObject({
      step: 2,
      targetAesthetic: 'old money',
      selectedCapsuleGarmentIds: ['g1'],
    });
  });

  it('never persists File objects (not serialisable)', () => {
    useOnboardingStore.getState().addPendingFiles([file('a.jpg')]);
    expect(persisted()).not.toHaveProperty('pendingGarmentFiles');
  });

  it('reset() also clears the persisted copy', () => {
    const s = useOnboardingStore.getState();
    s.setStep(2);
    s.setTargetAesthetic('streetwear');
    s.toggleCapsuleGarment('g1');

    useOnboardingStore.getState().reset();

    expect(persisted()).toMatchObject({
      step: 1,
      targetAesthetic: null,
      selectedCapsuleGarmentIds: [],
    });
  });
});
