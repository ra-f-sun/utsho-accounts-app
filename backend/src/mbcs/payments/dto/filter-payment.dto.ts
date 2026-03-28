import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { MbcsPaymentType, PaymentMethod } from '@prisma/client';

export class FilterPaymentDto extends PaginationDto {
  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsEnum(MbcsPaymentType)
  paymentType?: MbcsPaymentType;

  @IsOptional()
  @IsString()
  paymentMonth?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
