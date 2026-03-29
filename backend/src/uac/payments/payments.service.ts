import { Injectable } from '@nestjs/common';
import {
  SharedPaymentsService,
  CreatePaymentInput,
  UpdatePaymentInput,
  FilterPaymentInput,
  CreateMultiPaymentInput,
  CollectDueInput,
} from '../../common/services/payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { FilterPaymentDto } from './dto/filter-payment.dto';
import { CreateMultiPaymentDto } from './dto/create-multi-payment.dto';
import { CollectDueDto } from './dto/collect-due.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class PaymentsService {
  constructor(private shared: SharedPaymentsService) {}

  create(dto: CreatePaymentDto, createdBy: string) {
    return this.shared.create('uac', dto as CreatePaymentInput, createdBy);
  }

  findAll(filters?: FilterPaymentDto, pagination?: PaginationDto) {
    return this.shared.findAll('uac', filters as FilterPaymentInput, pagination);
  }

  findOne(id: string) {
    return this.shared.findOne('uac', id);
  }

  update(id: string, dto: UpdatePaymentDto) {
    return this.shared.update('uac', id, dto as UpdatePaymentInput);
  }

  remove(id: string, updatedBy?: string) {
    return this.shared.remove('uac', id, updatedBy);
  }

  createMulti(dto: CreateMultiPaymentDto, createdBy: string) {
    return this.shared.createMulti('uac', dto as CreateMultiPaymentInput, createdBy);
  }

  getDueProfile(studentId: string) {
    return this.shared.getDueProfile('uac', studentId);
  }

  collectDue(dto: CollectDueDto, createdBy: string) {
    return this.shared.collectDue('uac', dto as CollectDueInput, createdBy);
  }

  findByInvoice(invoiceNumber: string) {
    return this.shared.findByInvoice('uac', invoiceNumber);
  }

  getDueSummary(studentId: string) {
    return this.shared.getDueSummary('uac', studentId);
  }

  getStudentPaymentSummary(studentId: string) {
    return this.shared.getStudentPaymentSummary('uac', studentId);
  }
}
