import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class FilterMbcsPayrollDto extends PaginationDto {
  @IsOptional()
  @IsString()
  payableType?: string;

  @IsOptional()
  @IsString()
  payableId?: string;

  @IsOptional()
  @IsString()
  paymentMonth?: string;
}
