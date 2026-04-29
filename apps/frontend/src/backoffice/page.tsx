import type { Metadata } from "next";
import { BackofficeUserDebug } from "./BackofficeUserDebug";

export const metadata: Metadata = {
  title: "Backoffice | Pillyway",
  description: "Administrative backoffice for Pillyway.",
  robots: { index: false, follow: false },
};

export default function BackofficePage() {
  return (
    <main className="flex flex-1 flex-col px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Backoffice</h1>
      <p className="mt-2 text-muted-foreground">Administrative area.</p>
      <BackofficeUserDebug />
    </main>
  );
}
