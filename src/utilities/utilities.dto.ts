import { Type } from 'class-transformer';
import {
  ArrayNotEmpty, IsArray, IsInt, IsOptional, IsString, Matches, Min, ValidateNested,
} from 'class-validator';
import { PERIOD_REGEX } from '../common/utils';

export class PeriodQuery {
  @IsString()
  @Matches(PERIOD_REGEX, { message: 'period phải có dạng YYYY-MM, ví dụ 2024-10' })
  period: string;
}

export class ReadingItemDto {
  @IsInt() roomId: number;
  @IsInt() @Min(0) elecNew: number;
  @IsInt() @Min(0) waterNew: number;
}

export class SaveReadingsDto {
  @IsString()
  @Matches(PERIOD_REGEX, { message: 'period phải có dạng YYYY-MM, ví dụ 2024-10' })
  period: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'Chưa có phòng nào để lưu' })
  @ValidateNested({ each: true })
  @Type(() => ReadingItemDto)
  items: ReadingItemDto[];
}
