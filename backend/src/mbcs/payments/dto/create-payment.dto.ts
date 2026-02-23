import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsDateString,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

// MBCS payment types include 'stationary' (not present in UAC)
export class CreatePaymentDto {
  @IsUUID()
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
