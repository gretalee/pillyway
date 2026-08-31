import { useState } from 'react';
import { deriveThumbnailUrl } from './utils';

interface ThumbnailSrc {
  src: string;
  onError: () => void;
}

/**
 * Returns the derived thumbnail URL for `fullUrl` to use as an <Image src>,
 * falling back to `fullUrl` itself once the thumbnail fails to load (a 404
 * — e.g. an image uploaded before the thumbnail convention existed has no
 * `-thumb.webp` sibling in storage). Spread the result onto an <Image>:
 *
 *   const { src, onError } = useThumbnailSrc(picture.url);
 *   <Image src={src} onError={onError} ... />
 *
 * Only ever use this for the `src` prop — `key`s, Set membership, and any
 * mutation payload should keep using the original full URL (`fullUrl`),
 * not the derived one.
 */
export function useThumbnailSrc(fullUrl: string): ThumbnailSrc {
  // Tracks which URL failed, not a plain boolean — if a component instance
  // is reused for a different image (e.g. the primary picture is replaced
  // while CaminoMainImage stays mounted), `failed` must not carry over from
  // the old URL. Comparing to fullUrl derives the reset for free on the
  // next render, no effect needed.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = failedUrl === fullUrl;

  return {
    src: failed ? fullUrl : deriveThumbnailUrl(fullUrl),
    onError: () => setFailedUrl(fullUrl),
  };
}
