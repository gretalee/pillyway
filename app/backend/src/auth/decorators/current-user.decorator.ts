import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

import { KindeJwtPayload } from '../kinde-jwt.strategy';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): KindeJwtPayload => {
    const request = ctx.switchToHttp().getRequest<Request & { user: KindeJwtPayload }>();
    return request.user;
  },
);
