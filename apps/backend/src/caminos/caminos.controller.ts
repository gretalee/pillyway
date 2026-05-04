import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
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
import { CaminosService, CaminoDetail, CaminoSummary } from './caminos.service';
import { CreateCaminoDto } from './dto/create-camino.dto';

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
}
