import { IsOptional, IsEnum, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ExpenseType } from '@prisma/client';

export class FilterOrgExpenseDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ExpenseType)
  expenseType?: ExpenseType;

  @IsOptional()
  @IsString()
  expenseMonth?: string;
}
