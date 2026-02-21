import { IsOptional, IsString, IsUUID } from 'class-validator';

export class FilterMecPaymentDto {
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsString()
  paymentMonth?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
