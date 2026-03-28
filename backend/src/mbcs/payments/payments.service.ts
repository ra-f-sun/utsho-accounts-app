import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, MbcsPaymentType, PaymentMethod } from '@prisma/client';
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

function allocatePaid<T extends { paymentType: string; amount: number }>(
  lineItems: T[],
  totalPaid: number,
  priorityOrder: { group: string; types: string[] }[],
): (T & { paidAmount: number; dueAmount: number })[] {
  const result: (T & { paidAmount: number; dueAmount: number })[] = [];
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

  // Handle items not matched by any priority group (catch-all)
  const matchedTypes = new Set(result.map((r) => r.paymentType));
  const unmatched = lineItems.filter((i) => !matchedTypes.has(i.paymentType));
  for (const item of unmatched) {
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
          paymentType: createPaymentDto.paymentType as MbcsPaymentType,
          paymentMethod: createPaymentDto.paymentMethod as PaymentMethod,
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
      where.paymentType = filters.paymentType as MbcsPaymentType;
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

    // Paginate by unique invoiceNumbers so grouped invoices stay intact
    const [invoicePage, allInvoices] = await Promise.all([
      this.prisma.mbcsPayment.findMany({
        where,
        select: { invoiceNumber: true },
        distinct: ['invoiceNumber'],
        orderBy: { paymentDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.mbcsPayment.findMany({
        where,
        select: { invoiceNumber: true },
        distinct: ['invoiceNumber'],
      }),
    ]);

    const invoiceNumbers = invoicePage.map((p) => p.invoiceNumber);
    const total = allInvoices.length;

    const data =
      invoiceNumbers.length > 0
        ? await this.prisma.mbcsPayment.findMany({
            where: {
              invoiceNumber: { in: invoiceNumbers },
              isActive: true,
            },
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
          })
        : [];

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

    const { paymentType, paymentMethod, ...rest } = updatePaymentDto;
    const data: Prisma.MbcsPaymentUpdateInput = {
      ...rest,
      ...(paymentType && { paymentType: paymentType as MbcsPaymentType }),
      ...(paymentMethod && { paymentMethod: paymentMethod as PaymentMethod }),
    };

    return this.prisma.mbcsPayment.update({
      where: { id },
      data,
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

    if (dueAmount > officeGrandTotal) {
      throw new BadRequestException(
        `dueAmount (${dueAmount}) cannot exceed the total payable amount (${officeGrandTotal})`,
      );
    }

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
              paymentType: item.paymentType as MbcsPaymentType,
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
      paymentMonth: r.paymentMonth,
      studentId: r.studentId,
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
          return tx.mbcsPayment.create({
            data: {
              studentId: item.studentId,
              paymentType: item.paymentType as MbcsPaymentType,
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
  private async getPaymentPriority(): Promise<
    { group: string; types: string[] }[]
  > {
    try {
      const setting = await this.prisma.orgSettings.findUnique({
        where: {
          organization_settingKey: {
            organization: 'mbcs',
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
          return buildPriorityOrder(raw.order as string[], MBCS_OTHERS_TYPES);
        }
      }
    } catch {
      // fall through to default
    }
    return MBCS_PRIORITY_ORDER;
  }

  /**
   * Get due summary for a student, grouped by payment type category.
   * Re-runs allocation logic per invoice to compute accurate per-type dues.
   */
  async getDueSummary(studentId: string) {
    const priorityOrder = await this.getPaymentPriority();

    const payments = await this.prisma.mbcsPayment.findMany({
      where: { studentId, isActive: true, isDueCollection: false },
      orderBy: { paymentDate: 'asc' },
    });

    const byInvoice = new Map<string, typeof payments>();
    for (const p of payments) {
      if (!byInvoice.has(p.invoiceNumber)) byInvoice.set(p.invoiceNumber, []);
      byInvoice.get(p.invoiceNumber)!.push(p);
    }

    const dues: Record<string, number> = {};

    for (const [invoiceNumber, rows] of byInvoice) {
      const originalTotalDue = rows[0].dueAmount ?? 0;
      if (originalTotalDue <= 0) continue;

      const originalOfficePaid = rows[0].officePaid ?? 0;

      const priorCollections = await this.prisma.mbcsPayment.findMany({
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

      const lineItems = rows.map((r) => ({
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

    const OTHERS = MBCS_OTHERS_TYPES;
    const hasType = (type: string) =>
      payments.some((p) => p.paymentType === type);
    const hasOthers = () =>
      payments.some((p) => OTHERS.includes(p.paymentType));

    const othersDue = OTHERS.reduce((sum, t) => sum + (dues[t] ?? 0), 0);
    let tuitionDue = dues['tuition'] ?? 0;
    let admissionDue = dues['admission'] ?? 0;
    let readmissionDue = dues['readmission'] ?? 0;
    let lateFeeDue = dues['late_fee'] ?? 0;

    // Enhance dues with fully-unpaid months/fees from the student's stored fee fields
    const student = await this.prisma.mbcsStudent.findUnique({
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

      // Determine end month for due calculation (respect associationEndDate)
      let endMonth = currentMonth;
      if (student.associationEndDate) {
        const endDate = new Date(student.associationEndDate);
        const endYear = endDate.getFullYear();
        const endMo = endDate.getMonth() + 1;
        if (endYear < currentYear) {
          endMonth = 0; // departed in a previous year — no dues this year
        } else if (endYear === currentYear) {
          endMonth = Math.min(endMo, currentMonth);
        }
      }

      // MBCS rule: all months from January are applicable regardless of admission date
      let startMonth = 1;
      if (student.admissionDate) {
        const admYear = student.admissionDate.getFullYear();
        if (admYear > currentYear) {
          startMonth = currentMonth + 1; // admitted in a future year — no dues
        }
        // else: startMonth stays 1 — even if admitted mid-year, Jan onwards is due
      }

      const paidTuitionMonthKeys = new Set(
        payments
          .filter((p) => p.paymentType === 'tuition')
          .map((p) => {
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
          (student.monthlyTuitionFee ?? 0) - (student.discountTuition ?? 0),
        );

      if (!hasType('admission') && (student.admissionFee ?? 0) > 0) {
        admissionDue += Math.max(
          0,
          student.admissionFee! - (student.discountAdmission ?? 0),
        );
      }

      if (!hasType('readmission') && (student.readmissionFee ?? 0) > 0) {
        readmissionDue += Math.max(
          0,
          student.readmissionFee! - (student.discountReadmission ?? 0),
        );
      }

      // Late fee calculation: load settings and check unpaid months past threshold
      const lateFeeSettings = await this.prisma.orgSettings.findMany({
        where: {
          organization: 'mbcs',
          settingKey: { in: ['late_fee_amount', 'late_fee_day_threshold'] },
        },
      });
      const lateFeeSettingMap = new Map<string, number>();
      for (const s of lateFeeSettings) {
        const val = (s.settingValue as { value?: number } | null)?.value;
        if (val != null) lateFeeSettingMap.set(s.settingKey, val);
      }
      const lateFeeAmount = lateFeeSettingMap.get('late_fee_amount') ?? 0;
      const lateFeeThreshold = lateFeeSettingMap.get('late_fee_day_threshold') ?? 15;

      if (lateFeeAmount > 0) {
        // Check which late_fee payments already exist
        const paidLateFeeMonthKeys = new Set(
          payments
            .filter((p) => p.paymentType === 'late_fee')
            .map((p) => {
              const d = new Date(p.paymentMonth);
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            }),
        );

        for (let m = startMonth; m <= endMonth; m++) {
          const key = `${currentYear}-${String(m).padStart(2, '0')}`;
          // Late fee applies if: tuition was not paid AND we are past the threshold day of that month
          if (!paidTuitionMonthKeys.has(key) && !paidLateFeeMonthKeys.has(key)) {
            const thresholdDate = new Date(currentYear, m - 1, lateFeeThreshold);
            if (now > thresholdDate) {
              lateFeeDue += lateFeeAmount;
            }
          }
        }
      }
    }

    return {
      studentId,
      totalDue:
        tuitionDue + admissionDue + readmissionDue + lateFeeDue + othersDue,
      breakdown: {
        tuition: { due: tuitionDue, status: tuitionDue > 0 ? 'due' : 'paid' },
        late_fee: {
          due: lateFeeDue,
          status:
            lateFeeDue > 0 ? 'due' : hasType('late_fee') ? 'paid' : 'na',
        },
        admission: {
          due: admissionDue,
          status:
            admissionDue > 0 ? 'due' : hasType('admission') ? 'paid' : 'na',
        },
        readmission: {
          due: readmissionDue,
          status:
            readmissionDue > 0 ? 'due' : hasType('readmission') ? 'paid' : 'na',
        },
        others: {
          due: othersDue,
          status: othersDue > 0 ? 'due' : hasOthers() ? 'paid' : 'na',
        },
      },
    };
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
