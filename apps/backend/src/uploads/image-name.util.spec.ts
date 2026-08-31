import { describe, expect, it } from 'vitest';
import { buildImageFilename, slugifyImageName } from './image-name.util';

describe('slugifyImageName()', () => {
  it('matches the exact example: "Mein schönes Bild" -> "mein_schoenes_bild"', () => {
    expect(slugifyImageName('Mein schönes Bild')).toBe('mein_schoenes_bild');
  });

  it('transliterates all German umlauts and ß, not just ö', () => {
    expect(slugifyImageName('Äpfel Über Straße')).toBe('aepfel_ueber_strasse');
  });

  it('strips other diacritics rather than transliterating them', () => {
    expect(slugifyImageName('Café à Zürich')).toBe('cafe_a_zuerich');
  });

  it('collapses runs of punctuation/whitespace into a single underscore', () => {
    expect(slugifyImageName('  hello   world!!  ')).toBe('hello_world');
  });

  it('trims leading and trailing underscores', () => {
    expect(slugifyImageName('---leading and trailing---')).toBe(
      'leading_and_trailing',
    );
  });

  it('returns an empty string when nothing usable survives (emoji/symbols only)', () => {
    expect(slugifyImageName('🎉🎊✨')).toBe('');
  });

  it('truncates pathologically long names', () => {
    const long = 'a'.repeat(200);
    expect(slugifyImageName(long).length).toBeLessThanOrEqual(80);
  });
});

describe('buildImageFilename()', () => {
  it('builds "<slug>_<suffix>.webp" when a usable name is given', () => {
    const filename = buildImageFilename('Mein schönes Bild');
    expect(filename).toMatch(/^mein_schoenes_bild_[0-9a-f]{8}\.webp$/);
  });

  it('gives two different uploads of the same name different filenames', () => {
    const a = buildImageFilename('Assisi');
    const b = buildImageFilename('Assisi');
    expect(a).not.toBe(b);
  });

  it('falls back to a bare UUID filename when no name is given', () => {
    const filename = buildImageFilename();
    expect(filename).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/,
    );
  });

  it('falls back to a bare UUID filename when the name sanitizes to nothing', () => {
    const filename = buildImageFilename('🎉🎊✨');
    expect(filename).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/,
    );
  });

  it('falls back to a bare UUID filename when name is null', () => {
    const filename = buildImageFilename(null);
    expect(filename).toMatch(/\.webp$/);
    expect(filename).not.toContain('null');
  });
});
