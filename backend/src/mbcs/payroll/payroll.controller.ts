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
import { PayrollService } from './payroll.service';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { UpdatePayrollDto } from './dto/update-payroll.dto';
import { CollectPayrollDueDto } from './dto/collect-payroll-due.dto';
import { FilterMbcsPayrollDto } from './dto/filter-payroll.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../guards/roles.guard';
import { OrganizationGuard } from '../../guards/organization.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { Role } from '@prisma/client';

@Controller('mbcs/payroll')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrganizationGuard)
@Roles(Role.SUPER_ADMIN, Role.DIRECTOR, Role.ACCOUNTANT_MBCS)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post()
  create(
    @Body() createPayrollDto: CreatePayrollDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.payrollService.create(createPayrollDto, user.id);
  }

  @Get()
  findAll(@Query() filters: FilterMbcsPayrollDto) {
    const { page, limit, payableType, payableId, paymentMonth } = filters;
    return this.payrollService.findAll(payableType, payableId, paymentMonth, {
      page,
      limit,
    });
  }

  @Get('calculate/teacher/:teacherId/:month')
  calculateTeacherPayroll(
    @Param('teacherId', ParseUUIDPipe) teacherId: string,
    @Param('month') month: string, // Format: YYYY-MM
  ) {
    return this.payrollService.calculateTeacherPayroll(teacherId, month);
  }

  @Post(':id/collect-due')
  collectDue(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CollectPayrollDueDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.payrollService.collectDue(id, dto, user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.payrollService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePayrollDto: UpdatePayrollDto,
  ) {
    return this.payrollService.update(id, updatePayrollDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.payrollService.remove(id, user.id);
  }
}
