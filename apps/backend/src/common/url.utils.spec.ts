import { describe, expect, it } from 'vitest';
import { ensureHttpProtocol } from './url.utils';

describe('ensureHttpProtocol', () => {
  it('prepends https:// to a bare domain', () => {
    expect(ensureHttpProtocol('www.dieUnterkunft.de')).toBe(
      'https://www.dieUnterkunft.de',
    );
  });

  it('prepends https:// to a domain without www', () => {
    expect(ensureHttpProtocol('example.com')).toBe('https://example.com');
  });

  it('leaves an https:// URL unchanged', () => {
    expect(ensureHttpProtocol('https://example.com')).toBe(
      'https://example.com',
    );
  });

  it('leaves an http:// URL unchanged', () => {
    expect(ensureHttpProtocol('http://example.com')).toBe('http://example.com');
  });

  it('is case-insensitive when detecting an existing protocol', () => {
    expect(ensureHttpProtocol('HTTPS://example.com')).toBe(
      'HTTPS://example.com',
    );
  });

  it('preserves a path and query string on a bare domain', () => {
    expect(ensureHttpProtocol('example.com/path?x=1')).toBe(
      'https://example.com/path?x=1',
    );
  });
});
