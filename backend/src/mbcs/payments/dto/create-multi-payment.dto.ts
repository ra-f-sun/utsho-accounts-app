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
import { MbcsPaymentType, PaymentMethod } from '@prisma/client';

export class MbcsPaymentLineItemDto {
  @IsEnum(MbcsPaymentType)
  paymentType: MbcsPaymentType;

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

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

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
