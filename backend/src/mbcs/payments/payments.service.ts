import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceService } from '../../common/services/invoice.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { FilterPaymentDto } from './dto/filter-payment.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateMbcsMultiPaymentDto } from './dto/create-multi-payment.dto';

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

    // Check for duplicate tuition payments
    for (const item of dto.lineItems) {
      if (item.paymentType === 'tuition' && item.paymentMonth) {
        const existing = await this.prisma.mbcsPayment.findFirst({
          where: {
            studentId: dto.studentId,
            paymentType: 'tuition',
            paymentMonth: new Date(item.paymentMonth),
            isActive: true,
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
