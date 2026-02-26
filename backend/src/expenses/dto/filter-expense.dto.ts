import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterExpenseDto extends PaginationDto {
  @IsOptional()
  @IsString()
  organization?: string;

  @IsOptional()
  @IsString()
  expenseType?: string;

  @IsOptional()
  @IsString()
  expenseMonth?: string;
}
