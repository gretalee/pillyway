import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { KindeRole } from '../auth/kinde-jwt.strategy';
import {
  DeleteAuthorizationService,
  DeletableEntity,
} from './delete-authorization.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CREATOR_ID = 'user-creator-123';
const OTHER_USER_ID = 'user-other-456';
const ONE_HOUR_MS = 60 * 60 * 1000;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function makeRole(key: string): KindeRole {
  return { id: `role-${key}`, key, name: key };
}

function makeEntity(createdBy: string, ageMs: number): DeletableEntity {
  return {
    createdBy,
    createdAt: new Date(Date.now() - ageMs),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DeleteAuthorizationService', () => {
  const service = new DeleteAuthorizationService();

  // ── Owner role ───────────────────────────────────────────────────────────────

  describe('owner role', () => {
    it('allows an owner to delete a recently created entity they own', () => {
      const roles = [makeRole('owner'), makeRole('pilgrim')];
      const entity = makeEntity(OTHER_USER_ID, 1_000); // 1 second old

      expect(() =>
        service.assertCanDelete(OTHER_USER_ID, roles, entity, ONE_HOUR_MS),
      ).not.toThrow();
    });

    it('allows an owner to delete a very old entity they did NOT create', () => {
      const roles = [makeRole('owner')];
      // Entity is 48 hours old and was created by someone else
      const entity = makeEntity(OTHER_USER_ID, 48 * ONE_HOUR_MS);

      expect(() =>
        service.assertCanDelete('any-user-id', roles, entity, ONE_HOUR_MS),
      ).not.toThrow();
    });

    it('canDelete returns true for owner regardless of window', () => {
      const roles = [makeRole('owner')];
      const entity = makeEntity(OTHER_USER_ID, 100 * ONE_HOUR_MS);

      expect(service.canDelete('anyone', roles, entity, ONE_HOUR_MS)).toBe(
        true,
      );
    });
  });

  // ── Creator within window ────────────────────────────────────────────────────

  describe('creator within time window', () => {
    it('allows creator to delete within 1-hour window (30 min old)', () => {
      const roles = [makeRole('pilgrim')];
      const entity = makeEntity(CREATOR_ID, 30 * 60 * 1000); // 30 minutes old

      expect(() =>
        service.assertCanDelete(CREATOR_ID, roles, entity, ONE_HOUR_MS),
      ).not.toThrow();
    });

    it('allows creator to delete within 2-hour window (1 hr 59 min old)', () => {
      const roles = [makeRole('pilgrim')];
      const entity = makeEntity(CREATOR_ID, (2 * 60 - 1) * 60 * 1000); // 119 min old

      expect(() =>
        service.assertCanDelete(CREATOR_ID, roles, entity, TWO_HOURS_MS),
      ).not.toThrow();
    });

    it('allows creator to delete just inside the window boundary (50 ms before expiry)', () => {
      const roles = [makeRole('pilgrim')];
      const entity: DeletableEntity = {
        createdBy: CREATOR_ID,
        // 50 ms slack ensures the entity is still within the window when the
        // service evaluates it, even accounting for test execution overhead.
        createdAt: new Date(Date.now() - ONE_HOUR_MS + 50),
      };

      expect(() =>
        service.assertCanDelete(CREATOR_ID, roles, entity, ONE_HOUR_MS),
      ).not.toThrow();
    });

    it('canDelete returns true for creator within window', () => {
      const roles = [makeRole('pilgrim')];
      const entity = makeEntity(CREATOR_ID, 10_000); // 10 seconds old

      expect(service.canDelete(CREATOR_ID, roles, entity, ONE_HOUR_MS)).toBe(
        true,
      );
    });
  });

  // ── Creator outside window ───────────────────────────────────────────────────

  describe('creator outside time window', () => {
    it('denies creator after 1-hour window expires (1 hr + 1 ms old)', () => {
      const roles = [makeRole('pilgrim')];
      const entity: DeletableEntity = {
        createdBy: CREATOR_ID,
        createdAt: new Date(Date.now() - ONE_HOUR_MS - 1),
      };

      expect(() =>
        service.assertCanDelete(CREATOR_ID, roles, entity, ONE_HOUR_MS),
      ).toThrow(ForbiddenException);
    });

    it('denies creator after 2-hour window expires for camino (3 hours old)', () => {
      const roles = [makeRole('pilgrim')];
      const entity = makeEntity(CREATOR_ID, 3 * ONE_HOUR_MS);

      expect(() =>
        service.assertCanDelete(CREATOR_ID, roles, entity, TWO_HOURS_MS),
      ).toThrow(ForbiddenException);
    });

    it('canDelete returns false for creator outside window', () => {
      const roles = [makeRole('pilgrim')];
      const entity = makeEntity(CREATOR_ID, 2 * ONE_HOUR_MS + 1);

      expect(service.canDelete(CREATOR_ID, roles, entity, ONE_HOUR_MS)).toBe(
        false,
      );
    });
  });

  // ── Non-creator, non-owner ───────────────────────────────────────────────────

  describe('non-creator, non-owner', () => {
    it('denies a pilgrim who is not the creator (within window)', () => {
      const roles = [makeRole('pilgrim')];
      const entity = makeEntity(CREATOR_ID, 1_000); // fresh entity

      expect(() =>
        service.assertCanDelete(OTHER_USER_ID, roles, entity, ONE_HOUR_MS),
      ).toThrow(ForbiddenException);
    });

    it('denies a pilgrim who is not the creator (outside window)', () => {
      const roles = [makeRole('pilgrim')];
      const entity = makeEntity(CREATOR_ID, 5 * ONE_HOUR_MS);

      expect(() =>
        service.assertCanDelete(OTHER_USER_ID, roles, entity, ONE_HOUR_MS),
      ).toThrow(ForbiddenException);
    });

    it('denies a user with no roles at all', () => {
      const roles: KindeRole[] = [];
      const entity = makeEntity(CREATOR_ID, 1_000);

      expect(() =>
        service.assertCanDelete(OTHER_USER_ID, roles, entity, ONE_HOUR_MS),
      ).toThrow(ForbiddenException);
    });

    it('canDelete returns false for non-creator non-owner', () => {
      const roles = [makeRole('pilgrim')];
      const entity = makeEntity(CREATOR_ID, 1_000);

      expect(service.canDelete(OTHER_USER_ID, roles, entity, ONE_HOUR_MS)).toBe(
        false,
      );
    });

    it('ForbiddenException has the expected message', () => {
      const roles = [makeRole('pilgrim')];
      const entity = makeEntity(CREATOR_ID, 5 * ONE_HOUR_MS);

      expect(() =>
        service.assertCanDelete(OTHER_USER_ID, roles, entity, ONE_HOUR_MS),
      ).toThrow('You do not have permission to delete this resource.');
    });
  });
});
