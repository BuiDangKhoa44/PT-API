import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { PERIOD_REGEX } from '../common/utils';

export class ListInvoicesQuery {
  @IsOptional()
  @Matches(PERIOD_REGEX, { message: 'period phải có dạng YYYY-MM' })
  period?: string;

  @IsOptional() @IsIn(['PAID', 'PENDING', 'OVERDUE']) status?: 'PAID' | 'PENDING' | 'OVERDUE';
  @IsOptional() @IsString() q?: string;
}

export class PeriodBodyDto {
  @IsString()
  @Matches(PERIOD_REGEX, { message: 'period phải có dạng YYYY-MM, ví dụ 2024-10' })
  period: string;
}

export class ConfirmPaymentDto {
  @IsOptional() @IsString() method?: string; // 'Tiền mặt', 'Chuyển khoản (VietQR)'...
}
