import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { Shift } from '@prisma/client';

export class FilterStudentDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  class?: number;

  @IsOptional()
  @IsEnum(Shift)
  shift?: Shift;

  @IsOptional()
  @IsString()
  branch?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
