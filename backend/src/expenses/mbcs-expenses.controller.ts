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
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../guards/roles.guard';
import { OrganizationGuard } from '../guards/organization.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/interfaces/jwt-user.interface';
import { Role } from '@prisma/client';

@Controller('mbcs/expenses')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrganizationGuard)
@Roles(Role.SUPER_ADMIN, Role.DIRECTOR, Role.ACCOUNTANT_MBCS)
export class MbcsExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  create(
    @Body() dto: Omit<CreateExpenseDto, 'organization'>,
    @CurrentUser() user: JwtUser,
  ) {
    return this.expensesService.create(
      { ...(dto as CreateExpenseDto), organization: 'mbcs' },
      user.id,
    );
  }

  @Get()
  findAll(
    @Query('expenseType') expenseType?: string,
    @Query('expenseMonth') expenseMonth?: string,
  ) {
    return this.expensesService.findAll('mbcs', expenseType, expenseMonth);
  }

  @Get('summary/:month')
  getSummary(@Param('month') month: string) {
    return this.expensesService.getOrganizationSummary('mbcs', month);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.expensesService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
  ) {
    await this.expensesService.findOneForOrg(id, 'mbcs');
    return this.expensesService.update(id, updateExpenseDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.expensesService.findOneForOrg(id, 'mbcs');
    return this.expensesService.remove(id);
  }
}
