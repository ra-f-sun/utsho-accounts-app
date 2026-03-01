import {
  IsString,
  IsEnum,
  IsNumber,
  IsDateString,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  Min,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UacPaymentLineItemDto {
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
  amount: number;

  @IsDateString()
  paymentMonth: string; // YYYY-MM-01 format

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateMultiPaymentDto {
  @IsUUID()
  studentId: string;

  @IsDateString()
  paymentDate: string;

  @IsEnum(['cash', 'bkash', 'nagad', 'bank_transfer'])
  paymentMethod: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UacPaymentLineItemDto)
  lineItems: UacPaymentLineItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  additionalDiscount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dueAmount?: number;
}
