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
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateMultiPaymentDto } from './dto/create-multi-payment.dto';
import { CollectDueDto } from './dto/collect-due.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { FilterPaymentDto } from './dto/filter-payment.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../guards/roles.guard';
import { OrganizationGuard } from '../../guards/organization.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { Role } from '@prisma/client';

@Controller('uac/payments')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrganizationGuard)
@Roles(Role.SUPER_ADMIN, Role.DIRECTOR, Role.ACCOUNTANT_UAC)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(
    @Body() createPaymentDto: CreatePaymentDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.paymentsService.create(createPaymentDto, user.id);
  }

  @Post('multi')
  createMulti(
    @Body() dto: CreateMultiPaymentDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.paymentsService.createMulti(dto, user.id);
  }

  @Get('student/:studentId/due-profile')
  getDueProfile(@Param('studentId', ParseUUIDPipe) studentId: string) {
    return this.paymentsService.getDueProfile(studentId);
  }

  @Post('collect-due')
  collectDue(@Body() dto: CollectDueDto, @CurrentUser() user: JwtUser) {
    return this.paymentsService.collectDue(dto, user.id);
  }

  @Get('invoice/:invoiceNumber')
  findByInvoice(@Param('invoiceNumber') invoiceNumber: string) {
    return this.paymentsService.findByInvoice(invoiceNumber);
  }

  @Get()
  findAll(@Query() filters: FilterPaymentDto) {
    const { page, limit, ...filterParams } = filters;
    return this.paymentsService.findAll(filterParams, { page, limit });
  }

  @Get('student/:studentId/summary')
  getStudentSummary(@Param('studentId', ParseUUIDPipe) studentId: string) {
    return this.paymentsService.getStudentPaymentSummary(studentId);
  }

  @Get('student/:studentId/due-summary')
  getDueSummary(@Param('studentId', ParseUUIDPipe) studentId: string) {
    return this.paymentsService.getDueSummary(studentId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
  ) {
    return this.paymentsService.update(id, updatePaymentDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.remove(id);
  }
}
