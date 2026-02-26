import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class PromoteStudentDto {
  @IsInt()
  @Min(9)
  @Max(13) // 13 = graduated
  toClass: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class PromoteBulkDto {
  @IsInt()
  @Min(8)
  @Max(12)
  fromClass: number;

  @IsInt()
  @Min(9)
  @Max(13)
  toClass: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
