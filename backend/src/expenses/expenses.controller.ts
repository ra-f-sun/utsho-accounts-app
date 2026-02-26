import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { FilterExpenseDto } from './dto/filter-expense.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/interfaces/jwt-user.interface';
import { Role } from '@prisma/client';

@Controller('expenses')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.DIRECTOR)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  create(
    @Body() createExpenseDto: CreateExpenseDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.expensesService.create(createExpenseDto, user.id);
  }

  @Get()
  findAll(@Query() filters: FilterExpenseDto) {
    const { page, limit, organization, expenseType, expenseMonth } = filters;
    return this.expensesService.findAll(
      organization,
      expenseType,
      expenseMonth,
      { page, limit },
    );
  }

  @Get('summary/:organization/:month')
  getOrganizationSummary(
    @Param('organization') organization: string,
    @Param('month') month: string, // Format: YYYY-MM
  ) {
    return this.expensesService.getOrganizationSummary(organization, month);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.expensesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(id, updateExpenseDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.expensesService.remove(id);
  }
}
