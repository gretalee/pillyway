import { describe, expect, it } from 'vitest';
import { deriveThumbnailUrl } from './image-url.util';

describe('deriveThumbnailUrl()', () => {
  it('appends -thumb before the extension on a bare key', () => {
    expect(deriveThumbnailUrl('camino-pictures/abc/pic123.webp')).toBe(
      'camino-pictures/abc/pic123-thumb.webp',
    );
  });

  it('appends -thumb before the extension on a full public URL', () => {
    expect(
      deriveThumbnailUrl(
        'https://example.supabase.co/storage/v1/object/public/bucket/images/uuid-photo.webp',
      ),
    ).toBe(
      'https://example.supabase.co/storage/v1/object/public/bucket/images/uuid-photo-thumb.webp',
    );
  });

  it('is idempotent-safe against double-application only in the sense that calling it on an already-derived thumbnail key does not match .webp$ twice — verifies no infinite/repeated suffixing risk', () => {
    const once = deriveThumbnailUrl('images/photo.webp');
    expect(once).toBe('images/photo-thumb.webp');
    // Applying it again would (correctly, if ever misused) just produce
    // another distinct key rather than crash — documents actual behavior.
    const twice = deriveThumbnailUrl(once);
    expect(twice).toBe('images/photo-thumb-thumb.webp');
  });

  it('leaves a non-.webp string unchanged (no match, no-op)', () => {
    expect(deriveThumbnailUrl('images/photo.jpg')).toBe('images/photo.jpg');
  });
});
