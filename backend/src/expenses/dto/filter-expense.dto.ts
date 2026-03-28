import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ExpenseType } from '@prisma/client';

export class FilterExpenseDto extends PaginationDto {
  @IsOptional()
  @IsEnum(['uac', 'mbcs', 'mec'])
  organization?: string;

  @IsOptional()
  @IsEnum(ExpenseType)
  expenseType?: ExpenseType;

  @IsOptional()
  @IsString()
  expenseMonth?: string;
}
