import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceService } from './invoice.service';
import { PaginationDto } from '../dto/pagination.dto';
import {
  round2,
  allocatePaid,
  buildPriorityOrder,
} from '../utils/payment-allocation';

export type OrgType = 'uac' | 'mbcs' | 'mec';

export interface CreatePaymentInput {
  studentId: string;
  paymentType?: string;
  amount: number;
  paymentMethod: string;
  paymentMonth?: string;
  paymentDate: string;
  notes?: string;
}

export interface UpdatePaymentInput {
  paymentType?: string;
  paymentMethod?: string;
  amount?: number;
  paymentMonth?: string;
  paymentDate?: string;
  notes?: string;
}

export interface FilterPaymentInput {
  studentId?: string;
  paymentType?: string;
  paymentMonth?: string;
  paymentMethod?: string;
}

export interface LineItemInput {
  amount: number;
  paymentType?: string;
  paymentMonth: string;
  notes?: string;
}

export interface CreateMultiPaymentInput {
  studentId: string;
  lineItems: LineItemInput[];
  paymentDate: string;
  paymentMethod: string;
  additionalDiscount?: number;
  dueAmount?: number;
}

export interface CollectDueInput {
  parentInvoiceNumber: string;
  paidAmount: number;
  paymentDate: string;
  paymentMethod: string;
  notes?: string;
}

interface OrgConfig {
  hasPaymentType: boolean;
  defaultPriorityOrder: { group: string; types: string[] }[];
  othersTypes: string[];
  tuitionStartFromAdmission: boolean;
  hasLateFee: boolean;
  checkDuplicateTuitionOnCreate: boolean;
  studentSelectBasic: Record<string, boolean>;
  studentSelectFull: Record<string, boolean>;
}

const ORG_CONFIG: Record<OrgType, OrgConfig> = {
  uac: {
    hasPaymentType: true,
    defaultPriorityOrder: [
      { group: 'tuition', types: ['tuition'] },
      { group: 'admission', types: ['admission'] },
      { group: 'readmission', types: ['readmission'] },
      {
        group: 'others',
        types: [
          'exam',
          'sheet',
          'session_charge',
          'study_materials',
          'study_tour',
          'other',
        ],
      },
    ],
    othersTypes: [
      'exam',
      'sheet',
      'session_charge',
      'study_materials',
      'study_tour',
      'other',
    ],
    tuitionStartFromAdmission: true,
    hasLateFee: false,
    checkDuplicateTuitionOnCreate: true,
    studentSelectBasic: { id: true, name: true, class: true, group: true },
    studentSelectFull: {
      id: true,
      name: true,
      class: true,
      group: true,
      contactNumber: true,
    },
  },
  mbcs: {
    hasPaymentType: true,
    defaultPriorityOrder: [
      { group: 'tuition', types: ['tuition'] },
      { group: 'late_fee', types: ['late_fee'] },
      { group: 'admission', types: ['admission'] },
      { group: 'readmission', types: ['readmission'] },
      {
        group: 'others',
        types: [
          'exam',
          'session_charge',
          'study_materials',
          'study_tour',
          'stationary',
          'other',
        ],
      },
    ],
    othersTypes: [
      'exam',
      'session_charge',
      'study_materials',
      'study_tour',
      'stationary',
      'other',
    ],
    tuitionStartFromAdmission: false,
    hasLateFee: true,
    checkDuplicateTuitionOnCreate: false,
    studentSelectBasic: { id: true, name: true, class: true, shift: true },
    studentSelectFull: {
      id: true,
      name: true,
      class: true,
      shift: true,
      contactNumber: true,
    },
  },
  mec: {
    hasPaymentType: false,
    defaultPriorityOrder: [],
    othersTypes: [],
    tuitionStartFromAdmission: false,
    hasLateFee: false,
    checkDuplicateTuitionOnCreate: false,
    studentSelectBasic: { id: true, name: true, class: true },
    studentSelectFull: { id: true, name: true, class: true, contactNumber: true },
  },
};

@Injectable()
export class SharedPaymentsService {
  constructor(
    private prisma: PrismaService,
    private invoiceService: InvoiceService,
  ) {}

  private paymentModel(org: OrgType): any {
    if (org === 'uac') return this.prisma.uacPayment;
    if (org === 'mbcs') return this.prisma.mbcsPayment;
    return this.prisma.mecPayment;
  }

  private studentModel(org: OrgType): any {
    if (org === 'uac') return this.prisma.uacStudent;
    if (org === 'mbcs') return this.prisma.mbcsStudent;
    return this.prisma.mecStudent;
  }

  private txPaymentModel(tx: any, org: OrgType): any {
    return tx[`${org}Payment`];
  }

  private async getPaymentPriority(
    org: OrgType,
  ): Promise<{ group: string; types: string[] }[]> {
    const config = ORG_CONFIG[org];
    try {
      const setting = await this.prisma.orgSettings.findUnique({
        where: {
          organization_settingKey: {
            organization: org,
            settingKey: 'payment_priority',
          },
        },
      });
      if (setting?.settingValue) {
        const raw =
          typeof setting.settingValue === 'string'
            ? (JSON.parse(setting.settingValue) as { order?: unknown })
            : (setting.settingValue as { order?: unknown });
        if (Array.isArray(raw?.order)) {
          return buildPriorityOrder(raw.order as string[], config.othersTypes);
        }
      }
    } catch {
      // fall through to default
    }
    return config.defaultPriorityOrder;
  }

  private async checkDuplicateTuition(
    org: OrgType,
    studentId: string,
    paymentMonth: string,
  ): Promise<void> {
    const existing = await this.paymentModel(org).findFirst({
      where: {
        studentId,
        paymentType: 'tuition',
        paymentMonth: new Date(paymentMonth),
        isActive: true,
        isDueCollection: false,
      },
    });
    if (existing) {
      throw new ConflictException(
        `Tuition payment for ${paymentMonth} already exists for this student`,
      );
    }
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  async create(org: OrgType, dto: CreatePaymentInput, createdBy: string) {
    const config = ORG_CONFIG[org];

    const student = await this.studentModel(org).findUnique({
      where: { id: dto.studentId },
    });
    if (!student) {
      throw new NotFoundException(
        `Student with ID ${dto.studentId} not found`,
      );
    }

    if (
      config.checkDuplicateTuitionOnCreate &&
      dto.paymentType === 'tuition' &&
      dto.paymentMonth
    ) {
      await this.checkDuplicateTuition(org, dto.studentId, dto.paymentMonth);
    }

    const invoiceNumber =
      await this.invoiceService.generateInvoiceNumber(org);

    return this.prisma.$transaction(async (tx: any) => {
      const data: Record<string, unknown> = {
        studentId: dto.studentId,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod as PaymentMethod,
        paymentDate: new Date(dto.paymentDate),
        notes: dto.notes,
        invoiceNumber,
        createdBy,
      };
      if (dto.paymentMonth) data.paymentMonth = new Date(dto.paymentMonth);
      if (config.hasPaymentType && dto.paymentType) {
        data.paymentType = dto.paymentType;
      }

      return this.txPaymentModel(tx, org).create({
        data,
        include: { student: { select: config.studentSelectBasic } },
      });
    });
  }

  async findAll(
    org: OrgType,
    filters?: FilterPaymentInput,
    pagination?: PaginationDto,
  ) {
    const config = ORG_CONFIG[org];
    const where: Record<string, unknown> = { isActive: true };

    if (filters?.studentId) where.studentId = filters.studentId;
    if (filters?.paymentType && config.hasPaymentType) {
      where.paymentType = filters.paymentType;
    }
    if (filters?.paymentMonth) {
      where.paymentMonth = new Date(filters.paymentMonth);
    }
    if (filters?.paymentMethod) {
      where.paymentMethod = filters.paymentMethod as PaymentMethod;
    }

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const skip = (page - 1) * limit;

    const model = this.paymentModel(org);
    const [invoicePage, allInvoices] = await Promise.all([
      model.findMany({
        where,
        select: { invoiceNumber: true },
        distinct: ['invoiceNumber'],
        orderBy: { paymentDate: 'desc' },
        skip,
        take: limit,
      }),
      model.findMany({
        where,
        select: { invoiceNumber: true },
        distinct: ['invoiceNumber'],
      }),
    ]);

    const invoiceNumbers = invoicePage.map((p: any) => p.invoiceNumber);
    const total = allInvoices.length;

    const data =
      invoiceNumbers.length > 0
        ? await model.findMany({
            where: { invoiceNumber: { in: invoiceNumbers }, isActive: true },
            include: { student: { select: config.studentSelectFull } },
            orderBy: { paymentDate: 'desc' },
          })
        : [];

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(org: OrgType, id: string) {
    const payment = await this.paymentModel(org).findFirst({
      where: { id, isActive: true },
      include: { student: true },
    });
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    return payment;
  }

  async update(org: OrgType, id: string, dto: UpdatePaymentInput) {
    await this.findOne(org, id);
    const config = ORG_CONFIG[org];

    const data: Record<string, unknown> = {};
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.paymentMethod) data.paymentMethod = dto.paymentMethod as PaymentMethod;
    if (dto.paymentMonth) data.paymentMonth = new Date(dto.paymentMonth);
    if (dto.paymentDate) data.paymentDate = new Date(dto.paymentDate);
    if (config.hasPaymentType && dto.paymentType) {
      data.paymentType = dto.paymentType;
    }

    return this.paymentModel(org).update({
      where: { id },
      data,
      include: { student: { select: config.studentSelectBasic } },
    });
  }

  async remove(org: OrgType, id: string, updatedBy?: string) {
    await this.findOne(org, id);
    return this.paymentModel(org).update({
      where: { id },
      data: { isActive: false, ...(updatedBy && { updatedBy }) },
    });
  }

  // ─── createMulti ─────────────────────────────────────────────────────────────

  async createMulti(
    org: OrgType,
    dto: CreateMultiPaymentInput,
    createdBy: string,
  ) {
    const config = ORG_CONFIG[org];

    const student = await this.studentModel(org).findUnique({
      where: { id: dto.studentId },
    });
    if (!student) {
      throw new NotFoundException(`Student with ID ${dto.studentId} not found`);
    }

    // Duplicate check
    for (const item of dto.lineItems) {
      if (config.hasPaymentType) {
        if (item.paymentType === 'tuition' && item.paymentMonth) {
          await this.checkDuplicateTuition(org, dto.studentId, item.paymentMonth);
        }
      } else {
        // MEC: no paymentType — check duplicate per month
        if (item.paymentMonth) {
          const existing = await this.paymentModel(org).findFirst({
            where: {
              studentId: dto.studentId,
              paymentMonth: new Date(item.paymentMonth),
              isActive: true,
              isDueCollection: false,
            },
          });
          if (existing) {
            throw new ConflictException(
              `A payment for ${item.paymentMonth} already exists for this student`,
            );
          }
        }
      }
    }

    // Invoice mode
    const invoiceModeSetting = await this.prisma.orgSettings.findUnique({
      where: {
        organization_settingKey: {
          organization: org,
          settingKey: 'invoice_mode',
        },
      },
    });
    const invoiceMode = (invoiceModeSetting?.settingValue as string) ?? 'dual';

    // Guardian amount per line item
    const additionalDiscount = dto.additionalDiscount ?? 0;
    const dueAmount = dto.dueAmount ?? 0;

    const lineItemsWithGuardian = dto.lineItems.map((item) => {
      let guardianAmount: number;
      if (invoiceMode === 'unified') {
        guardianAmount = item.amount;
      } else if (!config.hasPaymentType) {
        // MEC: all tuition — guardian = stored monthly fee
        guardianAmount = (student.monthlyTuitionFee as number | null) ?? item.amount;
      } else if (item.paymentType === 'tuition') {
        guardianAmount = (student.monthlyTuitionFee as number | null) ?? item.amount;
      } else if (item.paymentType === 'admission') {
        guardianAmount = (student.admissionFee as number | null) ?? item.amount;
      } else if (item.paymentType === 'readmission') {
        guardianAmount = (student.readmissionFee as number | null) ?? item.amount;
      } else {
        guardianAmount = item.amount;
      }
      return { ...item, guardianAmount };
    });

    const officeSubTotal = dto.lineItems.reduce((s, i) => s + i.amount, 0);
    const guardianSubTotal = lineItemsWithGuardian.reduce(
      (s, i) => s + i.guardianAmount,
      0,
    );
    const officeGrandTotal = round2(officeSubTotal - additionalDiscount);
    const guardianGrandTotal = round2(guardianSubTotal - additionalDiscount);

    if (dueAmount > officeGrandTotal) {
      throw new BadRequestException(
        `dueAmount (${dueAmount}) cannot exceed the total payable amount (${officeGrandTotal})`,
      );
    }

    const officePaid = round2(officeGrandTotal - dueAmount);
    const guardianPaid = round2(guardianGrandTotal - dueAmount);

    const invoiceNumber =
      await this.invoiceService.generateInvoiceNumber(org);

    return this.prisma.$transaction(async (tx: any) => {
      const payments = await Promise.all(
        lineItemsWithGuardian.map((item) => {
          const data: Record<string, unknown> = {
            studentId: dto.studentId,
            amount: item.amount,
            paymentMonth: new Date(item.paymentMonth),
            paymentDate: new Date(dto.paymentDate),
            paymentMethod: dto.paymentMethod as PaymentMethod,
            notes: item.notes,
            invoiceNumber,
            createdBy,
            // Dual invoice fields
            guardianAmount: item.guardianAmount,
            officeSubTotal,
            guardianSubTotal,
            additionalDiscount,
            officeGrandTotal,
            guardianGrandTotal,
            officePaid,
            guardianPaid,
            dueAmount,
          };
          if (config.hasPaymentType && item.paymentType) {
            data.paymentType = item.paymentType;
          }
          return this.txPaymentModel(tx, org).create({
            data,
            include: { student: { select: config.studentSelectBasic } },
          });
        }),
      );
      return { invoiceNumber, payments };
    });
  }

  // ─── getDueProfile ────────────────────────────────────────────────────────────

  async getDueProfile(org: OrgType, studentId: string) {
    if (org === 'mec') return this.getDueProfileMec(studentId);

    const priorityOrder = await this.getPaymentPriority(org);
    const model = this.paymentModel(org);

    const originalPayments = await model.findMany({
      where: {
        studentId,
        isDueCollection: false,
        isActive: true,
        dueAmount: { gt: 0 },
      },
      orderBy: { paymentDate: 'asc' },
    });

    const invoiceMap = new Map<string, any[]>();
    for (const p of originalPayments) {
      if (!invoiceMap.has(p.invoiceNumber)) invoiceMap.set(p.invoiceNumber, []);
      invoiceMap.get(p.invoiceNumber)!.push(p);
    }

    const profiles: object[] = [];
    for (const [invoiceNumber, rows] of invoiceMap.entries()) {
      const originalTotalDue = rows[0].dueAmount ?? 0;
      const originalOfficePaid = rows[0].officePaid ?? 0;

      const priorCollections = await model.findMany({
        where: {
          parentInvoiceNumber: invoiceNumber,
          isDueCollection: true,
          isActive: true,
        },
      });

      const seenCollectionInvoices = new Set<string>();
      let priorCollectedTotal = 0;
      for (const pc of priorCollections) {
        if (!seenCollectionInvoices.has(pc.invoiceNumber)) {
          seenCollectionInvoices.add(pc.invoiceNumber);
          priorCollectedTotal += pc.officePaid ?? 0;
        }
      }

      const remainingDue = Math.max(0, originalTotalDue - priorCollectedTotal);
      if (remainingDue <= 0) continue;

      const lineItems = rows.map((r: any) => ({
        paymentType: r.paymentType,
        amount: r.amount,
      }));
      const totalPaidSoFar = originalOfficePaid + priorCollectedTotal;
      const allocated = allocatePaid(lineItems, totalPaidSoFar, priorityOrder);
      const perItemDues = allocated
        .filter((i) => i.dueAmount > 0)
        .map((i) => ({
          paymentType: i.paymentType,
          originalAmount: i.amount,
          paidSoFar: i.paidAmount,
          remainingDue: i.dueAmount,
        }));

      profiles.push({
        invoiceNumber,
        paymentDate: rows[0].paymentDate,
        originalTotalDue,
        priorCollectedTotal,
        remainingDue,
        perItemDues,
      });
    }

    return { studentId, profiles };
  }

  private async getDueProfileMec(studentId: string) {
    const originalPayments = await this.prisma.mecPayment.findMany({
      where: {
        studentId,
        isDueCollection: false,
        isActive: true,
        dueAmount: { gt: 0 },
      },
      orderBy: { paymentDate: 'asc' },
    });

    const invoiceMap = new Map<string, typeof originalPayments>();
    for (const p of originalPayments) {
      if (!invoiceMap.has(p.invoiceNumber)) invoiceMap.set(p.invoiceNumber, []);
      invoiceMap.get(p.invoiceNumber)!.push(p);
    }

    const profiles: object[] = [];
    for (const [invoiceNumber, rows] of invoiceMap.entries()) {
      const originalTotalDue = rows[0].dueAmount ?? 0;

      const priorCollections = await this.prisma.mecPayment.findMany({
        where: {
          parentInvoiceNumber: invoiceNumber,
          isDueCollection: true,
          isActive: true,
        },
      });

      const seenCollectionInvoices = new Set<string>();
      let priorCollectedTotal = 0;
      for (const pc of priorCollections) {
        if (!seenCollectionInvoices.has(pc.invoiceNumber)) {
          seenCollectionInvoices.add(pc.invoiceNumber);
          priorCollectedTotal += pc.officePaid ?? 0;
        }
      }

      const remainingDue = Math.max(0, originalTotalDue - priorCollectedTotal);
      if (remainingDue <= 0) continue;

      profiles.push({
        invoiceNumber,
        paymentDate: rows[0].paymentDate,
        originalTotalDue,
        priorCollectedTotal,
        remainingDue,
        perItemDues: [
          {
            paymentType: 'tuition',
            originalAmount: rows.reduce((s, r) => s + r.amount, 0),
            paidSoFar: (rows[0].officePaid ?? 0) + priorCollectedTotal,
            remainingDue,
          },
        ],
      });
    }

    return { studentId, profiles };
  }

  // ─── collectDue ──────────────────────────────────────────────────────────────

  async collectDue(org: OrgType, dto: CollectDueInput, createdBy: string) {
    if (org === 'mec') return this.collectDueMec(dto, createdBy);

    const config = ORG_CONFIG[org];
    const priorityOrder = await this.getPaymentPriority(org);
    const model = this.paymentModel(org);

    const originalRows = await model.findMany({
      where: {
        invoiceNumber: dto.parentInvoiceNumber,
        isDueCollection: false,
        isActive: true,
      },
      include: { student: { select: config.studentSelectBasic } },
    });

    if (!originalRows.length) {
      throw new NotFoundException(
        `Invoice ${dto.parentInvoiceNumber} not found`,
      );
    }

    const originalTotalDue = originalRows[0].dueAmount ?? 0;
    const originalOfficePaid = originalRows[0].officePaid ?? 0;

    if (originalTotalDue <= 0) {
      throw new BadRequestException(
        `Invoice ${dto.parentInvoiceNumber} has no outstanding due`,
      );
    }

    const priorCollections = await model.findMany({
      where: {
        parentInvoiceNumber: dto.parentInvoiceNumber,
        isDueCollection: true,
        isActive: true,
      },
    });

    const seenCollectionInvoices = new Set<string>();
    let priorCollectedTotal = 0;
    for (const pc of priorCollections) {
      if (!seenCollectionInvoices.has(pc.invoiceNumber)) {
        seenCollectionInvoices.add(pc.invoiceNumber);
        priorCollectedTotal += pc.officePaid ?? 0;
      }
    }

    const remainingDue = round2(
      Math.max(0, originalTotalDue - priorCollectedTotal),
    );
    if (remainingDue <= 0) {
      throw new BadRequestException(
        `Invoice ${dto.parentInvoiceNumber} has no remaining due`,
      );
    }

    if (dto.paidAmount > remainingDue) {
      throw new BadRequestException(
        `Payment amount exceeds remaining due of ${remainingDue}`,
      );
    }

    const lineItems: {
      paymentType: string;
      amount: number;
      paymentMonth: Date;
      studentId: string;
    }[] = originalRows.map((r: any) => ({
      paymentType: r.paymentType as string,
      amount: r.amount as number,
      paymentMonth: r.paymentMonth as Date,
      studentId: r.studentId as string,
    }));
    const totalPaidSoFar = originalOfficePaid + priorCollectedTotal;
    const existingAllocation = allocatePaid(
      lineItems,
      totalPaidSoFar,
      priorityOrder,
    );
    const dueItemsNow = existingAllocation
      .filter((i) => i.dueAmount > 0)
      .map((i) => ({
        paymentType: i.paymentType,
        amount: i.dueAmount,
        paymentMonth: i.paymentMonth,
        studentId: i.studentId,
      }));

    const newAllocation = allocatePaid(dueItemsNow, dto.paidAmount, priorityOrder);
    const itemsToPay = newAllocation.filter((i) => i.paidAmount > 0);

    const newDueAmount = round2(Math.max(0, remainingDue - dto.paidAmount));
    const officeGrandTotal = remainingDue;
    const guardianGrandTotal = remainingDue;
    const officePaid = dto.paidAmount;
    const guardianPaid = dto.paidAmount;

    const newInvoiceNumber =
      await this.invoiceService.generateInvoiceNumber(org);

    return this.prisma.$transaction(async (tx: any) => {
      const payments = await Promise.all(
        itemsToPay.map((item) =>
          this.txPaymentModel(tx, org).create({
            data: {
              studentId: item.studentId,
              paymentType: item.paymentType,
              amount: item.paidAmount,
              paymentMonth: item.paymentMonth,
              paymentDate: new Date(dto.paymentDate),
              paymentMethod: dto.paymentMethod as PaymentMethod,
              notes: dto.notes,
              invoiceNumber: newInvoiceNumber,
              createdBy,
              isDueCollection: true,
              parentInvoiceNumber: dto.parentInvoiceNumber,
              guardianAmount: item.paidAmount,
              officeSubTotal: officeGrandTotal,
              guardianSubTotal: guardianGrandTotal,
              additionalDiscount: 0,
              officeGrandTotal,
              guardianGrandTotal,
              officePaid,
              guardianPaid,
              dueAmount: newDueAmount,
            },
            include: { student: { select: config.studentSelectBasic } },
          }),
        ),
      );
      return { invoiceNumber: newInvoiceNumber, payments, remainingDue: newDueAmount };
    });
  }

  private async collectDueMec(dto: CollectDueInput, createdBy: string) {
    const originalRows = await this.prisma.mecPayment.findMany({
      where: {
        invoiceNumber: dto.parentInvoiceNumber,
        isDueCollection: false,
        isActive: true,
      },
      include: { student: { select: { id: true, name: true, class: true } } },
    });

    if (!originalRows.length) {
      throw new NotFoundException(
        `Invoice ${dto.parentInvoiceNumber} not found`,
      );
    }

    const originalTotalDue = originalRows[0].dueAmount ?? 0;

    if (originalTotalDue <= 0) {
      throw new BadRequestException(
        `Invoice ${dto.parentInvoiceNumber} has no outstanding due`,
      );
    }

    const priorCollections = await this.prisma.mecPayment.findMany({
      where: {
        parentInvoiceNumber: dto.parentInvoiceNumber,
        isDueCollection: true,
        isActive: true,
      },
    });

    const seenCollectionInvoices = new Set<string>();
    let priorCollectedTotal = 0;
    for (const pc of priorCollections) {
      if (!seenCollectionInvoices.has(pc.invoiceNumber)) {
        seenCollectionInvoices.add(pc.invoiceNumber);
        priorCollectedTotal += pc.officePaid ?? 0;
      }
    }

    const remainingDue = round2(
      Math.max(0, originalTotalDue - priorCollectedTotal),
    );
    if (remainingDue <= 0) {
      throw new BadRequestException(
        `Invoice ${dto.parentInvoiceNumber} has no remaining due`,
      );
    }

    if (dto.paidAmount > remainingDue) {
      throw new BadRequestException(
        `Payment amount exceeds remaining due of ${remainingDue}`,
      );
    }

    const newDueAmount = round2(Math.max(0, remainingDue - dto.paidAmount));
    const officeGrandTotal = remainingDue;
    const guardianGrandTotal = remainingDue;
    const officePaid = dto.paidAmount;
    const guardianPaid = dto.paidAmount;

    // Distribute paid amount across months with outstanding dues
    const originalOfficePaid = originalRows[0].officePaid ?? 0;
    const totalPaidSoFar = originalOfficePaid + priorCollectedTotal;
    let allocRemaining = totalPaidSoFar;
    const perMonthDue: {
      paymentMonth: Date;
      studentId: string;
      dueAmount: number;
    }[] = [];
    for (const row of originalRows) {
      const paid = Math.min(allocRemaining, row.amount);
      allocRemaining -= paid;
      const due = row.amount - paid;
      if (due > 0) {
        perMonthDue.push({
          paymentMonth: row.paymentMonth,
          studentId: row.studentId,
          dueAmount: due,
        });
      }
    }
    let toPay = dto.paidAmount;
    const itemsToPay: {
      paymentMonth: Date;
      studentId: string;
      paidAmount: number;
    }[] = [];
    for (const d of perMonthDue) {
      const paid = Math.min(toPay, d.dueAmount);
      toPay -= paid;
      if (paid > 0) {
        itemsToPay.push({
          paymentMonth: d.paymentMonth,
          studentId: d.studentId,
          paidAmount: paid,
        });
      }
    }

    const newInvoiceNumber =
      await this.invoiceService.generateInvoiceNumber('mec');

    return this.prisma.$transaction(async (tx: any) => {
      const payments = await Promise.all(
        itemsToPay.map((item) =>
          tx.mecPayment.create({
            data: {
              studentId: item.studentId,
              amount: item.paidAmount,
              paymentMonth: item.paymentMonth,
              paymentDate: new Date(dto.paymentDate),
              paymentMethod: dto.paymentMethod as PaymentMethod,
              notes: dto.notes,
              invoiceNumber: newInvoiceNumber,
              createdBy,
              isDueCollection: true,
              parentInvoiceNumber: dto.parentInvoiceNumber,
              guardianAmount: item.paidAmount,
              officeSubTotal: officeGrandTotal,
              guardianSubTotal: guardianGrandTotal,
              additionalDiscount: 0,
              officeGrandTotal,
              guardianGrandTotal,
              officePaid,
              guardianPaid,
              dueAmount: newDueAmount,
            },
            include: { student: { select: { id: true, name: true, class: true } } },
          }),
        ),
      );
      return { invoiceNumber: newInvoiceNumber, payments, remainingDue: newDueAmount };
    });
  }

  // ─── findByInvoice ────────────────────────────────────────────────────────────

  async findByInvoice(org: OrgType, invoiceNumber: string) {
    const config = ORG_CONFIG[org];
    const payments = await this.paymentModel(org).findMany({
      where: { invoiceNumber, isActive: true },
      include: { student: { select: config.studentSelectFull } },
      orderBy: { paymentMonth: 'asc' },
    });
    if (!payments.length) {
      throw new NotFoundException(
        `No payments found for invoice ${invoiceNumber}`,
      );
    }
    return payments;
  }

  // ─── getDueSummary ────────────────────────────────────────────────────────────

  async getDueSummary(org: OrgType, studentId: string) {
    if (org === 'mec') return this.getDueSummaryMec(studentId);

    const config = ORG_CONFIG[org];
    const priorityOrder = await this.getPaymentPriority(org);
    const model = this.paymentModel(org);

    const payments: any[] = await model.findMany({
      where: { studentId, isActive: true, isDueCollection: false },
      orderBy: { paymentDate: 'asc' },
    });

    const byInvoice = new Map<string, any[]>();
    for (const p of payments) {
      if (!byInvoice.has(p.invoiceNumber)) byInvoice.set(p.invoiceNumber, []);
      byInvoice.get(p.invoiceNumber)!.push(p);
    }

    const dues: Record<string, number> = {};

    for (const [invoiceNumber, rows] of byInvoice) {
      const originalTotalDue = rows[0].dueAmount ?? 0;
      if (originalTotalDue <= 0) continue;

      const originalOfficePaid = rows[0].officePaid ?? 0;

      const priorCollections = await model.findMany({
        where: {
          parentInvoiceNumber: invoiceNumber,
          isDueCollection: true,
          isActive: true,
        },
      });
      const seen = new Set<string>();
      let priorCollectedTotal = 0;
      for (const pc of priorCollections) {
        if (!seen.has(pc.invoiceNumber)) {
          seen.add(pc.invoiceNumber);
          priorCollectedTotal += pc.officePaid ?? 0;
        }
      }

      const remainingDue = Math.max(0, originalTotalDue - priorCollectedTotal);
      if (remainingDue <= 0) continue;

      const lineItems = rows.map((r: any) => ({
        paymentType: r.paymentType,
        amount: r.amount,
      }));
      const totalPaidSoFar = originalOfficePaid + priorCollectedTotal;
      const allocated = allocatePaid(lineItems, totalPaidSoFar, priorityOrder);

      for (const a of allocated) {
        if (a.dueAmount > 0) {
          dues[a.paymentType] = (dues[a.paymentType] ?? 0) + a.dueAmount;
        }
      }
    }

    const hasType = (type: string) =>
      payments.some((p: any) => p.paymentType === type);
    const hasOthers = () =>
      payments.some((p: any) => config.othersTypes.includes(p.paymentType));

    const othersDue = config.othersTypes.reduce(
      (sum, t) => sum + (dues[t] ?? 0),
      0,
    );
    let tuitionDue = dues['tuition'] ?? 0;
    let admissionDue = dues['admission'] ?? 0;
    let readmissionDue = dues['readmission'] ?? 0;
    let lateFeeDue = dues['late_fee'] ?? 0;

    const student = await this.studentModel(org).findUnique({
      where: { id: studentId },
      select: {
        monthlyTuitionFee: true,
        admissionFee: true,
        readmissionFee: true,
        discountTuition: true,
        discountAdmission: true,
        discountReadmission: true,
        admissionDate: true,
        associationEndDate: true,
      },
    });

    if (student) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      let endMonth = currentMonth;
      if (student.associationEndDate) {
        const endDate = new Date(student.associationEndDate);
        const endYear = endDate.getFullYear();
        const endMo = endDate.getMonth() + 1;
        if (endYear < currentYear) {
          endMonth = 0;
        } else if (endYear === currentYear) {
          endMonth = Math.min(endMo, currentMonth);
        }
      }

      let startMonth = 1;
      if (student.admissionDate) {
        const admYear = new Date(student.admissionDate).getFullYear();
        const admMonth = new Date(student.admissionDate).getMonth() + 1;
        if (admYear > currentYear) {
          startMonth = currentMonth + 1;
        } else if (admYear === currentYear && config.tuitionStartFromAdmission) {
          startMonth = admMonth; // UAC: use actual admission month
        }
        // MBCS: startMonth stays 1 regardless of admission date
      }

      const paidTuitionMonthKeys = new Set(
        payments
          .filter((p: any) => p.paymentType === 'tuition')
          .map((p: any) => {
            const d = new Date(p.paymentMonth);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          }),
      );

      let unpaidMonthCount = 0;
      for (let m = startMonth; m <= endMonth; m++) {
        const key = `${currentYear}-${String(m).padStart(2, '0')}`;
        if (!paidTuitionMonthKeys.has(key)) unpaidMonthCount++;
      }
      tuitionDue +=
        unpaidMonthCount *
        Math.max(
          0,
          ((student.monthlyTuitionFee as number | null) ?? 0) -
            ((student.discountTuition as number | null) ?? 0),
        );

      if (!hasType('admission') && ((student.admissionFee as number | null) ?? 0) > 0) {
        admissionDue += Math.max(
          0,
          (student.admissionFee as number) -
            ((student.discountAdmission as number | null) ?? 0),
        );
      }

      if (
        !hasType('readmission') &&
        ((student.readmissionFee as number | null) ?? 0) > 0
      ) {
        readmissionDue += Math.max(
          0,
          (student.readmissionFee as number) -
            ((student.discountReadmission as number | null) ?? 0),
        );
      }

      // Late fee (MBCS only)
      if (config.hasLateFee) {
        const lateFeeSettings = await this.prisma.orgSettings.findMany({
          where: {
            organization: org,
            settingKey: { in: ['late_fee_amount', 'late_fee_day_threshold'] },
          },
        });
        const lateFeeSettingMap = new Map<string, number>();
        for (const s of lateFeeSettings) {
          const val = (s.settingValue as { value?: number } | null)?.value;
          if (val != null) lateFeeSettingMap.set(s.settingKey, val);
        }
        const lateFeeAmount = lateFeeSettingMap.get('late_fee_amount') ?? 0;
        const lateFeeThreshold =
          lateFeeSettingMap.get('late_fee_day_threshold') ?? 15;

        if (lateFeeAmount > 0) {
          const paidLateFeeMonthKeys = new Set(
            payments
              .filter((p: any) => p.paymentType === 'late_fee')
              .map((p: any) => {
                const d = new Date(p.paymentMonth);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              }),
          );
          for (let m = startMonth; m <= endMonth; m++) {
            const key = `${currentYear}-${String(m).padStart(2, '0')}`;
            if (
              !paidTuitionMonthKeys.has(key) &&
              !paidLateFeeMonthKeys.has(key)
            ) {
              const thresholdDate = new Date(
                currentYear,
                m - 1,
                lateFeeThreshold,
              );
              if (now > thresholdDate) {
                lateFeeDue += lateFeeAmount;
              }
            }
          }
        }
      }
    }

    let totalDue = tuitionDue + admissionDue + readmissionDue + othersDue;
    const breakdown: Record<string, { due: number; status: string }> = {
      tuition: { due: tuitionDue, status: tuitionDue > 0 ? 'due' : 'paid' },
    };

    if (config.hasLateFee) {
      totalDue += lateFeeDue;
      breakdown.late_fee = {
        due: lateFeeDue,
        status: lateFeeDue > 0 ? 'due' : hasType('late_fee') ? 'paid' : 'na',
      };
    }

    breakdown.admission = {
      due: admissionDue,
      status:
        admissionDue > 0 ? 'due' : hasType('admission') ? 'paid' : 'na',
    };
    breakdown.readmission = {
      due: readmissionDue,
      status:
        readmissionDue > 0 ? 'due' : hasType('readmission') ? 'paid' : 'na',
    };
    breakdown.others = {
      due: othersDue,
      status: othersDue > 0 ? 'due' : hasOthers() ? 'paid' : 'na',
    };

    return { studentId, totalDue, breakdown };
  }

  private async getDueSummaryMec(studentId: string) {
    const payments = await this.prisma.mecPayment.findMany({
      where: { studentId, isActive: true, isDueCollection: false },
      orderBy: { paymentDate: 'asc' },
    });

    const byInvoice = new Map<string, typeof payments>();
    for (const p of payments) {
      if (!byInvoice.has(p.invoiceNumber)) byInvoice.set(p.invoiceNumber, []);
      byInvoice.get(p.invoiceNumber)!.push(p);
    }

    let tuitionDue = 0;

    for (const [invoiceNumber, rows] of byInvoice) {
      const originalTotalDue = rows[0].dueAmount ?? 0;
      if (originalTotalDue <= 0) continue;

      const originalOfficePaid = rows[0].officePaid ?? 0;

      const priorCollections = await this.prisma.mecPayment.findMany({
        where: {
          parentInvoiceNumber: invoiceNumber,
          isDueCollection: true,
          isActive: true,
        },
      });
      const seen = new Set<string>();
      let priorCollectedTotal = 0;
      for (const pc of priorCollections) {
        if (!seen.has(pc.invoiceNumber)) {
          seen.add(pc.invoiceNumber);
          priorCollectedTotal += pc.officePaid ?? 0;
        }
      }

      const remainingDue = Math.max(0, originalTotalDue - priorCollectedTotal);
      if (remainingDue > 0) {
        const invoiceTotal = rows.reduce((sum, r) => sum + r.amount, 0);
        const totalPaidSoFar = originalOfficePaid + priorCollectedTotal;
        tuitionDue += Math.max(0, invoiceTotal - totalPaidSoFar);
      }
    }

    return {
      studentId,
      totalDue: tuitionDue,
      breakdown: {
        tuition: {
          due: tuitionDue,
          status: tuitionDue > 0 ? 'due' : 'paid',
        },
      },
    };
  }

  // ─── getStudentPaymentSummary ─────────────────────────────────────────────────

  async getStudentPaymentSummary(org: OrgType, studentId: string) {
    const payments = await this.paymentModel(org).findMany({
      where: { studentId, isActive: true },
      orderBy: { paymentDate: 'desc' },
    });

    const total = payments.reduce(
      (sum: number, p: any) => sum + p.amount,
      0,
    );

    return {
      studentId,
      totalPaid: total,
      paymentCount: payments.length,
      payments,
    };
  }
}
