import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { PERIOD_REGEX } from '../common/utils';

export class CreateExpenseDto {
  @IsString() @Matches(PERIOD_REGEX, { message: 'period phải có dạng YYYY-MM' }) period: string;
  @IsInt() @Min(1) amount: number;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsString() category?: string;
}
