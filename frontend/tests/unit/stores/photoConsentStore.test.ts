import { describe, it, expect, beforeEach } from 'vitest';
import { usePhotoConsentStore } from '@/stores/photoConsentStore';

const STORAGE_KEY = 'photo-consent-store';

function persisted(): Record<string, unknown> {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw).state as Record<string, unknown>) : {};
}

describe('photoConsentStore', () => {
  beforeEach(() => {
    usePhotoConsentStore.setState({ consentGiven: false, consentByUser: {} });
    localStorage.clear();
  });

  it('starts without consent', () => {
    expect(usePhotoConsentStore.getState().consentGiven).toBe(false);
    expect(usePhotoConsentStore.getState().hasConsent('user-a')).toBe(false);
  });

  it('grant() records consent', () => {
    usePhotoConsentStore.getState().grant();
    expect(usePhotoConsentStore.getState().consentGiven).toBe(true);
  });

  it('persists consent to localStorage (survives a browser restart, unlike sessionStorage)', () => {
    usePhotoConsentStore.getState().grant();
    expect(persisted()).toMatchObject({ consentGiven: true });
  });

  it('isolates consent per user and syncs from account metadata', () => {
    usePhotoConsentStore.getState().grantForUser('user-a');
    expect(usePhotoConsentStore.getState().hasConsent('user-a')).toBe(true);
    expect(usePhotoConsentStore.getState().hasConsent('user-b')).toBe(false);

    usePhotoConsentStore.getState().syncUserConsent('user-b', true);
    expect(usePhotoConsentStore.getState().hasConsent('user-b')).toBe(true);
    expect(persisted()).toMatchObject({
      consentByUser: { 'user-a': true, 'user-b': true },
    });
  });
});
