import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { PeriodQuery, SaveReadingsDto } from './utilities.dto';
import { UtilitiesService } from './utilities.service';

@Controller('utilities')
export class UtilitiesController {
  constructor(private utilitiesService: UtilitiesService) {}

  @Get('rates')
  rates() {
    return this.utilitiesService.rates();
  }

  @Get('readings')
  readings(@Query() query: PeriodQuery) {
    return this.utilitiesService.readings(query.period);
  }

  @Put('readings')
  saveReadings(@Body() dto: SaveReadingsDto) {
    return this.utilitiesService.saveReadings(dto);
  }
}
