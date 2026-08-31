import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Prepends "https://" to a URL string that has no protocol, so it's always
 * safe to use as an absolute link (e.g. an <a href>). Without this, a stored
 * value like "www.example.com" gets resolved by the browser as a path
 * relative to the current page instead of navigating externally.
 *
 * The backend normalizes `website` the same way on write (see
 * apps/backend/src/common/url.utils.ts), so this is primarily a safety net
 * for values written before that normalization existed.
 */
export function ensureHttpProtocol(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/**
 * Derives a thumbnail image URL from a stored (full-size/"gallery") image
 * URL. Every image upload (camino pictures, accommodation/sight images)
 * stores exactly one URL — this one — and the backend writes a smaller
 * `-thumb.webp` sibling object alongside it at upload time; the thumbnail
 * URL itself is never stored anywhere, only ever derived on demand. This is
 * an exact port of the backend's naming convention
 * (apps/backend/src/uploads/image-url.util.ts) — keep both in sync if this
 * ever changes.
 *
 * Images uploaded before this convention existed have no `-thumb.webp`
 * sibling in storage, so a derived thumbnail URL can 404 — callers that
 * display it must fall back to the original full-size URL on load error
 * (see the useThumbnailSrc hook).
 */
export function deriveThumbnailUrl(url: string): string {
  return url.replace(/\.webp$/, '-thumb.webp');
}
