import { IsOptional, IsInt, IsString, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterStudentDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(8)
  @Max(12)
  class?: number;

  @IsOptional()
  @IsEnum(['science', 'business'])
  group?: string;

  @IsOptional()
  @IsString()
  school?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
