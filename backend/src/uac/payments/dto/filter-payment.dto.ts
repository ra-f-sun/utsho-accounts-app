import { IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { UacPaymentType, PaymentMethod } from '@prisma/client';

export class FilterPaymentDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsEnum(UacPaymentType)
  paymentType?: UacPaymentType;

  @IsOptional()
  @IsDateString()
  paymentMonth?: string; // Filter by month (YYYY-MM-01)

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
