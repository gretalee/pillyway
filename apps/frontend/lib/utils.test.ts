import { describe, it, expect } from 'vitest';
import { deriveThumbnailUrl, ensureHttpProtocol } from './utils';

describe('ensureHttpProtocol', () => {
  it('prepends https:// to a bare domain', () => {
    expect(ensureHttpProtocol('www.dieUnterkunft.de')).toBe('https://www.dieUnterkunft.de');
  });

  it('prepends https:// to a domain without www', () => {
    expect(ensureHttpProtocol('example.com')).toBe('https://example.com');
  });

  it('leaves an https:// URL unchanged', () => {
    expect(ensureHttpProtocol('https://example.com')).toBe('https://example.com');
  });

  it('leaves an http:// URL unchanged', () => {
    expect(ensureHttpProtocol('http://example.com')).toBe('http://example.com');
  });

  it('is case-insensitive when detecting an existing protocol', () => {
    expect(ensureHttpProtocol('HTTPS://example.com')).toBe('HTTPS://example.com');
  });
});

describe('deriveThumbnailUrl', () => {
  it('appends -thumb before the .webp extension', () => {
    expect(
      deriveThumbnailUrl('https://example.supabase.co/storage/v1/object/public/bucket/images/abc123.webp'),
    ).toBe('https://example.supabase.co/storage/v1/object/public/bucket/images/abc123-thumb.webp');
  });

  it('matches the backend convention on a camino-pictures key shape', () => {
    expect(
      deriveThumbnailUrl('https://example.supabase.co/.../camino-pictures/camino-1/pic-1.webp'),
    ).toBe('https://example.supabase.co/.../camino-pictures/camino-1/pic-1-thumb.webp');
  });

  it('leaves a non-.webp URL unchanged (no match, no-op)', () => {
    expect(deriveThumbnailUrl('https://example.com/photo.jpg')).toBe(
      'https://example.com/photo.jpg',
    );
  });
});
