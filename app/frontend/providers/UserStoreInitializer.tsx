"use client";

import { useRef } from "react";
import { useUserStore, type AuthUser } from "@/store/user-store";

export function UserStoreInitializer({ user }: { user: AuthUser | null }) {
  const initialized = useRef(false);
  if (!initialized.current) {
    useUserStore.setState({ user, isAuthenticated: user !== null });
    initialized.current = true;
  }
  return null;
}
