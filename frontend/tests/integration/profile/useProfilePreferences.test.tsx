import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { toast } from 'sonner';
import { useProfilePreferences } from '@/features/profile/hooks/useProfilePreferences';
import * as profilePreferences from '@/features/profile/lib/profilePreferences';

const mockUseAuth = vi.fn();
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn() },
}));

describe('useProfilePreferences', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('reads the saved preference for the authenticated user on mount', () => {
    profilePreferences.setDefaultAesthetic('u1', 'streetwear');
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, status: 'authenticated' });

    const { result } = renderHook(() => useProfilePreferences());

    expect(result.current.defaultAesthetic).toBe('streetwear');
  });

  it('setDefaultAesthetic persists, updates local state, and toasts a confirmation', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, status: 'authenticated' });
    const { result } = renderHook(() => useProfilePreferences());

    act(() => result.current.setDefaultAesthetic('old_money'));

    expect(result.current.defaultAesthetic).toBe('old_money');
    expect(profilePreferences.getDefaultAesthetic('u1')).toBe('old_money');
    expect(toast.success).toHaveBeenCalledWith('Preferencia guardada');
  });

  it('with no authenticated user: reads null and writes are a safe no-op (warns, never throws)', () => {
    mockUseAuth.mockReturnValue({ user: null, status: 'unauthenticated' });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useProfilePreferences());

    expect(result.current.defaultAesthetic).toBeNull();
    expect(() => act(() => result.current.setDefaultAesthetic('old_money'))).not.toThrow();
    expect(toast.success).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
