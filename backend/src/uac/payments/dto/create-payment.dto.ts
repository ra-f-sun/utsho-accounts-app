import {
  IsString,
  IsEnum,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  Max,
  IsUUID,
} from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  studentId: string;

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
  paymentType: string;

  @IsNumber()
  @Min(0)
  @Max(10000000)
  amount: number;

  @IsDateString()
  paymentMonth: string; // YYYY-MM-01 format

  @IsDateString()
  paymentDate: string;

  @IsEnum(['cash', 'bkash', 'nagad', 'bank_transfer'])
  paymentMethod: string;

  @IsOptional()
  @IsString()
  notes?: string; // Required when paymentType is 'other'
}
