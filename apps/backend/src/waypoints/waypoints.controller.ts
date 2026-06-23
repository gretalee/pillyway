import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
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
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AccommodationResponseDto } from './dto/accommodation-response.dto';
import { CreateAccommodationDto } from './dto/create-accommodation.dto';
import { CreateSightDto } from './dto/create-sight.dto';
import { SightResponseDto } from './dto/sight-response.dto';
import { UpdateWaypointDto } from './dto/update-waypoint.dto';
import { WaypointDetailDto } from './dto/waypoint-detail.dto';
import { WaypointsService } from './waypoints.service';

@ApiTags('Waypoints')
@Controller('waypoints')
export class WaypointsController {
  constructor(private readonly waypointsService: WaypointsService) {}

  @Get(':slug')
  @ApiOperation({
    summary: 'Get a waypoint (CaminoPoint) by slug (public)',
  })
  @ApiOkResponse({ description: 'Waypoint detail.' })
  @ApiNotFoundResponse({ description: 'Waypoint not found.' })
  async findBySlug(@Param('slug') slug: string): Promise<WaypointDetailDto> {
    return this.waypointsService.findBySlug(slug);
  }

  @Patch(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pilgrim')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a waypoint (name, description, coordinates) — pilgrim role required' })
  @ApiOkResponse({ description: 'Updated waypoint.' })
  @ApiBadRequestResponse({ description: 'Empty body, name is blank, or partial/inconsistent coordinates.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({ description: 'Requires pilgrim role.' })
  @ApiNotFoundResponse({ description: 'Waypoint not found.' })
  async update(
    @Param('slug') slug: string,
    @Body() dto: UpdateWaypointDto,
    @Req() req: Request & { user: KindeJwtPayload },
  ): Promise<WaypointDetailDto> {
    return this.waypointsService.update(slug, dto, req.user.sub, req.user.roles ?? []);
  }

  @Post(':slug/accommodations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pilgrim')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add an accommodation to a waypoint (pilgrim role required)',
  })
  @ApiCreatedResponse({ description: 'Accommodation created successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({ description: 'Requires pilgrim role.' })
  @ApiNotFoundResponse({ description: 'Waypoint not found.' })
  async createAccommodation(
    @Param('slug') slug: string,
    @Body() dto: CreateAccommodationDto,
    @Req() req: Request & { user: KindeJwtPayload },
  ): Promise<AccommodationResponseDto> {
    const userId = req.user.sub;
    return this.waypointsService.createAccommodation(slug, dto, userId);
  }

  @Post(':slug/sights')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pilgrim')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add a sight to a waypoint (pilgrim role required)',
  })
  @ApiCreatedResponse({ description: 'Sight created successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({ description: 'Requires pilgrim role.' })
  @ApiNotFoundResponse({ description: 'Waypoint not found.' })
  async createSight(
    @Param('slug') slug: string,
    @Body() dto: CreateSightDto,
    @Req() req: Request & { user: KindeJwtPayload },
  ): Promise<SightResponseDto> {
    const userId = req.user.sub;
    return this.waypointsService.createSight(slug, dto, userId);
  }
}
