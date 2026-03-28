import { IsOptional, IsUUID, IsEnum, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { PayableType } from '@prisma/client';

export class FilterPayrollDto extends PaginationDto {
  @IsOptional()
  @IsEnum(PayableType)
  payableType?: PayableType;

  @IsOptional()
  @IsUUID()
  payableId?: string;

  @IsOptional()
  @IsString()
  paymentMonth?: string;
}
