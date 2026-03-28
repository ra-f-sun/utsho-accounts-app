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
import { UacPaymentType, PaymentMethod } from '@prisma/client';

export class UacPaymentLineItemDto {
  @IsEnum(UacPaymentType)
  paymentType: UacPaymentType;

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

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

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
