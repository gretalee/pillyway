import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { resolveLocale } from "./detectLocale";

export type { Locale } from "./detectLocale";

export default getRequestConfig(async () => {
  const headerStore = await headers();
  const cookieStore = await cookies();

  // Locale was resolved in middleware and forwarded as x-pillyway-locale.
  // We re-read the cookie here as a defensive fallback for Server Actions
  // or direct calls that bypass middleware.
  const fromHeader = headerStore.get("x-pillyway-locale") ?? undefined;
  const fromCookie = cookieStore.get("pillyway-locale")?.value ?? undefined;

  const locale = resolveLocale(fromHeader ?? fromCookie);

  const messages =
    locale === "en"
      ? (await import("./messages/en.json")).default
      : (await import("./messages/de.json")).default;

  return { locale, messages, timeZone: "Europe/Berlin" };
});
