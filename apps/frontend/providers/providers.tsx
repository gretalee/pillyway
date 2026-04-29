"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { UserStoreInitializer } from "./UserStoreInitializer";
import type { AuthUser } from "@/store/user-store";

interface ProvidersProps {
  children: React.ReactNode;
  user: AuthUser | null;
}

export function Providers({ children, user }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <UserStoreInitializer user={user} />
      {children}
    </QueryClientProvider>
  );
}
