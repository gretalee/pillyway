import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserMenu } from "./UserMenu";

export async function Header() {
  const { isAuthenticated, getRoles, getUser } = getKindeServerSession();
  const authenticated = await isAuthenticated();
  const roles = authenticated ? (await getRoles()) ?? [] : [];
  const user = authenticated ? await getUser() : null;
  const isOwner = roles.some((role) => role.key === "owner");

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
          {authenticated && (
            <span className="text-xs text-muted-foreground font-mono">
              roles:{" "}
              {roles.length > 0
                ? roles.map((r) => r.key).join(", ")
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
            {authenticated ? (
              <UserMenu firstName={user?.given_name ?? null} />
            ) : (
              <a
                href="/api/auth/login"
                aria-label="Log in"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
              >
                Log in
              </a>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
