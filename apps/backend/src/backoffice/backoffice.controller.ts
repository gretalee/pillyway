import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CaminoVotesService, VoteEntry } from '../camino-votes/camino-votes.service';
import { BackofficeCaminosService, CaminoWithTally } from './backoffice-caminos.service';

@ApiTags('Backoffice')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner')
@Controller('backoffice')
export class BackofficeController {
  constructor(
    private readonly backofficeCaminosService: BackofficeCaminosService,
    private readonly caminoVotesService: CaminoVotesService,
  ) {}

  @Get('caminos')
  @ApiOperation({ summary: 'List all caminos with vote tallies (owner only)' })
  @ApiOkResponse({ description: 'Array of caminos with yesCount and noCount.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({ description: 'JWT present but missing owner role.' })
  async getCaminosWithTallies(): Promise<CaminoWithTally[]> {
    return this.backofficeCaminosService.getCaminosWithTallies();
  }

  @Get('caminos/:caminoId/votes')
  @ApiOperation({ summary: 'List all votes for a camino (owner only)' })
  @ApiOkResponse({ description: 'Array of vote entries without userId.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({ description: 'JWT present but missing owner role.' })
  @ApiNotFoundResponse({ description: 'Camino not found.' })
  async listVotes(
    @Param('caminoId', ParseUUIDPipe) caminoId: string,
  ): Promise<VoteEntry[]> {
    return this.caminoVotesService.listVotesForOwner(caminoId);
  }
}
