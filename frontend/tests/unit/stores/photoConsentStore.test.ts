import { describe, it, expect, beforeEach } from 'vitest';
import { usePhotoConsentStore } from '@/stores/photoConsentStore';

const STORAGE_KEY = 'photo-consent-store';

function persisted(): Record<string, unknown> {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw).state as Record<string, unknown>) : {};
}

describe('photoConsentStore', () => {
  beforeEach(() => {
    usePhotoConsentStore.setState({ consentGiven: false });
    localStorage.clear();
  });

  it('starts without consent', () => {
    expect(usePhotoConsentStore.getState().consentGiven).toBe(false);
  });

  it('grant() records consent', () => {
    usePhotoConsentStore.getState().grant();
    expect(usePhotoConsentStore.getState().consentGiven).toBe(true);
  });

  it('persists consent to localStorage (survives a browser restart, unlike sessionStorage)', () => {
    usePhotoConsentStore.getState().grant();
    expect(persisted()).toMatchObject({ consentGiven: true });
  });
});
