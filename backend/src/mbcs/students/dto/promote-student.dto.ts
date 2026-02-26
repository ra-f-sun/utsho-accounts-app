import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class PromoteMbcsStudentDto {
  @IsInt()
  @Min(0)
  @Max(11) // 11 = graduated from MBCS
  toClass: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class PromoteMbcsBulkDto {
  @IsInt()
  @Min(0)
  @Max(10)
  fromClass: number;

  @IsInt()
  @Min(0)
  @Max(11)
  toClass: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
