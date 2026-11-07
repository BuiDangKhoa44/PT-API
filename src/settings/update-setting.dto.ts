import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateSettingDto {
  @IsOptional() @IsString() facilityName?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() ownerName?: string;
  @IsOptional() @IsString() ownerPhone?: string;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() bankAccount?: string;
  @IsOptional() @IsString() bankHolder?: string;

  @IsOptional() @IsInt() @Min(0) electricPrice?: number;
  @IsOptional() @IsInt() @Min(0) waterPrice?: number;
  @IsOptional() @IsInt() @Min(0) waterPerPerson?: number;
  @IsOptional() @IsInt() @Min(0) servicePrice?: number;
  @IsOptional() @IsInt() @Min(0) internetPrice?: number;

  @IsOptional() @IsInt() @Min(1) @Max(28) meterCloseDay?: number;
  @IsOptional() @IsInt() @Min(1) @Max(28) rentDueFrom?: number;
  @IsOptional() @IsInt() @Min(1) @Max(28) rentDueTo?: number;
}
