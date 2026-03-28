import {
  IsString,
  IsEnum,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class CreateExpenseDto {
  @IsEnum(['uac', 'mbcs', 'mec'])
  organization: string;

  @IsEnum(['rent', 'electricity', 'water', 'internet', 'salary', 'other'])
  expenseType: string;

  @IsNumber()
  @Min(0)
  @Max(10000000)
  amount: number;

  @IsDateString()
  expenseMonth: string; // YYYY-MM-01 format

  @IsDateString()
  paymentDate: string;

  @IsEnum(['cash', 'bkash', 'nagad', 'bank_transfer'])
  paymentMethod: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
