import { IsOptional, IsEnum } from 'class-validator';

export class FilterTeacherDto {
  @IsOptional()
  @IsEnum(['fixed', 'lecture_based'])
  paymentType?: string;

  @IsOptional()
  search?: string; // Search by name or contact
}
