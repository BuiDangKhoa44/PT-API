import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ConfirmPaymentDto, ListInvoicesQuery, PeriodBodyDto } from './invoices.dto';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Get()
  list(@Query() query: ListInvoicesQuery) {
    return this.invoicesService.list(query);
  }

  @Patch(':id/confirm-payment')
  confirm(@Param('id', ParseIntPipe) id: number, @Body() dto: ConfirmPaymentDto) {
    return this.invoicesService.confirm(id, dto);
  }

  @Post('generate')
  generate(@Body() dto: PeriodBodyDto) {
    return this.invoicesService.generate(dto.period);
  }

  @Post('notify')
  notify(@Body() dto: PeriodBodyDto) {
    return this.invoicesService.notify(dto.period);
  }
}
