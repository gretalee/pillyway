import { describe, it, expect } from 'vitest';
import { ensureHttpProtocol } from './utils';

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
