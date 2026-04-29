import type { Metadata } from "next";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { Providers } from "@/providers/providers";
import { Header } from "@/app/components/layout/Header";
import type { AuthUser } from "@/store/user-store";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pillyway",
  description: "Plan your pilgrimage journey.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isAuthenticated, getUser, getRoles } = getKindeServerSession();
  const authenticated = await isAuthenticated();

  let authUser: AuthUser | null = null;
  if (authenticated) {
    const [kindeUser, roles] = await Promise.all([getUser(), getRoles()]);
    if (kindeUser) {
      authUser = {
        id: kindeUser.id,
        email: kindeUser.email ?? null,
        firstName: kindeUser.given_name ?? null,
        lastName: kindeUser.family_name ?? null,
        picture: kindeUser.picture ?? null,
        roles: roles ?? [],
      };
    }
  }

  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <Header user={authUser} />
        <Providers user={authUser}>{children}</Providers>
      </body>
    </html>
  );
}
