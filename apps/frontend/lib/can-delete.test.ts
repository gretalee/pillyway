import { describe, it, expect } from 'vitest';
import { canDelete } from './can-delete';

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

describe('canDelete', () => {
  const userId = 'user-123';
  const createdBy = 'user-123';
  const withinWindow = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 min ago
  const pastWindow = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
  const otherUser = 'user-456';

  it('returns true for owner regardless of creator and age', () => {
    expect(
      canDelete({
        userId: otherUser,
        roles: ['owner'],
        createdBy,
        createdAt: pastWindow,
        windowMs: WINDOW_MS,
      }),
    ).toBe(true);
  });

  it('returns true for owner even when they are not the creator', () => {
    expect(
      canDelete({
        userId: 'admin-999',
        roles: ['pilgrim', 'owner'],
        createdBy,
        createdAt: pastWindow,
        windowMs: WINDOW_MS,
      }),
    ).toBe(true);
  });

  it('returns true for creator within the time window', () => {
    expect(
      canDelete({
        userId,
        roles: ['pilgrim'],
        createdBy,
        createdAt: withinWindow,
        windowMs: WINDOW_MS,
      }),
    ).toBe(true);
  });

  it('returns false for creator after the time window has elapsed', () => {
    expect(
      canDelete({
        userId,
        roles: ['pilgrim'],
        createdBy,
        createdAt: pastWindow,
        windowMs: WINDOW_MS,
      }),
    ).toBe(false);
  });

  it('returns false for a non-creator without the owner role', () => {
    expect(
      canDelete({
        userId: otherUser,
        roles: ['pilgrim'],
        createdBy,
        createdAt: withinWindow,
        windowMs: WINDOW_MS,
      }),
    ).toBe(false);
  });

  it('returns false when user has no roles and is not the creator', () => {
    expect(
      canDelete({
        userId: otherUser,
        roles: [],
        createdBy,
        createdAt: withinWindow,
        windowMs: WINDOW_MS,
      }),
    ).toBe(false);
  });

  it('accepts a Date object for createdAt', () => {
    const recentDate = new Date(Date.now() - 10 * 60 * 1000); // 10 min ago
    expect(
      canDelete({
        userId,
        roles: ['pilgrim'],
        createdBy,
        createdAt: recentDate,
        windowMs: WINDOW_MS,
      }),
    ).toBe(true);
  });

  it('returns false exactly at the window boundary (strictly greater than windowMs)', () => {
    // Age is exactly windowMs + 1ms — just past the boundary
    const justPast = new Date(Date.now() - WINDOW_MS - 1).toISOString();
    expect(
      canDelete({
        userId,
        roles: ['pilgrim'],
        createdBy,
        createdAt: justPast,
        windowMs: WINDOW_MS,
      }),
    ).toBe(false);
  });
});
