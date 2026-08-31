import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  CaminoPointsService,
  CaminoPointSearchResult,
} from './camino-points.service';

@ApiTags('CaminoPoints')
@Controller('camino-points')
export class CaminoPointsController {
  constructor(private readonly caminoPointsService: CaminoPointsService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Search camino points by name and/or country (public)',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Partial name to search (ILIKE %value%). Min 1 char.',
  })
  @ApiQuery({
    name: 'country',
    required: false,
    description: 'Exact country match.',
  })
  @ApiOkResponse({ description: 'Array of up to 5 matching camino points.' })
  async search(
    @Query('name') name?: string,
    @Query('country') country?: string,
  ): Promise<CaminoPointSearchResult[]> {
    return this.caminoPointsService.search(name, country);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pilgrim')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Delete a camino point (requires pilgrim role). Only allowed if the point is not used by any camino.',
  })
  @ApiNoContentResponse({ description: 'Camino point deleted.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({
    description: 'JWT present but missing pilgrim role.',
  })
  @ApiNotFoundResponse({ description: 'Camino point not found.' })
  @ApiConflictResponse({
    description: 'Camino point is still used by one or more caminos.',
  })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.caminoPointsService.deleteIfUnused(id);
  }
}
