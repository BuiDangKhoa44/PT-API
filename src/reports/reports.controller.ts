import {
  BadRequestException, Controller, Get, Query, Res, StreamableFile,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Response } from 'express';
import { ReportsService } from './reports.service';

class MonthsQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(24) months?: number = 4;
}

@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('revenue')
  revenue(@Query() query: MonthsQuery) {
    return this.reportsService.revenue(query.months);
  }

  @Get('export')
  async export(
    @Query('format') format = 'xlsx',
    @Res({ passthrough: true }) res: Response,
  ) {
    if (format !== 'xlsx') {
      throw new BadRequestException('Hiện chỉ hỗ trợ xuất file xlsx');
    }
    const buffer = await this.reportsService.exportXlsx();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="bao-cao-doanh-thu.xlsx"',
    });
    return new StreamableFile(buffer);
  }
}
