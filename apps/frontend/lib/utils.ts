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
