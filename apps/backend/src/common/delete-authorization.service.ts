import { ForbiddenException, Injectable } from '@nestjs/common';

import { KindeRole } from '../auth/kinde-jwt.strategy';

/**
 * Minimum shape that an entity must expose for time-windowed delete
 * authorization checks.
 */
export interface DeletableEntity {
  createdBy: string;
  createdAt: Date;
}

/**
 * Centralized service for time-windowed delete authorization.
 *
 * Rules:
 *   - `owner` role → always authorized, regardless of who created or when.
 *   - Creator (entity.createdBy === userId) + within windowMs → authorized.
 *   - All other callers → ForbiddenException (403).
 *
 * This service contains no I/O. Inject it wherever a delete needs enforcing.
 */
@Injectable()
export class DeleteAuthorizationService {
  /**
   * Evaluates whether the calling user is allowed to delete the given entity.
   *
   * @param userId   - Kinde subject (`sub`) of the authenticated user.
   * @param roles    - Roles array from the Kinde JWT payload.
   * @param entity   - The entity row fetched from the database.
   * @param windowMs - Milliseconds after creation during which the creator may
   *                   delete. E.g. 2 * 60 * 60 * 1000 for a 2-hour window.
   *
   * @throws ForbiddenException when the user is neither an owner nor the
   *         creator within the allowed window.
   */
  assertCanDelete(
    userId: string,
    roles: KindeRole[],
    entity: DeletableEntity,
    windowMs: number,
  ): void {
    if (this.isOwner(roles)) {
      return;
    }

    if (this.isCreatorWithinWindow(userId, entity, windowMs)) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to delete this resource.',
    );
  }

  /**
   * Pure predicate — returns `true` when the user may delete; no exception thrown.
   * Useful in guards or conditional logic that needs to branch without catching.
   */
  canDelete(
    userId: string,
    roles: KindeRole[],
    entity: DeletableEntity,
    windowMs: number,
  ): boolean {
    return (
      this.isOwner(roles) ||
      this.isCreatorWithinWindow(userId, entity, windowMs)
    );
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  private isOwner(roles: KindeRole[]): boolean {
    return roles.some((r) => r.key === 'owner');
  }

  private isCreatorWithinWindow(
    userId: string,
    entity: DeletableEntity,
    windowMs: number,
  ): boolean {
    if (entity.createdBy !== userId) {
      return false;
    }
    const ageMs = Date.now() - entity.createdAt.getTime();
    return ageMs <= windowMs;
  }
}
