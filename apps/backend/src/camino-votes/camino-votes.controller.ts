import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KindeJwtPayload } from '../auth/kinde-jwt.strategy';
import {
  CaminoVotesService,
  VoteResult,
  VoteSummary,
} from './camino-votes.service';
import { CastVoteDto } from './cast-vote.dto';

@ApiTags('Camino Votes')
@Controller('caminos/:caminoId/votes')
export class CaminoVotesController {
  constructor(private readonly caminoVotesService: CaminoVotesService) {}

  // Static sub-routes must be declared before any parameterised ones.

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the authenticated user's vote for a camino" })
  @ApiOkResponse({ description: 'Vote record for this user.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiNotFoundResponse({
    description:
      'No vote exists for this user + camino combination (camino may or may not exist).',
  })
  async getMyVote(
    @Param('caminoId', ParseUUIDPipe) caminoId: string,
    @Req() req: Request & { user: KindeJwtPayload },
  ): Promise<VoteResult> {
    return this.caminoVotesService.getMyVote(caminoId, req.user.sub);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get vote tally for a camino (public)' })
  @ApiOkResponse({ description: 'Vote summary with yes/no counts.' })
  @ApiNotFoundResponse({ description: 'Camino not found.' })
  async getVoteSummary(
    @Param('caminoId', ParseUUIDPipe) caminoId: string,
  ): Promise<VoteSummary> {
    return this.caminoVotesService.getVoteSummary(caminoId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cast or update a vote for a camino (requires auth)',
  })
  @ApiOkResponse({ description: 'Vote recorded or updated.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiNotFoundResponse({ description: 'Camino not found.' })
  async castVote(
    @Param('caminoId', ParseUUIDPipe) caminoId: string,
    @Body() dto: CastVoteDto,
    @Req() req: Request & { user: KindeJwtPayload },
  ): Promise<VoteResult> {
    return this.caminoVotesService.castVote(caminoId, req.user.sub, dto.vote);
  }
}
