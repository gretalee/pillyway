'use client';

import Image, { type ImageProps } from 'next/image';
import { useThumbnailSrc } from '@/lib/use-thumbnail-src';

interface ThumbnailImageProps extends Omit<ImageProps, 'src' | 'onError'> {
  src: string;
}

/**
 * Drop-in replacement for next/image's <Image> for any small/grid-cell
 * display of a stored image: renders the derived thumbnail of `src` (a
 * full-size/"gallery" image URL), falling back to `src` itself once the
 * thumbnail fails to load — e.g. an image uploaded before the thumbnail
 * convention existed has no `-thumb.webp` sibling in storage and 404s.
 *
 * A dedicated component (not just calling useThumbnailSrc inline) because
 * every current use renders a *list* of images — each needs its own
 * independent fallback state, and hooks can't be called inside a .map()
 * callback. All other <Image> props are forwarded through unchanged.
 *
 * Do NOT use this for a large/full-view display (lightbox, hero banner) —
 * those should keep rendering the full-size URL directly via <Image>.
 */
export function ThumbnailImage({ src, alt, ...rest }: ThumbnailImageProps) {
  const { src: thumbnailSrc, onError } = useThumbnailSrc(src);
  return <Image src={thumbnailSrc} alt={alt} onError={onError} {...rest} />;
}
