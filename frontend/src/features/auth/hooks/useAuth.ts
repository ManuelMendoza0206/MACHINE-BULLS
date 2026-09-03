'use client';

import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '@/features/auth/components/AuthProvider';

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
