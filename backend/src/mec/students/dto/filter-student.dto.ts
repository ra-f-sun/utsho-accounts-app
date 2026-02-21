import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterMecStudentDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  class?: number;

  @IsOptional()
  @IsString()
  search?: string;
}
