import { Type } from 'class-transformer';
import {
  IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min,
} from 'class-validator';

export const ROOM_STATUSES = ['RENTED', 'VACANT', 'MAINTENANCE'] as const;

export class ListRoomsQuery {
  @IsOptional() @Type(() => Number) @IsInt() floor?: number;
  @IsOptional() @IsIn(ROOM_STATUSES) status?: (typeof ROOM_STATUSES)[number];
  @IsOptional() @IsString() q?: string;
}

export class CreateRoomDto {
  @IsString() @IsNotEmpty({ message: 'Mã phòng không được để trống' }) code: string;
  @IsString() @IsNotEmpty({ message: 'Tên phòng không được để trống' }) name: string;
  @IsInt() @Min(1) floor: number;
  @IsInt() @Min(1) area: number;
  @IsInt() @Min(0) price: number;
  @IsOptional() @IsString() note?: string;
}

export class SetRoomStatusDto {
  @IsIn(ROOM_STATUSES, { message: 'Trạng thái phải là RENTED, VACANT hoặc MAINTENANCE' })
  status: (typeof ROOM_STATUSES)[number];

  // Chỉ dùng khi status = MAINTENANCE
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsDateString() expectedDone?: string;
  @IsOptional() @IsString() technician?: string;
}
