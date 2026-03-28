import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsDateString,
  IsOptional,
  IsString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { MbcsPaymentType, PaymentMethod } from '@prisma/client';

// MBCS payment types include 'stationary' (not present in UAC)
export class CreatePaymentDto {
  @IsUUID()
  studentId: string;

  @IsEnum(MbcsPaymentType)
  paymentType: MbcsPaymentType;

  @IsNumber()
  @Min(0)
  @Max(10000000)
  amount: number;

  @IsDateString()
  paymentMonth: string;

  @IsDateString()
  paymentDate: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
