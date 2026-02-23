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
import { MecPaymentsService } from './payments.service';
import { CreateMecPaymentDto } from './dto/create-payment.dto';
import { CreateMecMultiPaymentDto } from './dto/create-multi-payment.dto';
import { UpdateMecPaymentDto } from './dto/update-payment.dto';
import { FilterMecPaymentDto } from './dto/filter-payment.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../guards/roles.guard';
import { OrganizationGuard } from '../../guards/organization.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { Role } from '@prisma/client';

@Controller('mec/payments')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrganizationGuard)
@Roles(Role.SUPER_ADMIN, Role.DIRECTOR, Role.ACCOUNTANT_MEC)
export class MecPaymentsController {
  constructor(private readonly paymentsService: MecPaymentsService) {}

  @Post()
  create(
    @Body() createPaymentDto: CreateMecPaymentDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.paymentsService.create(createPaymentDto, user.id);
  }

  @Post('multi')
  createMulti(
    @Body() dto: CreateMecMultiPaymentDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.paymentsService.createMulti(dto, user.id);
  }

  @Get('invoice/:invoiceNumber')
  findByInvoice(@Param('invoiceNumber') invoiceNumber: string) {
    return this.paymentsService.findByInvoice(invoiceNumber);
  }

  @Get()
  findAll(@Query() filters: FilterMecPaymentDto, @Query() pagination: PaginationDto) {
    return this.paymentsService.findAll(filters, pagination);
  }

  @Get('student/:studentId/summary')
  getStudentSummary(@Param('studentId', ParseUUIDPipe) studentId: string) {
    return this.paymentsService.getStudentPaymentSummary(studentId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePaymentDto: UpdateMecPaymentDto,
  ) {
    return this.paymentsService.update(id, updatePaymentDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.remove(id);
  }
}
