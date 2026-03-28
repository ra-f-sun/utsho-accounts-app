import {
  IsString,
  IsEnum,
  IsNumber,
  IsInt,
  IsDateString,
  IsOptional,
  IsUUID,
  Min,
  Max,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PayableType, PaymentMethod } from '@prisma/client';

export class CreatePayrollDto {
  @IsEnum(PayableType)
  payableType: PayableType;

  @IsUUID()
  payableId: string; // Teacher ID or Staff ID

  @IsDateString()
  paymentMonth: string; // YYYY-MM-01 format

  @IsNumber()
  @Min(0)
  @Max(10000000)
  amount: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalLectures?: number; // Required for lecture-based teachers

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
