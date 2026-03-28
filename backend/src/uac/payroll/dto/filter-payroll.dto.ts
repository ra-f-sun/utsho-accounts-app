import { IsOptional, IsString, IsUUID, IsEnum } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class FilterPayrollDto extends PaginationDto {
  @IsOptional()
  @IsEnum(['teacher', 'staff'])
  payableType?: string;

  @IsOptional()
  @IsUUID()
  payableId?: string;

  @IsOptional()
  @IsString()
  paymentMonth?: string;
}
