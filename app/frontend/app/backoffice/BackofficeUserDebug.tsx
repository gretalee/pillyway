"use client";

import { useUserStore } from "@/store/user-store";

export function BackofficeUserDebug() {
  const user = useUserStore((s) => s.user);

  if (!user) return null;

  return (
    <div className="mt-8 rounded-lg border border-border p-4 font-mono text-sm space-y-1">
      <p>
        <span className="text-muted-foreground">name: </span>
        {[user.firstName, user.lastName].filter(Boolean).join(" ") || "—"}
      </p>
      <p>
        <span className="text-muted-foreground">roles: </span>
        {user.roles.length > 0 ? user.roles.map((r) => r.key).join(", ") : "none"}
      </p>
    </div>
  );
}
