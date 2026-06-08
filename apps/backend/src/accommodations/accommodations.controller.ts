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
import { AccommodationsService } from './accommodations.service';
import { AccommodationDetailDto } from './dto/accommodation-detail.dto';
import { UpdateAccommodationDto } from './dto/update-accommodation.dto';

@ApiTags('Accommodations')
@Controller('accommodations')
export class AccommodationsController {
  constructor(private readonly accommodationsService: AccommodationsService) {}

  // ── GET /accommodations?caminoPointId=:id ────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'List all accommodations for a waypoint (public)',
  })
  @ApiQuery({ name: 'caminoPointId', required: true, type: String })
  @ApiOkResponse({
    description: 'List of accommodations for the waypoint.',
    type: [AccommodationDetailDto],
  })
  @ApiBadRequestResponse({ description: 'caminoPointId query param is missing or invalid.' })
  async findByCaminoPointId(
    @Query('caminoPointId', new ParseUUIDPipe({ optional: true }))
    caminoPointId: string | undefined,
  ): Promise<AccommodationDetailDto[]> {
    if (!caminoPointId) {
      throw new BadRequestException('caminoPointId query parameter is required.');
    }
    return this.accommodationsService.findByCaminoPointId(caminoPointId);
  }

  // ── GET /accommodations/:id ──────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get a single accommodation by ID (public)' })
  @ApiOkResponse({
    description: 'Accommodation detail.',
    type: AccommodationDetailDto,
  })
  @ApiNotFoundResponse({ description: 'Accommodation not found.' })
  async findById(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<AccommodationDetailDto> {
    return this.accommodationsService.findById(id);
  }

  // ── PATCH /accommodations/:id ────────────────────────────────────────────────

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an accommodation (pilgrim role required)' })
  @ApiOkResponse({
    description: 'Accommodation updated successfully.',
    type: AccommodationDetailDto,
  })
  @ApiBadRequestResponse({ description: 'Validation error or empty body.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({ description: 'Requires pilgrim role.' })
  @ApiNotFoundResponse({ description: 'Accommodation not found.' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAccommodationDto,
    @Req() req: Request & { user: KindeJwtPayload },
  ): Promise<AccommodationDetailDto> {
    const roles = req.user.roles ?? [];
    return this.accommodationsService.update(id, req.user.sub, dto, roles);
  }

  // ── DELETE /accommodations/:id ───────────────────────────────────────────────

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Delete an accommodation. Owner role: always. Creator: within 1 hour of creation.',
  })
  @ApiNoContentResponse({ description: 'Accommodation deleted successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({
    description:
      'User is not an owner and is either not the creator or the 1-hour window has expired.',
  })
  @ApiNotFoundResponse({ description: 'Accommodation not found.' })
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request & { user: KindeJwtPayload },
  ): Promise<void> {
    await this.accommodationsService.delete(
      id,
      req.user.sub,
      req.user.roles ?? [],
    );
  }
}
