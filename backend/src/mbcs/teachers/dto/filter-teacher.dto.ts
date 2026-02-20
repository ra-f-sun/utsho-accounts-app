import { IsOptional, IsEnum } from 'class-validator';

export class FilterTeacherDto {
  @IsOptional()
  @IsEnum(['fixed', 'lecture_based'])
  paymentType?: string;
}
