import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceService } from '../../common/services/invoice.service';
import { CreateMecPaymentDto } from './dto/create-payment.dto';
import { UpdateMecPaymentDto } from './dto/update-payment.dto';
import { FilterMecPaymentDto } from './dto/filter-payment.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateMecMultiPaymentDto } from './dto/create-multi-payment.dto';

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

    const [data, total] = await Promise.all([
      this.prisma.mecPayment.findMany({
        where,
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
        skip,
        take: limit,
      }),
      this.prisma.mecPayment.count({ where }),
    ]);

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

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.mecPayment.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async createMulti(dto: CreateMecMultiPaymentDto, createdBy: string) {
    const student = await this.prisma.mecStudent.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) {
      throw new NotFoundException(`Student with ID ${dto.studentId} not found`);
    }

    // MEC payments are all tuition — check for duplicate per month
    for (const item of dto.lineItems) {
      if (item.paymentMonth) {
        const existing = await this.prisma.mecPayment.findFirst({
          where: {
            studentId: dto.studentId,
            paymentMonth: new Date(item.paymentMonth),
            isActive: true,
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
      where: { organization_settingKey: { organization: 'mec', settingKey: 'invoice_mode' } },
    });
    const invoiceMode = (invoiceModeSetting?.settingValue as string) ?? 'dual';

    // Compute dual-invoice amounts (MEC: all tuition, guardian = full tuition fee)
    const additionalDiscount = dto.additionalDiscount ?? 0;
    const dueAmount = dto.dueAmount ?? 0;

    const lineItemsWithGuardian = dto.lineItems.map((item) => {
      const guardianAmount = invoiceMode === 'unified'
        ? item.amount
        : (student.monthlyTuitionFee ?? item.amount);
      return { ...item, guardianAmount };
    });

    const officeSubTotal = dto.lineItems.reduce((s, i) => s + i.amount, 0);
    const guardianSubTotal = lineItemsWithGuardian.reduce((s, i) => s + i.guardianAmount, 0);
    const officeGrandTotal = officeSubTotal - additionalDiscount;
    const guardianGrandTotal = guardianSubTotal - additionalDiscount;
    const officePaid = officeGrandTotal - dueAmount;
    const guardianPaid = guardianGrandTotal - dueAmount;

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
