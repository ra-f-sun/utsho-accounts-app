import { IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';

export class FilterPaymentDto {
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsEnum([
    'tuition',
    'admission',
    'readmission',
    'exam',
    'sheet',
    'session_charge',
    'study_materials',
    'study_tour',
    'other',
  ])
  paymentType?: string;

  @IsOptional()
  @IsDateString()
  paymentMonth?: string; // Filter by month (YYYY-MM-01)

  @IsOptional()
  @IsEnum(['cash', 'bank', 'mobile'])
  paymentMethod?: string;
}
