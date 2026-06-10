import { describe, expect, it } from 'vitest';
import { slugify } from './slug.utils';

describe('slugify', () => {
  // Basic ASCII
  it('lowercases and hyphenates plain ASCII', () => {
    expect(slugify('Camino Frances')).toBe('camino-frances');
  });

  it('collapses multiple spaces', () => {
    expect(slugify('Via  de  la  Plata')).toBe('via-de-la-plata');
  });

  it('strips leading and trailing hyphens', () => {
    expect(slugify(' -Test- ')).toBe('test');
  });

  // German
  it('expands ü → ue', () => {
    expect(slugify('Süddeutscher Jakobsweg')).toBe('sueddeutscher-jakobsweg');
  });

  it('expands ö → oe', () => {
    expect(slugify('Römerweg')).toBe('roemerweg');
  });

  it('expands ä → ae', () => {
    expect(slugify('Fränkischer Jakobsweg')).toBe('fraenkischer-jakobsweg');
  });

  it('expands ß → ss', () => {
    expect(slugify('Straße der Romanik')).toBe('strasse-der-romanik');
  });

  // Scandinavian
  it('expands å → aa', () => {
    expect(slugify('Ålesund')).toBe('aalesund');
  });

  it('maps ø → o', () => {
    expect(slugify('Røros')).toBe('roros');
  });

  it('expands æ → ae', () => {
    // æ → ae, ø → o  →  "aero"
    expect(slugify('Ærø')).toBe('aero');
  });

  // French / Romance accents
  it('maps é → e', () => {
    expect(slugify('Camino Francés')).toBe('camino-frances');
  });

  it('maps ç → c', () => {
    expect(slugify('Façade')).toBe('facade');
  });

  it('maps ñ → n', () => {
    expect(slugify('El Camino Español')).toBe('el-camino-espanol');
  });

  // Slavic
  it('maps č → c', () => {
    expect(slugify('Český Krumlov')).toBe('cesky-krumlov');
  });

  it('maps ž → z', () => {
    expect(slugify('Žilina')).toBe('zilina');
  });

  // Icelandic
  it('expands þ → th and ö → oe', () => {
    // Þ → th, ó → o, ö → oe  →  "thorsmoerk"
    expect(slugify('Þórsmörk')).toBe('thorsmoerk');
  });

  // Edge cases
  it('returns empty string for an all-special input', () => {
    expect(slugify('!!!###')).toBe('');
  });

  it('collapses consecutive hyphens introduced by stripping', () => {
    expect(slugify('a--b')).toBe('a-b');
  });
});
