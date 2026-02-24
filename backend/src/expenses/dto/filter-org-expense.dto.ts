import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterOrgExpenseDto extends PaginationDto {
  @IsOptional()
  @IsString()
  expenseType?: string;

  @IsOptional()
  @IsString()
  expenseMonth?: string;
}
