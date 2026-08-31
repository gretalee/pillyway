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
  const [failed, setFailed] = useState(false);

  return {
    src: failed ? fullUrl : deriveThumbnailUrl(fullUrl),
    onError: () => setFailed(true),
  };
}
