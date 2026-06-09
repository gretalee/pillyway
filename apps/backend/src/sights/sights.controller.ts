import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KindeJwtPayload } from '../auth/kinde-jwt.strategy';
import { SightsService } from './sights.service';
import { SightDetailDto } from './dto/sight-detail.dto';
import { UpdateSightDto } from './dto/update-sight.dto';

@ApiTags('Sights')
@Controller('sights')
export class SightsController {
  constructor(private readonly sightsService: SightsService) {}

  // ── GET /sights?caminoPointId=:id ────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'List all sights for a waypoint (public)',
  })
  @ApiQuery({ name: 'caminoPointId', required: true, type: String })
  @ApiOkResponse({
    description: 'List of sights for the waypoint.',
    type: [SightDetailDto],
  })
  @ApiBadRequestResponse({
    description: 'caminoPointId query param is missing or invalid.',
  })
  async findByCaminoPointId(
    @Query('caminoPointId', new ParseUUIDPipe({ optional: true }))
    caminoPointId: string | undefined,
  ): Promise<SightDetailDto[]> {
    if (!caminoPointId) {
      throw new BadRequestException(
        'caminoPointId query parameter is required.',
      );
    }
    return this.sightsService.findByCaminoPointId(caminoPointId);
  }

  // ── GET /sights/:id ──────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get a single sight by ID (public)' })
  @ApiOkResponse({
    description: 'Sight detail.',
    type: SightDetailDto,
  })
  @ApiNotFoundResponse({ description: 'Sight not found.' })
  async findById(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<SightDetailDto> {
    return this.sightsService.findById(id);
  }

  // ── PATCH /sights/:id ────────────────────────────────────────────────────────

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a sight (pilgrim role required)' })
  @ApiOkResponse({
    description: 'Sight updated successfully.',
    type: SightDetailDto,
  })
  @ApiBadRequestResponse({ description: 'Validation error or empty body.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({ description: 'Requires pilgrim role.' })
  @ApiNotFoundResponse({ description: 'Sight not found.' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSightDto,
    @Req() req: Request & { user: KindeJwtPayload },
  ): Promise<SightDetailDto> {
    const roles = req.user.roles ?? [];
    return this.sightsService.update(id, req.user.sub, dto, roles);
  }

  // ── DELETE /sights/:id ───────────────────────────────────────────────────────

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Delete a sight. Owner role: always. Creator: within 1 hour of creation.',
  })
  @ApiNoContentResponse({ description: 'Sight deleted successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({
    description:
      'User is not an owner and is either not the creator or the 1-hour window has expired.',
  })
  @ApiNotFoundResponse({ description: 'Sight not found.' })
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request & { user: KindeJwtPayload },
  ): Promise<void> {
    await this.sightsService.delete(id, req.user.sub, req.user.roles ?? []);
  }
}
