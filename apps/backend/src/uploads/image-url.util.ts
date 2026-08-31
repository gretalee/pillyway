/**
 * Derives a thumbnail S3 key/URL from a gallery (full-size) one, per the
 * dual-derivative naming convention: the backend writes `{key}.webp`
 * (gallery) and `{key}-thumb.webp` (thumbnail) as sibling S3 objects at
 * upload time. Only the gallery URL is ever stored in the database — the
 * thumbnail is always derived, never persisted — so this one function is
 * the single source of truth for the convention, on both the write side
 * (upload: computing the thumbnail key to PUT) and the read side (delete:
 * computing the thumbnail key to also remove; later, display: computing the
 * thumbnail URL to request). Works identically on a bare S3 key or a full
 * public URL, since both just end in `<name>.webp`.
 *
 * Decision + reasoning:
 * .claude/agent-memory/software-architect-lead/pattern_image_derivative_urls.md
 *
 * Not yet wired into any frontend display code — that's a deferred
 * follow-up. When it is, port this exact transform identically; don't
 * reimplement it. Legacy images (uploaded before this pipeline existed)
 * have no `-thumb.webp` sibling — any *display*-time caller must handle a
 * 404 gracefully, since this function has no way to know that in advance.
 */
export function deriveThumbnailUrl(galleryUrlOrKey: string): string {
  return galleryUrlOrKey.replace(/\.webp$/, '-thumb.webp');
}
