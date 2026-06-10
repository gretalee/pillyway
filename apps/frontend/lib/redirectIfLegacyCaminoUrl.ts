import { permanentRedirect } from 'next/navigation';
import { fetchCamino } from '@/app/api/caminos/caminos';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * If `slugOrId` is a UUID (legacy link), fetch the camino to resolve its
 * canonical slug and redirect permanently. `restPath` is appended after the
 * slug, e.g. "stages/2" → /caminos/<slug>/stages/2.
 *
 * Call this before any other logic in a Server Component page.
 * NEXT_REDIRECT (thrown by redirect()) must not be caught — do not wrap this
 * call in a try/catch.
 */
export async function redirectIfLegacyCaminoUrl(
  slugOrId: string,
  restPath?: string,
): Promise<void> {
  if (!UUID_RE.test(slugOrId)) return;

  let canonicalSlug: string;
  try {
    const camino = await fetchCamino(slugOrId);

    // Only redirect when the request used the legacy UUID (avoid redirect loops
    // if a slug ever happens to match the UUID pattern).
    if (camino.id !== slugOrId) return;

    canonicalSlug = camino.slug;
  } catch {
    return;
  }

  const destination = restPath
    ? `/caminos/${canonicalSlug}/${restPath}`
    : `/caminos/${canonicalSlug}`;

  permanentRedirect(destination);
}
