import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CollectMbcsDueDto {
  @IsString()
  parentInvoiceNumber: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0.01)
  paidAmount: number;

  @IsDateString()
  paymentDate: string;

  @IsEnum(['cash', 'bkash', 'nagad', 'bank_transfer'])
  paymentMethod: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
