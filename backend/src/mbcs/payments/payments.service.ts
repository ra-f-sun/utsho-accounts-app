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
import { CreateMbcsMultiPaymentDto } from './dto/create-multi-payment.dto';
import { CollectMbcsDueDto } from './dto/collect-due.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class PaymentsService {
  constructor(private shared: SharedPaymentsService) {}

  create(dto: CreatePaymentDto, createdBy: string) {
    return this.shared.create('mbcs', dto as CreatePaymentInput, createdBy);
  }

  findAll(filters?: FilterPaymentDto, pagination?: PaginationDto) {
    return this.shared.findAll('mbcs', filters as FilterPaymentInput, pagination);
  }

  findOne(id: string) {
    return this.shared.findOne('mbcs', id);
  }

  update(id: string, dto: UpdatePaymentDto) {
    return this.shared.update('mbcs', id, dto as UpdatePaymentInput);
  }

  remove(id: string, updatedBy?: string) {
    return this.shared.remove('mbcs', id, updatedBy);
  }

  createMulti(dto: CreateMbcsMultiPaymentDto, createdBy: string) {
    return this.shared.createMulti('mbcs', dto as CreateMultiPaymentInput, createdBy);
  }

  getDueProfile(studentId: string) {
    return this.shared.getDueProfile('mbcs', studentId);
  }

  collectDue(dto: CollectMbcsDueDto, createdBy: string) {
    return this.shared.collectDue('mbcs', dto as CollectDueInput, createdBy);
  }

  findByInvoice(invoiceNumber: string) {
    return this.shared.findByInvoice('mbcs', invoiceNumber);
  }

  getDueSummary(studentId: string) {
    return this.shared.getDueSummary('mbcs', studentId);
  }

  getStudentPaymentSummary(studentId: string) {
    return this.shared.getStudentPaymentSummary('mbcs', studentId);
  }
}
