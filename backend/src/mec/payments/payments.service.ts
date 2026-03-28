import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceService } from '../../common/services/invoice.service';
import { CreateMecPaymentDto } from './dto/create-payment.dto';
import { UpdateMecPaymentDto } from './dto/update-payment.dto';
import { FilterMecPaymentDto } from './dto/filter-payment.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateMecMultiPaymentDto } from './dto/create-multi-payment.dto';
import { CollectMecDueDto } from './dto/collect-due.dto';

const round2 = (v: number) => Math.round(v * 100) / 100;

@Injectable()
export class MecPaymentsService {
  constructor(
    private prisma: PrismaService,
    private invoiceService: InvoiceService,
  ) {}

  async create(createPaymentDto: CreateMecPaymentDto, createdBy: string) {
    // Verify student exists
    const student = await this.prisma.mecStudent.findUnique({
      where: { id: createPaymentDto.studentId },
    });

    if (!student) {
      throw new NotFoundException(
        `Student with ID ${createPaymentDto.studentId} not found`,
      );
    }

    // Generate invoice number using shared counter
    const invoiceNumber =
      await this.invoiceService.generateInvoiceNumber('mec');

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.mecPayment.create({
        data: {
          ...createPaymentDto,
          paymentMonth: new Date(createPaymentDto.paymentMonth),
          paymentDate: new Date(createPaymentDto.paymentDate),
          invoiceNumber,
          createdBy,
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              class: true,
            },
          },
        },
      });

      return payment;
    });
  }

  async findAll(filters?: FilterMecPaymentDto, pagination?: PaginationDto) {
    const where: Prisma.MecPaymentWhereInput = { isActive: true };

    if (filters?.studentId) {
      where.studentId = filters.studentId;
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

    // Paginate by unique invoiceNumbers so grouped invoices stay intact
    const [invoicePage, allInvoices] = await Promise.all([
      this.prisma.mecPayment.findMany({
        where,
        select: { invoiceNumber: true },
        distinct: ['invoiceNumber'],
        orderBy: { paymentDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.mecPayment.findMany({
        where,
        select: { invoiceNumber: true },
        distinct: ['invoiceNumber'],
      }),
    ]);

    const invoiceNumbers = invoicePage.map((p) => p.invoiceNumber);
    const total = allInvoices.length;

    const data =
      invoiceNumbers.length > 0
        ? await this.prisma.mecPayment.findMany({
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
    const payment = await this.prisma.mecPayment.findFirst({
      where: { id, isActive: true },
      include: { student: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async update(id: string, updatePaymentDto: UpdateMecPaymentDto) {
    await this.findOne(id);

    const data: Prisma.MecPaymentUpdateInput = { ...updatePaymentDto };
    if (updatePaymentDto.paymentMonth) {
      data.paymentMonth = new Date(updatePaymentDto.paymentMonth);
    }
    if (updatePaymentDto.paymentDate) {
      data.paymentDate = new Date(updatePaymentDto.paymentDate);
    }

    return this.prisma.mecPayment.update({
      where: { id },
      data,
      include: {
        student: { select: { id: true, name: true, class: true } },
      },
    });
  }

  async remove(id: string, updatedBy?: string) {
    await this.findOne(id);
    return this.prisma.mecPayment.update({
      where: { id },
      data: { isActive: false, ...(updatedBy && { updatedBy }) },
    });
  }

  async createMulti(dto: CreateMecMultiPaymentDto, createdBy: string) {
    const student = await this.prisma.mecStudent.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) {
      throw new NotFoundException(`Student with ID ${dto.studentId} not found`);
    }

    // MEC payments are all tuition — check for duplicate per month (skip due collections)
    for (const item of dto.lineItems) {
      if (item.paymentMonth) {
        const existing = await this.prisma.mecPayment.findFirst({
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

    // Determine invoice mode (dual vs unified)
    const invoiceModeSetting = await this.prisma.orgSettings.findUnique({
      where: {
        organization_settingKey: {
          organization: 'mec',
          settingKey: 'invoice_mode',
        },
      },
    });
    const invoiceMode = (invoiceModeSetting?.settingValue as string) ?? 'dual';

    // Compute dual-invoice amounts (MEC: all tuition, guardian = full tuition fee)
    const additionalDiscount = dto.additionalDiscount ?? 0;
    const dueAmount = dto.dueAmount ?? 0;

    const lineItemsWithGuardian = dto.lineItems.map((item) => {
      const guardianAmount =
        invoiceMode === 'unified'
          ? item.amount
          : (student.monthlyTuitionFee ?? item.amount);
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
      await this.invoiceService.generateInvoiceNumber('mec');

    return this.prisma.$transaction(async (tx) => {
      const payments = await Promise.all(
        lineItemsWithGuardian.map((item) =>
          tx.mecPayment.create({
            data: {
              studentId: dto.studentId,
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
                select: { id: true, name: true, class: true },
              },
            },
          }),
        ),
      );
      return { invoiceNumber, payments };
    });
  }

  /**
   * Get due profile for a MEC student — outstanding invoices with remaining dues
   */
  async getDueProfile(studentId: string) {
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
      if (!invoiceMap.has(p.invoiceNumber)) {
        invoiceMap.set(p.invoiceNumber, []);
      }
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
        // MEC has only tuition type
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

  /**
   * Record a due collection for MEC (Feature 6B)
   */
  async collectDue(dto: CollectMecDueDto, createdBy: string) {
    const originalRows = await this.prisma.mecPayment.findMany({
      where: {
        invoiceNumber: dto.parentInvoiceNumber,
        isDueCollection: false,
        isActive: true,
      },
      include: {
        student: { select: { id: true, name: true, class: true } },
      },
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

    const remainingDue = round2(Math.max(0, originalTotalDue - priorCollectedTotal));
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

    const newInvoiceNumber =
      await this.invoiceService.generateInvoiceNumber('mec');

    // MEC may have multiple rows per invoice (one per month).
    // Distribute the paid amount across months with outstanding dues.
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
      if (paid > 0)
        itemsToPay.push({
          paymentMonth: d.paymentMonth,
          studentId: d.studentId,
          paidAmount: paid,
        });
    }

    return this.prisma.$transaction(async (tx) => {
      const payments = await Promise.all(
        itemsToPay.map((item) => {
          return tx.mecPayment.create({
            data: {
              studentId: item.studentId,
              amount: item.paidAmount,
              paymentMonth: item.paymentMonth,
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
              student: { select: { id: true, name: true, class: true } },
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
    const payments = await this.prisma.mecPayment.findMany({
      where: { invoiceNumber, isActive: true },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            class: true,
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
   * Get due summary for a student (MEC: tuition only — no paymentType field)
   */
  async getDueSummary(studentId: string) {
    const payments = await this.prisma.mecPayment.findMany({
      where: { studentId, isActive: true, isDueCollection: false },
      orderBy: { paymentDate: 'asc' },
    });

    // Group by invoiceNumber
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
        // MEC does not track per-type; the total amount not yet paid is tuition due
        const invoiceTotal = rows.reduce((sum, r) => sum + r.amount, 0);
        const totalPaidSoFar = originalOfficePaid + priorCollectedTotal;
        tuitionDue += Math.max(0, invoiceTotal - totalPaidSoFar);
      }
    }

    return {
      studentId,
      totalDue: tuitionDue,
      breakdown: {
        tuition: { due: tuitionDue, status: tuitionDue > 0 ? 'due' : 'paid' },
      },
    };
  }

  async getStudentPaymentSummary(studentId: string) {
    const payments = await this.prisma.mecPayment.findMany({
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
