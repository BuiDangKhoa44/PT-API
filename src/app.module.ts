import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { SettingsModule } from './settings/settings.module';
import { RoomsModule } from './rooms/rooms.module';
import { TenantsModule } from './tenants/tenants.module';
import { UtilitiesModule } from './utilities/utilities.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ExpensesModule } from './expenses/expenses.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // đọc file .env
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DB_HOST'),
        port: Number(config.get('DB_PORT')),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        charset: 'utf8mb4', // lưu được tiếng Việt có dấu
        autoLoadEntities: true,
        synchronize: true, // chỉ dùng khi học/dev (xem chương 07)
      }),
    }),
    AuthModule,
    SettingsModule,
    RoomsModule,
    TenantsModule,
    UtilitiesModule,
    InvoicesModule,
    ExpensesModule,
    DashboardModule,
    ReportsModule,
  ],
  // Guard toàn cục: mọi route đều cần JWT, trừ route gắn @Public()
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
