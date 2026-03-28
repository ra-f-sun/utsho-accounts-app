import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterExpenseDto extends PaginationDto {
  @IsOptional()
  @IsEnum(['uac', 'mbcs', 'mec'])
  organization?: string;

  @IsOptional()
  @IsString()
  expenseType?: string;

  @IsOptional()
  @IsString()
  expenseMonth?: string;
}
