import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceService } from '../../common/services/invoice.service';
import { CreateMecPaymentDto } from './dto/create-payment.dto';
import { UpdateMecPaymentDto } from './dto/update-payment.dto';
import { FilterMecPaymentDto } from './dto/filter-payment.dto';

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

  async findAll(filters?: FilterMecPaymentDto) {
    const where: Prisma.MecPaymentWhereInput = {};

    if (filters?.studentId) {
      where.studentId = filters.studentId;
    }

    if (filters?.paymentMonth) {
      where.paymentMonth = new Date(filters.paymentMonth);
    }

    if (filters?.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }

    return this.prisma.mecPayment.findMany({
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
    });
  }

  async findOne(id: string) {
    const payment = await this.prisma.mecPayment.findUnique({
      where: { id },
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
    return this.prisma.mecPayment.delete({ where: { id } });
  }

  async getStudentPaymentSummary(studentId: string) {
    const payments = await this.prisma.mecPayment.findMany({
      where: { studentId },
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
