import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { COUNTRIES } from './countries.constants';

@ApiTags('Countries')
@Controller('countries')
export class CountriesController {
  @Get()
  @ApiOperation({
    summary: 'List allowed countries (public, static)',
  })
  @ApiOkResponse({
    description: 'Alphabetically-sorted array of country strings.',
  })
  list(): readonly string[] {
    return COUNTRIES;
  }
}
