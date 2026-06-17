import { describe, expect, it } from 'vitest';
import { canDeleteGpxFile } from './can-delete-gpx-file';

describe('canDeleteGpxFile', () => {
  const UPLOADER_ID = 'kinde-user-001';
  const OTHER_USER_ID = 'kinde-user-002';

  it('returns false for null userId', () => {
    expect(canDeleteGpxFile(null, ['pilgrim'], UPLOADER_ID)).toBe(false);
  });

  it('returns false for undefined userId', () => {
    expect(canDeleteGpxFile(undefined, ['pilgrim'], UPLOADER_ID)).toBe(false);
  });

  it('returns false when userId does not match uploadedBy and role is only pilgrim', () => {
    expect(canDeleteGpxFile(OTHER_USER_ID, ['pilgrim'], UPLOADER_ID)).toBe(false);
  });

  it('returns true when userId matches uploadedBy (no time-window check)', () => {
    expect(canDeleteGpxFile(UPLOADER_ID, ['pilgrim'], UPLOADER_ID)).toBe(true);
  });

  it('returns true when roles includes owner regardless of userId', () => {
    expect(canDeleteGpxFile(OTHER_USER_ID, ['pilgrim', 'owner'], UPLOADER_ID)).toBe(true);
  });

  it('returns true for owner even when userId does not match uploadedBy', () => {
    expect(canDeleteGpxFile('completely-different-user', ['owner'], UPLOADER_ID)).toBe(true);
  });

  it('returns false for empty string userId', () => {
    expect(canDeleteGpxFile('', ['pilgrim'], UPLOADER_ID)).toBe(false);
  });
});
