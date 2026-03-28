import { Injectable } from '@nestjs/common';
import { PayableType } from '@prisma/client';
import { SharedPayrollService } from '../../common/services/payroll.service';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { UpdatePayrollDto } from './dto/update-payroll.dto';
import { CollectPayrollDueDto } from './dto/collect-payroll-due.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class PayrollService {
  constructor(private shared: SharedPayrollService) {}

  create(dto: CreatePayrollDto, createdBy: string) { return this.shared.create('uac', dto, createdBy); }
  findAll(payableType?: PayableType, payableId?: string, paymentMonth?: string, pagination?: PaginationDto) { return this.shared.findAll('uac', payableType, payableId, paymentMonth, pagination); }
  findOne(id: string) { return this.shared.findOne('uac', id); }
  update(id: string, dto: UpdatePayrollDto) { return this.shared.update('uac', id, dto); }
  remove(id: string, updatedBy?: string) { return this.shared.remove('uac', id, updatedBy); }
  calculateTeacherPayroll(teacherId: string, month: string) { return this.shared.calculateTeacherPayroll('uac', teacherId, month); }
  collectDue(payrollId: string, dto: CollectPayrollDueDto, createdBy: string) { return this.shared.collectDue('uac', payrollId, dto, createdBy); }
}
