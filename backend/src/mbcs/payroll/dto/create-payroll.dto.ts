import {
  IsString,
  IsEnum,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
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
  amount: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  totalLectures?: number;

  @IsDateString()
  paymentDate: string;

  @IsEnum(['cash', 'bank', 'mobile'])
  paymentMethod: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
