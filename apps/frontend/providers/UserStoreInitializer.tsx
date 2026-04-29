'use client';

import { useEffect } from 'react';
import { useUserStore, type AuthUser } from '@/store/user-store';

export function UserStoreInitializer({ user }: { user: AuthUser | null }) {
  useEffect(() => {
    useUserStore.setState({ user, isAuthenticated: user !== null });
  }, [user]);
  return null;
}
