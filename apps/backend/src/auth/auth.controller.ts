import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { KindeJwtPayload } from './kinde-jwt.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('session')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Initialize or confirm a user session after Kinde login' })
  @ApiResponse({ status: 200, description: 'Session initialized' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sessionInit(@CurrentUser() user: KindeJwtPayload): Promise<{ kindeUserId: string; isNewUser: boolean }> {
    return this.authService.sessionInit(user);
  }
}
