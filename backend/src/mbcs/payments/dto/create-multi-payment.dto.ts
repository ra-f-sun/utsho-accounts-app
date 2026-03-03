import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsDateString,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MbcsPaymentLineItemDto {
  @IsEnum([
    'tuition',
    'admission',
    'readmission',
    'late_fee',
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

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateMbcsMultiPaymentDto {
  @IsUUID()
  studentId: string;

  @IsDateString()
  paymentDate: string;

  @IsEnum(['cash', 'bkash', 'nagad', 'bank_transfer'])
  paymentMethod: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MbcsPaymentLineItemDto)
  lineItems: MbcsPaymentLineItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  additionalDiscount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dueAmount?: number;
}
