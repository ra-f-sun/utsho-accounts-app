import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PromoteMecStudentDto {
  @IsInt()
  @Min(1)
  @Max(20)
  toClass: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class PromoteMecBulkDto {
  @IsInt()
  @Min(1)
  @Max(20)
  fromClass: number;

  @IsInt()
  @Min(1)
  @Max(20)
  toClass: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
