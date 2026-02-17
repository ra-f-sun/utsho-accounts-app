import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceService } from '../../common/services/invoice.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { FilterPaymentDto } from './dto/filter-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private invoiceService: InvoiceService,
  ) {}

  async create(createPaymentDto: CreatePaymentDto, createdBy: string) {
    // Verify student exists
    const student = await this.prisma.uacStudent.findUnique({
      where: { id: createPaymentDto.studentId },
    });

    if (!student) {
      throw new NotFoundException(
        `Student with ID ${createPaymentDto.studentId} not found`,
      );
    }

    // Generate invoice number
    const invoiceNumber =
      await this.invoiceService.generateInvoiceNumber('uac');

    // Create payment with transaction
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.uacPayment.create({
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
              group: true,
            },
          },
        },
      });

      return payment;
    });
  }

  async findAll(filters?: FilterPaymentDto) {
    const where: Prisma.UacPaymentWhereInput = {};

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

    return this.prisma.uacPayment.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            class: true,
            group: true,
            contactNumber: true,
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const payment = await this.prisma.uacPayment.findUnique({
      where: { id },
      include: {
        student: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto) {
    // Check if payment exists
    await this.findOne(id);

    return this.prisma.uacPayment.update({
      where: { id },
      data: updatePaymentDto,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            class: true,
            group: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    // Check if payment exists
    await this.findOne(id);

    // Hard delete for payments (as per schema - no isActive field)
    // In production, consider adding isActive field for soft delete
    return this.prisma.uacPayment.delete({
      where: { id },
    });
  }

  /**
   * Get payment summary for a student
   */
  async getStudentPaymentSummary(studentId: string) {
    const payments = await this.prisma.uacPayment.findMany({
      where: { studentId },
      orderBy: { paymentDate: 'desc' },
    });

    const total = payments.reduce((sum, payment) => sum + payment.amount, 0);

    return {
      studentId,
      totalPaid: total,
      paymentCount: payments.length,
      payments,
    };
  }
}
