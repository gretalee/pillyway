import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserMenu } from "./UserMenu";

export async function Header() {
  const { isAuthenticated } = getKindeServerSession();
  const authenticated = await isAuthenticated();

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

        <nav aria-label="Account navigation">
          {authenticated ? (
            <UserMenu />
          ) : (
            <a
              href="/api/auth/login"
              aria-label="Log in"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Log in
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
