/**
 * Prepends "https://" to a URL string that has no protocol, so it's always
 * safe to use as an absolute link (e.g. an <a href>) instead of being
 * misinterpreted as a path relative to the current site.
 *
 * class-validator's @IsUrl() accepts protocol-less strings like
 * "www.example.com" by design (its require_protocol option defaults to
 * false) — this normalizes such values before they're persisted, so every
 * stored URL is safe to render as-is anywhere.
 */
export function ensureHttpProtocol(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
