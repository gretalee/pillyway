import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { KindeJwtPayload } from '../auth/kinde-jwt.strategy';
import {
  CaminosService,
  CaminoDetail,
  CaminoDetailFull,
  CaminoSummary,
} from './caminos.service';
import { CreateCaminoDto } from './dto/create-camino.dto';
import { UpdateCaminoDto } from './dto/update-camino.dto';

@ApiTags('Caminos')
@Controller('caminos')
export class CaminosController {
  constructor(private readonly caminosService: CaminosService) {}

  @Get()
  @ApiOperation({ summary: 'List all caminos (public)' })
  @ApiOkResponse({ description: 'Array of camino summaries.' })
  async findAll(): Promise<CaminoSummary[]> {
    return this.caminosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single camino by ID (public)' })
  @ApiOkResponse({ description: 'Camino detail.' })
  @ApiNotFoundResponse({ description: 'Camino not found.' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CaminoDetailFull> {
    return this.caminosService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pilgrim')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new camino (requires pilgrim role)' })
  @ApiCreatedResponse({ description: 'Camino created successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({
    description: 'JWT present but missing pilgrim role.',
  })
  @ApiConflictResponse({
    description: 'A camino with this name already exists.',
  })
  async create(
    @Body() dto: CreateCaminoDto,
    @Req() req: Request & { user: KindeJwtPayload },
  ): Promise<CaminoDetail> {
    return this.caminosService.create(dto, req.user.sub);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a camino (requires pilgrim role)' })
  @ApiOkResponse({ description: 'Camino updated successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({
    description: 'JWT present but missing pilgrim role.',
  })
  @ApiNotFoundResponse({ description: 'Camino not found.' })
  @ApiConflictResponse({
    description: 'A camino with this name already exists.',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCaminoDto,
    @Req() req: Request & { user: KindeJwtPayload },
  ): Promise<CaminoDetailFull> {
    return this.caminosService.update(id, dto, req.user.roles ?? []);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a camino (requires pilgrim role)' })
  @ApiNoContentResponse({ description: 'Camino deleted.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({
    description: 'JWT present but missing pilgrim role.',
  })
  @ApiNotFoundResponse({ description: 'Camino not found.' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: KindeJwtPayload },
  ): Promise<void> {
    return this.caminosService.delete(id, req.user.roles ?? []);
  }
}
