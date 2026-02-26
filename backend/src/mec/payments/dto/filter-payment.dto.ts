import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class FilterMecPaymentDto extends PaginationDto {
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
