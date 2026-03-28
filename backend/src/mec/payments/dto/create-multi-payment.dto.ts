import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  Min,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class MecPaymentLineItemDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsDateString()
  paymentMonth: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateMecMultiPaymentDto {
  @IsUUID()
  studentId: string;

  @IsDateString()
  paymentDate: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MecPaymentLineItemDto)
  lineItems: MecPaymentLineItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  additionalDiscount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dueAmount?: number;
}
