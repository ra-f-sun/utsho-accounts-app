import { IsOptional, IsEnum, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class FilterTeacherDto extends PaginationDto {
  @IsOptional()
  @IsEnum(['fixed', 'lecture_based'])
  paymentType?: string;

  @IsOptional()
  @IsString()
  search?: string; // Search by name or contact
}
