import {
  IsString,
  IsEnum,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  MinLength,
} from 'class-validator';

// MBCS payment types include 'stationary' (not present in UAC)
export class CreatePaymentDto {
  @IsString()
  @MinLength(1)
  studentId: string;

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
  paymentType: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsDateString()
  paymentMonth: string;

  @IsDateString()
  paymentDate: string;

  @IsEnum(['cash', 'bank', 'mobile'])
  paymentMethod: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
