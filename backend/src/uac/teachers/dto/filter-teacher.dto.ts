import { IsOptional, IsEnum, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { TeacherSalaryType } from '@prisma/client';

export class FilterTeacherDto extends PaginationDto {
  @IsOptional()
  @IsEnum(TeacherSalaryType)
  paymentType?: TeacherSalaryType;

  @IsOptional()
  @IsString()
  search?: string; // Search by name or contact
}
