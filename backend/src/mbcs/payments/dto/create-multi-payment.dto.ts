import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsDateString,
  IsOptional,
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

  @IsEnum(['cash', 'bank', 'mobile'])
  paymentMethod: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MbcsPaymentLineItemDto)
  lineItems: MbcsPaymentLineItemDto[];
}
