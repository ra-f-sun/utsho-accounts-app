import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class FilterPaymentDto extends PaginationDto {
  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsEnum([
    'tuition',
    'admission',
    'readmission',
    'exam',
    'session_charge',
    'study_materials',
    'study_tour',
    'stationary',
    'other',
  ])
  paymentType?: string;

  @IsOptional()
  @IsString()
  paymentMonth?: string;

  @IsOptional()
  @IsEnum(['cash', 'bkash', 'nagad', 'bank_transfer'])
  paymentMethod?: string;
}
