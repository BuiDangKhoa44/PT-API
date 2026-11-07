import { Controller, Get, Query } from '@nestjs/common';
import { IsOptional, Matches } from 'class-validator';
import { PERIOD_REGEX } from '../common/utils';
import { DashboardService } from './dashboard.service';

class SummaryQuery {
  @IsOptional()
  @Matches(PERIOD_REGEX, { message: 'period phải có dạng YYYY-MM' })
  period?: string;
}

@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('summary')
  summary(@Query() query: SummaryQuery) {
    return this.dashboardService.summary(query.period);
  }
}
