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
import { PaymentMethod } from '@prisma/client';

export class CreateMecPaymentDto {
  @IsUUID()
  studentId: string;

  // MEC only has tuition payments — no paymentType needed
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
  notes?: string;
}
