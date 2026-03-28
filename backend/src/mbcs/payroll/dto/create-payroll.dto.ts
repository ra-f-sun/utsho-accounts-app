import {
  IsString,
  IsEnum,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePayrollDto {
  @IsEnum(['teacher', 'staff'])
  payableType: string;

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

  @IsEnum(['cash', 'bkash', 'nagad', 'bank_transfer'])
  paymentMethod: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000000)
  paidAmount?: number; // If not set, defaults to amount (full payment)
}
