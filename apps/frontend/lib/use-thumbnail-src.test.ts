import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { useThumbnailSrc } from './use-thumbnail-src';

describe('useThumbnailSrc', () => {
  it('returns the derived thumbnail URL by default', () => {
    const { result } = renderHook(() => useThumbnailSrc('https://cdn.example.com/foo.webp'));

    expect(result.current.src, 'must request the derived thumbnail before any error').toBe(
      'https://cdn.example.com/foo-thumb.webp',
    );
  });

  it('falls back to the original URL once the thumbnail fails to load', () => {
    const { result } = renderHook(() => useThumbnailSrc('https://cdn.example.com/foo.webp'));

    act(() => result.current.onError());

    expect(result.current.src, 'must fall back to the full-size URL after a load error').toBe(
      'https://cdn.example.com/foo.webp',
    );
  });

  it('retries the derived thumbnail once fullUrl changes, even after a prior failure', () => {
    const { result, rerender } = renderHook(({ url }) => useThumbnailSrc(url), {
      initialProps: { url: 'https://cdn.example.com/foo.webp' },
    });

    act(() => result.current.onError());
    expect(result.current.src, 'sanity check: fallback applied for the first URL').toBe(
      'https://cdn.example.com/foo.webp',
    );

    // Same component instance reused for a different image (e.g. the
    // primary picture is replaced while the hosting component stays
    // mounted) — the stale failure must not carry over to the new URL.
    rerender({ url: 'https://cdn.example.com/bar.webp' });

    expect(
      result.current.src,
      'must attempt the derived thumbnail again for the new URL instead of reusing the old failure',
    ).toBe('https://cdn.example.com/bar-thumb.webp');
  });
});
