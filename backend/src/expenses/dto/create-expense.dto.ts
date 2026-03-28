import {
  IsString,
  IsEnum,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ExpenseType, PaymentMethod } from '@prisma/client';

export class CreateExpenseDto {
  @IsEnum(['uac', 'mbcs', 'mec'])
  organization: string;

  @IsEnum(ExpenseType)
  expenseType: ExpenseType;

  @IsNumber()
  @Min(0)
  @Max(10000000)
  amount: number;

  @IsDateString()
  expenseMonth: string; // YYYY-MM-01 format

  @IsDateString()
  paymentDate: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
