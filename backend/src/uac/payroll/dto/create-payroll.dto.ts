import {
  IsString,
  IsEnum,
  IsNumber,
  IsInt,
  IsDateString,
  IsOptional,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreatePayrollDto {
  @IsEnum(['teacher', 'staff'])
  payableType: string;

  @IsUUID()
  payableId: string; // Teacher ID or Staff ID

  @IsDateString()
  paymentMonth: string; // YYYY-MM-01 format

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalLectures?: number; // Required for lecture-based teachers

  @IsDateString()
  paymentDate: string;

  @IsEnum(['cash', 'bank', 'mobile'])
  paymentMethod: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
