import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { ROLES_KEY } from './decorators/roles.decorator';
import { KindeJwtPayload } from './kinde-jwt.strategy';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles() decorator — route is accessible to any authenticated user
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: KindeJwtPayload }>();

    const user = request.user;
    const userRoles = user?.roles ?? [];

    const hasRole = requiredRoles.some((required) =>
      userRoles.some((role) => role.key === required),
    );

    if (!hasRole) {
      throw new ForbiddenException(
        'You do not have the required role to access this resource.',
      );
    }

    return true;
  }
}
