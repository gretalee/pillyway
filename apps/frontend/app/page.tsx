import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function Home() {
  const t = await getTranslations("home");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-8 py-16">
      <h1 className="text-3xl font-bold tracking-tight">{t("heading")}</h1>
      <p className="mt-2 text-muted-foreground">{t("tagline")}</p>
      <Link href="/caminos" className="mt-4 text-blue-500 underline">
        {t("explore_link")}
      </Link>
    </main>
  );
}
