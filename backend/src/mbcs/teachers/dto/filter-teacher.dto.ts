import { IsOptional, IsEnum } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class FilterTeacherDto extends PaginationDto {
  @IsOptional()
  @IsEnum(['fixed', 'lecture_based'])
  paymentType?: string;
}
