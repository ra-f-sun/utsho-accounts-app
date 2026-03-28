import {
  IsString,
  IsEnum,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  Max,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { UacPaymentType, PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @IsUUID()
  studentId: string;

  @IsEnum(UacPaymentType)
  paymentType: UacPaymentType;

  @IsNumber()
  @Min(0)
  @Max(10000000)
  amount: number;

  @IsDateString()
  paymentMonth: string; // YYYY-MM-01 format

  @IsDateString()
  paymentDate: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string; // Required when paymentType is 'other'
}
