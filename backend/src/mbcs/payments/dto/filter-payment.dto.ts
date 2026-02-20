import { IsOptional, IsString, IsEnum } from 'class-validator';

export class FilterPaymentDto {
  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsEnum([
    'tuition',
    'admission',
    'readmission',
    'exam',
    'session_charge',
    'study_materials',
    'study_tour',
    'stationary',
    'other',
  ])
  paymentType?: string;

  @IsOptional()
  @IsString()
  paymentMonth?: string;

  @IsOptional()
  @IsEnum(['cash', 'bank', 'mobile'])
  paymentMethod?: string;
}
