import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { KindeJwtPayload } from './kinde-jwt.strategy';
import { RolesGuard } from './roles.guard';

function buildContext(
  user: Partial<KindeJwtPayload> | undefined,
): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  describe('when no @Roles() decorator is present', () => {
    beforeEach(() => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    });

    it('allows any authenticated user through', () => {
      const ctx = buildContext({ sub: 'user-1', roles: [] });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('allows a user with no role metadata through', () => {
      const ctx = buildContext(undefined);
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('when @Roles() is set to an empty array', () => {
    beforeEach(() => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    });

    it('allows any user through', () => {
      const ctx = buildContext({ sub: 'user-1', roles: [] });
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('when @Roles(["owner"]) is required', () => {
    beforeEach(() => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['owner']);
    });

    it('allows a user with the owner role', () => {
      const ctx = buildContext({
        sub: 'user-1',
        roles: [{ id: 'r1', key: 'owner', name: 'Owner' }],
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('throws ForbiddenException for a user without the role', () => {
      const ctx = buildContext({
        sub: 'user-2',
        roles: [{ id: 'r2', key: 'reviewer', name: 'Reviewer' }],
      });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when user has no roles', () => {
      const ctx = buildContext({ sub: 'user-3', roles: [] });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when user is undefined', () => {
      const ctx = buildContext(undefined);
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  describe('when multiple roles are required', () => {
    beforeEach(() => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        'reviewer',
        'owner',
      ]);
    });

    it('allows access when the user has one of the required roles', () => {
      const ctx = buildContext({
        sub: 'user-1',
        roles: [{ id: 'r1', key: 'reviewer', name: 'Reviewer' }],
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('throws ForbiddenException when the user has none of the required roles', () => {
      const ctx = buildContext({
        sub: 'user-2',
        roles: [{ id: 'r2', key: 'editor', name: 'Editor' }],
      });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });
});
