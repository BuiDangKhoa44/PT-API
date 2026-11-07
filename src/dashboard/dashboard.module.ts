import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from '../expenses/expense.entity';
import { Invoice } from '../invoices/invoice.entity';
import { Room } from '../rooms/room.entity';
import { SettingsModule } from '../settings/settings.module';
import { Tenant } from '../tenants/tenant.entity';
import { Reading } from '../utilities/reading.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, Expense, Room, Tenant, Reading]), SettingsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
