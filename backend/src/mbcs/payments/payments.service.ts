import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceService } from '../../common/services/invoice.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { FilterPaymentDto } from './dto/filter-payment.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateMbcsMultiPaymentDto } from './dto/create-multi-payment.dto';
import { CollectMbcsDueDto } from './dto/collect-due.dto';

const MBCS_PRIORITY_ORDER = [
  { group: 'tuition', types: ['tuition'] },
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
];

const MBCS_OTHERS_TYPES = [
  'exam',
  'session_charge',
  'study_materials',
  'study_tour',
  'stationary',
  'other',
];

function buildPriorityOrder(
  order: string[],
  othersTypes: string[],
): { group: string; types: string[] }[] {
  return order.map((group) => {
    if (group === 'others') {
      return { group: 'others', types: othersTypes };
    }
    return { group, types: [group] };
  });
}

function allocatePaid(
  lineItems: { paymentType: string; amount: number }[],
  totalPaid: number,
  priorityOrder: { group: string; types: string[] }[],
) {
  const result: {
    paymentType: string;
    amount: number;
    paidAmount: number;
    dueAmount: number;
  }[] = [];
  let remaining = totalPaid;

  for (const pg of priorityOrder) {
    const items = lineItems.filter((i) => pg.types.includes(i.paymentType));
    for (const item of items) {
      if (remaining >= item.amount) {
        result.push({ ...item, paidAmount: item.amount, dueAmount: 0 });
        remaining -= item.amount;
      } else {
        result.push({
          ...item,
          paidAmount: remaining,
          dueAmount: item.amount - remaining,
        });
        remaining = 0;
      }
    }
  }
  return result;
}

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private invoiceService: InvoiceService,
  ) {}

  async create(createPaymentDto: CreatePaymentDto, createdBy: string) {
    // Verify student exists
    const student = await this.prisma.mbcsStudent.findUnique({
      where: { id: createPaymentDto.studentId },
    });

    if (!student) {
      throw new NotFoundException(
        `Student with ID ${createPaymentDto.studentId} not found`,
      );
    }

    // Generate invoice number using shared counter → MBCS/2026/XXXX
    const invoiceNumber =
      await this.invoiceService.generateInvoiceNumber('mbcs');

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.mbcsPayment.create({
        data: {
          ...createPaymentDto,
          invoiceNumber,
          createdBy,
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              class: true,
              shift: true,
            },
          },
        },
      });

      return payment;
    });
  }

  async findAll(filters?: FilterPaymentDto, pagination?: PaginationDto) {
    const where: Prisma.MbcsPaymentWhereInput = { isActive: true };

    if (filters?.studentId) {
      where.studentId = filters.studentId;
    }

    if (filters?.paymentType) {
      where.paymentType = filters.paymentType;
    }

    if (filters?.paymentMonth) {
      where.paymentMonth = new Date(filters.paymentMonth);
    }

    if (filters?.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.mbcsPayment.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              class: true,
              shift: true,
              contactNumber: true,
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.mbcsPayment.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const payment = await this.prisma.mbcsPayment.findFirst({
      where: { id, isActive: true },
      include: { student: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto) {
    await this.findOne(id);

    return this.prisma.mbcsPayment.update({
      where: { id },
      data: updatePaymentDto,
      include: {
        student: {
          select: { id: true, name: true, class: true, shift: true },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.mbcsPayment.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async createMulti(dto: CreateMbcsMultiPaymentDto, createdBy: string) {
    const student = await this.prisma.mbcsStudent.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) {
      throw new NotFoundException(`Student with ID ${dto.studentId} not found`);
    }

    // Check for duplicate tuition payments (skip for due collections)
    for (const item of dto.lineItems) {
      if (item.paymentType === 'tuition' && item.paymentMonth) {
        const existing = await this.prisma.mbcsPayment.findFirst({
          where: {
            studentId: dto.studentId,
            paymentType: 'tuition',
            paymentMonth: new Date(item.paymentMonth),
            isActive: true,
            isDueCollection: false,
          },
        });
        if (existing) {
          throw new ConflictException(
            `Tuition payment for ${item.paymentMonth} already exists for this student`,
          );
        }
      }
    }

    // Determine invoice mode (dual vs unified)
    const invoiceModeSetting = await this.prisma.orgSettings.findUnique({
      where: {
        organization_settingKey: {
          organization: 'mbcs',
          settingKey: 'invoice_mode',
        },
      },
    });
    const invoiceMode = (invoiceModeSetting?.settingValue as string) ?? 'dual';

    // Compute dual-invoice amounts
    const additionalDiscount = dto.additionalDiscount ?? 0;
    const dueAmount = dto.dueAmount ?? 0;

    const lineItemsWithGuardian = dto.lineItems.map((item) => {
      let guardianAmount: number;
      if (invoiceMode === 'unified') {
        guardianAmount = item.amount;
      } else if (item.paymentType === 'tuition') {
        guardianAmount = student.monthlyTuitionFee ?? item.amount;
      } else if (item.paymentType === 'admission') {
        guardianAmount = student.admissionFee ?? item.amount;
      } else if (item.paymentType === 'readmission') {
        guardianAmount = student.readmissionFee ?? item.amount;
      } else {
        guardianAmount = item.amount; // non-discountable types
      }
      return { ...item, guardianAmount };
    });

    const officeSubTotal = dto.lineItems.reduce((s, i) => s + i.amount, 0);
    const guardianSubTotal = lineItemsWithGuardian.reduce(
      (s, i) => s + i.guardianAmount,
      0,
    );
    const officeGrandTotal = officeSubTotal - additionalDiscount;
    const guardianGrandTotal = guardianSubTotal - additionalDiscount;
    const officePaid = officeGrandTotal - dueAmount;
    const guardianPaid = guardianGrandTotal - dueAmount;

    const invoiceNumber =
      await this.invoiceService.generateInvoiceNumber('mbcs');

    return this.prisma.$transaction(async (tx) => {
      const payments = await Promise.all(
        lineItemsWithGuardian.map((item) =>
          tx.mbcsPayment.create({
            data: {
              studentId: dto.studentId,
              paymentType: item.paymentType,
              amount: item.amount,
              paymentMonth: new Date(item.paymentMonth),
              paymentDate: new Date(dto.paymentDate),
              paymentMethod: dto.paymentMethod,
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
            },
            include: {
              student: {
                select: { id: true, name: true, class: true, shift: true },
              },
            },
          }),
        ),
      );
      return { invoiceNumber, payments };
    });
  }

  /**
   * Get due profile for a student — all outstanding invoices with per-type remaining dues
   */
  async getDueProfile(studentId: string) {
    // Load priority order from settings (falls back to default)
    const priorityOrder = await this.getPaymentPriority();

    const originalPayments = await this.prisma.mbcsPayment.findMany({
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
      if (!invoiceMap.has(p.invoiceNumber)) {
        invoiceMap.set(p.invoiceNumber, []);
      }
      invoiceMap.get(p.invoiceNumber)!.push(p);
    }

    const profiles: object[] = [];
    for (const [invoiceNumber, rows] of invoiceMap.entries()) {
      const originalTotalDue = rows[0].dueAmount ?? 0;
      const originalOfficePaid = rows[0].officePaid ?? 0;

      const priorCollections = await this.prisma.mbcsPayment.findMany({
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

      const lineItems = rows.map((r) => ({
        paymentType: r.paymentType,
        amount: r.amount,
      }));
      const totalPaidSoFar = originalOfficePaid + priorCollectedTotal;
      const allocated = allocatePaid(
        lineItems,
        totalPaidSoFar,
        priorityOrder,
      );
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

  /**
   * Record a due collection against an existing invoice (Feature 6B)
   */
  async collectDue(dto: CollectMbcsDueDto, createdBy: string) {
    // Load priority order from settings (falls back to default)
    const priorityOrder = await this.getPaymentPriority();

    const originalRows = await this.prisma.mbcsPayment.findMany({
      where: {
        invoiceNumber: dto.parentInvoiceNumber,
        isDueCollection: false,
        isActive: true,
      },
      include: {
        student: {
          select: { id: true, name: true, class: true, shift: true },
        },
      },
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

    const priorCollections = await this.prisma.mbcsPayment.findMany({
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

    const remainingDue = Math.max(0, originalTotalDue - priorCollectedTotal);
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

    const lineItems = originalRows.map((r) => ({
      paymentType: r.paymentType,
      amount: r.amount,
    }));
    const totalPaidSoFar = originalOfficePaid + priorCollectedTotal;
    const existingAllocation = allocatePaid(
      lineItems,
      totalPaidSoFar,
      priorityOrder,
    );
    const dueItemsNow = existingAllocation
      .filter((i) => i.dueAmount > 0)
      .map((i) => ({ paymentType: i.paymentType, amount: i.dueAmount }));

    const newAllocation = allocatePaid(
      dueItemsNow,
      dto.paidAmount,
      priorityOrder,
    );
    const itemsToPay = newAllocation.filter((i) => i.paidAmount > 0);

    const newDueAmount = Math.max(0, remainingDue - dto.paidAmount);
    const officeGrandTotal = remainingDue;
    const guardianGrandTotal = remainingDue;
    const officePaid = dto.paidAmount;
    const guardianPaid = dto.paidAmount;

    const newInvoiceNumber =
      await this.invoiceService.generateInvoiceNumber('mbcs');

    return this.prisma.$transaction(async (tx) => {
      const payments = await Promise.all(
        itemsToPay.map((item) => {
          const originalRow = originalRows.find(
            (r) => r.paymentType === item.paymentType,
          )!;
          return tx.mbcsPayment.create({
            data: {
              studentId: originalRow.studentId,
              paymentType: item.paymentType,
              amount: item.paidAmount,
              paymentMonth: originalRow.paymentMonth,
              paymentDate: new Date(dto.paymentDate),
              paymentMethod: dto.paymentMethod,
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
            include: {
              student: {
                select: { id: true, name: true, class: true, shift: true },
              },
            },
          });
        }),
      );
      return {
        invoiceNumber: newInvoiceNumber,
        payments,
        remainingDue: newDueAmount,
      };
    });
  }

  async findByInvoice(invoiceNumber: string) {
    const payments = await this.prisma.mbcsPayment.findMany({
      where: { invoiceNumber, isActive: true },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            class: true,
            shift: true,
            contactNumber: true,
          },
        },
      },
      orderBy: { paymentMonth: 'asc' },
    });
    if (!payments.length) {
      throw new NotFoundException(
        `No payments found for invoice ${invoiceNumber}`,
      );
    }
    return payments;
  }

  /**
   * Load payment priority order from OrgSettings (falls back to default if not set)
   */
  private async getPaymentPriority(): Promise<{ group: string; types: string[] }[]> {
    try {
      const setting = await this.prisma.orgSettings.findUnique({
        where: { organization_settingKey: { organization: 'mbcs', settingKey: 'payment_priority' } },
      });
      if (setting?.settingValue) {
        const raw =
          typeof setting.settingValue === 'string'
            ? JSON.parse(setting.settingValue as string)
            : setting.settingValue;
        if (Array.isArray(raw?.order)) {
          return buildPriorityOrder(raw.order as string[], MBCS_OTHERS_TYPES);
        }
      }
    } catch {
      // fall through to default
    }
    return MBCS_PRIORITY_ORDER;
  }

  async getStudentPaymentSummary(studentId: string) {
    const payments = await this.prisma.mbcsPayment.findMany({
      where: { studentId, isActive: true },
      orderBy: { paymentDate: 'desc' },
    });

    const total = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      studentId,
      totalPaid: total,
      paymentCount: payments.length,
      payments,
    };
  }
}
