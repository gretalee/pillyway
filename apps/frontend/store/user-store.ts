import { create } from 'zustand';

export interface UserRole {
  id: string;
  key: string;
  name: string;
}

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  picture: string | null;
  roles: UserRole[];
}

interface UserState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  hasRole: (key: string) => boolean;
  setUser: (user: AuthUser | null) => void;
}

export const useUserStore = create<UserState>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  hasRole: (key) => get().user?.roles.some((r) => r.key === key) ?? false,
  setUser: (user) => set({ user, isAuthenticated: user !== null }),
}));
