import { IsOptional, IsEnum } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { TeacherSalaryType } from '@prisma/client';

export class FilterTeacherDto extends PaginationDto {
  @IsOptional()
  @IsEnum(TeacherSalaryType)
  paymentType?: TeacherSalaryType;
}
