import {
  IsString,
  IsEnum,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  IsUUID,
} from 'class-validator';

export class CreateMecPaymentDto {
  @IsUUID()
  studentId: string;

  // MEC only has tuition payments — no paymentType needed
  @IsNumber()
  @Min(0)
  amount: number;

  @IsDateString()
  paymentMonth: string; // YYYY-MM-01 format

  @IsDateString()
  paymentDate: string;

  @IsEnum(['cash', 'bkash', 'nagad', 'bank_transfer'])
  paymentMethod: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
