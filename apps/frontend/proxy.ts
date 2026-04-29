import { type NextRequest, NextResponse } from "next/server";
import { resolveLocale } from "./i18n/detectLocale";

export function proxy(request: NextRequest): NextResponse {
  const cookieValue = request.cookies.get("pillyway-locale")?.value;
  const acceptLanguage = request.headers.get("accept-language") ?? undefined;

  // Cookie takes priority; fall back to the first tag in Accept-Language.
  const rawLocale = cookieValue ?? acceptLanguage ?? undefined;
  const locale = resolveLocale(rawLocale);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pillyway-locale", locale);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *   - /api/* routes (Kinde auth lives at /api/auth/[kindeAuth])
     *   - /_next/static, /_next/image (Next.js internals)
     *   - /favicon.ico, /robots.txt, /sitemap.xml (root static files)
     *   - Files with an extension (images, fonts, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\..*).*)",
  ],
};
