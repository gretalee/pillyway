import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

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
}
