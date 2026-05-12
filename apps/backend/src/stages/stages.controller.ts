import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KindeJwtPayload } from '../auth/kinde-jwt.strategy';
import { StageDetail } from './dto/stage-detail.dto';
import { StageListItem } from './dto/stage-list-item.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { StagesService } from './stages.service';

@ApiTags('Stages')
@Controller('caminos/:caminoId/stages')
export class StagesController {
  constructor(private readonly stagesService: StagesService) {}

  @Get()
  @ApiOperation({
    summary: 'List all stages for a Camino in traversal order (public)',
  })
  @ApiOkResponse({ description: 'Ordered array of stage list items.' })
  @ApiNotFoundResponse({ description: 'Camino not found.' })
  @ApiBadRequestResponse({ description: 'caminoId is not a valid UUID.' })
  async findByCamino(
    @Param('caminoId', ParseUUIDPipe) caminoId: string,
  ): Promise<StageListItem[]> {
    return this.stagesService.findByCamino(caminoId);
  }

  @Get(':stageNumber')
  @ApiOperation({
    summary: 'Get a single stage by its 1-based number within a Camino (public)',
  })
  @ApiOkResponse({ description: 'Stage detail with adjacent stage summaries.' })
  @ApiNotFoundResponse({
    description: 'Camino not found or stageNumber out of range.',
  })
  @ApiBadRequestResponse({
    description: 'caminoId is not a valid UUID or stageNumber is not an integer.',
  })
  async findOne(
    @Param('caminoId', ParseUUIDPipe) caminoId: string,
    @Param('stageNumber', ParseIntPipe) stageNumber: number,
  ): Promise<StageDetail> {
    return this.stagesService.findOne(caminoId, stageNumber);
  }

  @Patch(':stageNumber')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a stage distance and/or description (pilgrim role required)',
  })
  @ApiOkResponse({ description: 'Stage updated successfully.' })
  @ApiBadRequestResponse({
    description: 'Empty body, field constraint violation, or invalid path params.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({ description: 'Requires pilgrim role.' })
  @ApiNotFoundResponse({
    description: 'Camino not found or stageNumber out of range.',
  })
  async update(
    @Param('caminoId', ParseUUIDPipe) caminoId: string,
    @Param('stageNumber', ParseIntPipe) stageNumber: number,
    @Body() dto: UpdateStageDto,
    @Req() req: Request & { user: KindeJwtPayload },
  ): Promise<StageDetail> {
    const userRoles = (req.user.roles ?? []).map((r) => r.key);
    return this.stagesService.update(caminoId, stageNumber, dto, userRoles);
  }
}
