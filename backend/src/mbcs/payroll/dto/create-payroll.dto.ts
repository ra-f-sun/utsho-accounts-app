import {
  IsString,
  IsEnum,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  Max,
  MaxLength,
  IsInt,
} from 'class-validator';
import { PayableType, PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreatePayrollDto {
  @IsEnum(PayableType)
  payableType: PayableType;

  @IsString()
  payableId: string;

  @IsDateString()
  paymentMonth: string;

  @IsNumber()
  @Min(0)
  @Max(10000000)
  amount: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  totalLectures?: number;

  @IsDateString()
  paymentDate: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000000)
  paidAmount?: number; // If not set, defaults to amount (full payment)
}
