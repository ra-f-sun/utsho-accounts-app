import { Injectable } from '@nestjs/common';
import {
  SharedPaymentsService,
  CreatePaymentInput,
  UpdatePaymentInput,
  FilterPaymentInput,
  CreateMultiPaymentInput,
  CollectDueInput,
} from '../../common/services/payments.service';
import { CreateMecPaymentDto } from './dto/create-payment.dto';
import { UpdateMecPaymentDto } from './dto/update-payment.dto';
import { FilterMecPaymentDto } from './dto/filter-payment.dto';
import { CreateMecMultiPaymentDto } from './dto/create-multi-payment.dto';
import { CollectMecDueDto } from './dto/collect-due.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class MecPaymentsService {
  constructor(private shared: SharedPaymentsService) {}

  create(dto: CreateMecPaymentDto, createdBy: string) {
    return this.shared.create('mec', dto as CreatePaymentInput, createdBy);
  }

  findAll(filters?: FilterMecPaymentDto, pagination?: PaginationDto) {
    return this.shared.findAll('mec', filters as FilterPaymentInput, pagination);
  }

  findOne(id: string) {
    return this.shared.findOne('mec', id);
  }

  update(id: string, dto: UpdateMecPaymentDto) {
    return this.shared.update('mec', id, dto as UpdatePaymentInput);
  }

  remove(id: string, updatedBy?: string) {
    return this.shared.remove('mec', id, updatedBy);
  }

  createMulti(dto: CreateMecMultiPaymentDto, createdBy: string) {
    return this.shared.createMulti('mec', dto as CreateMultiPaymentInput, createdBy);
  }

  getDueProfile(studentId: string) {
    return this.shared.getDueProfile('mec', studentId);
  }

  collectDue(dto: CollectMecDueDto, createdBy: string) {
    return this.shared.collectDue('mec', dto as CollectDueInput, createdBy);
  }

  findByInvoice(invoiceNumber: string) {
    return this.shared.findByInvoice('mec', invoiceNumber);
  }

  getDueSummary(studentId: string) {
    return this.shared.getDueSummary('mec', studentId);
  }

  getStudentPaymentSummary(studentId: string) {
    return this.shared.getStudentPaymentSummary('mec', studentId);
  }
}
