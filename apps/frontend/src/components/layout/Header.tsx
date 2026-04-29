import Link from "next/link";
import { buttonVariants } from "../ui/button";
import { cn } from "@/lib/utils";
import { UserMenu } from "./UserMenu";
import type { AuthUser } from "@/store/user-store";

interface HeaderProps {
  user: AuthUser | null;
}

export function Header({ user }: HeaderProps) {
  const isOwner = user?.roles.some((r) => r.key === "owner") ?? false;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight text-foreground hover:opacity-80 transition-opacity"
          aria-label="Pillyway home"
        >
          Pillyway
        </Link>

        <div className="flex items-center gap-4">
          {user && (
            <span className="text-xs text-muted-foreground font-mono">
              roles:{" "}
              {user.roles.length > 0
                ? user.roles.map((r) => r.key).join(", ")
                : "none"}
            </span>
          )}

          {isOwner && (
            <Link
              href="/backoffice"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Backoffice
            </Link>
          )}

          <nav aria-label="Account navigation">
            {user ? (
              <UserMenu firstName={user.firstName} />
            ) : (
              <Link
                href="/api/auth/login"
                aria-label="Log in"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
              >
                Log in
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
