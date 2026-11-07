import { Type } from 'class-transformer';
import {
  IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min,
} from 'class-validator';

export class ListTenantsQuery {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsIn(['ACTIVE', 'EXPIRING', 'EXPIRED']) status?: 'ACTIVE' | 'EXPIRING' | 'EXPIRED';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 6;
}

export class CreateTenantDto {
  @IsString() @IsNotEmpty({ message: 'Họ tên không được để trống' }) fullName: string;
  @IsString() @IsNotEmpty({ message: 'CCCD không được để trống' }) idCard: string;
  @IsString() @IsNotEmpty({ message: 'Số điện thoại không được để trống' }) phone: string;
  @IsInt() roomId: number;
  @IsDateString() moveInDate: string; // yyyy-MM-dd
  @IsDateString() contractEndDate: string; // yyyy-MM-dd
  @IsOptional() @IsInt() @Min(0) deposit?: number;
  @IsOptional() @IsInt() @Min(1) people?: number;
  @IsOptional() @IsInt() @Min(1) @Max(28) dueDay?: number;
  @IsOptional() @IsInt() @Min(0) elecStart?: number;
  @IsOptional() @IsInt() @Min(0) waterStart?: number;
}
