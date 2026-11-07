import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { CreateTenantDto, ListTenantsQuery } from './tenants.dto';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Get()
  list(@Query() query: ListTenantsQuery) {
    return this.tenantsService.list(query);
  }

  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Post(':id/checkout')
  checkout(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.checkout(id);
  }
}
