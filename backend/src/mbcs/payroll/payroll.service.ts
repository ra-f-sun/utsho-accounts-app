import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, PayableType, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceService } from '../../common/services/invoice.service';
import { TeacherAttendanceService } from '../teacher-attendance/teacher-attendance.service';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { UpdatePayrollDto } from './dto/update-payroll.dto';
import { CollectPayrollDueDto } from './dto/collect-payroll-due.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private invoiceService: InvoiceService,
    private attendanceService: TeacherAttendanceService,
  ) {}

  async create(createPayrollDto: CreatePayrollDto, createdBy: string) {
    // Duplicate guard: same payableType + payableId + month → 409
    await this.checkDuplicate(
      createPayrollDto.payableType,
      createPayrollDto.payableId,
      createPayrollDto.paymentMonth,
    );

    // Verify teacher or staff exists
    if (createPayrollDto.payableType === 'teacher') {
      const teacher = await this.prisma.mbcsTeacher.findUnique({
        where: { id: createPayrollDto.payableId },
      });
      if (!teacher) {
        throw new NotFoundException(
          `Teacher with ID ${createPayrollDto.payableId} not found`,
        );
      }
    } else if (createPayrollDto.payableType === 'staff') {
      const staff = await this.prisma.mbcsStaff.findUnique({
        where: { id: createPayrollDto.payableId },
      });
      if (!staff) {
        throw new NotFoundException(
          `Staff with ID ${createPayrollDto.payableId} not found`,
        );
      }
    }

    // Generate invoice number → MBCS/2026/XXXX
    const invoiceNumber =
      await this.invoiceService.generateInvoiceNumber('mbcs');

    return this.prisma.$transaction(async (tx) => {
      const paidAmount = createPayrollDto.paidAmount ?? createPayrollDto.amount;
      const dueAmount = Math.max(0, createPayrollDto.amount - paidAmount);

      return tx.mbcsPayroll.create({
        data: {
          ...createPayrollDto,
          payableType: createPayrollDto.payableType as PayableType,
          paymentMethod: createPayrollDto.paymentMethod as PaymentMethod,
          paymentMonth: new Date(createPayrollDto.paymentMonth),
          paymentDate: new Date(createPayrollDto.paymentDate),
          invoiceNumber,
          createdBy,
          paidAmount,
          dueAmount,
        },
      });
    });
  }

  async findAll(
    payableType?: PayableType,
    payableId?: string,
    paymentMonth?: string,
    pagination?: PaginationDto,
  ) {
    const where: Prisma.MbcsPayrollWhereInput = { isActive: true };

    if (payableType) where.payableType = payableType as PayableType;
    if (payableId) where.payableId = payableId;
    if (paymentMonth) where.paymentMonth = new Date(paymentMonth);

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.mbcsPayroll.findMany({
        where,
        orderBy: { paymentDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.mbcsPayroll.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const payroll = await this.prisma.mbcsPayroll.findFirst({
      where: { id, isActive: true },
    });

    if (!payroll) {
      throw new NotFoundException(`Payroll record with ID ${id} not found`);
    }

    return payroll;
  }

  async update(id: string, updatePayrollDto: UpdatePayrollDto) {
    await this.findOne(id);

    const { payableType, paymentMethod, ...rest } = updatePayrollDto;
    const data: Prisma.MbcsPayrollUpdateInput = {
      ...rest,
      ...(payableType && { payableType: payableType as PayableType }),
      ...(paymentMethod && { paymentMethod: paymentMethod as PaymentMethod }),
    };
    if (updatePayrollDto.paymentMonth) {
      data.paymentMonth = new Date(updatePayrollDto.paymentMonth);
    }
    if (updatePayrollDto.paymentDate) {
      data.paymentDate = new Date(updatePayrollDto.paymentDate);
    }

    return this.prisma.mbcsPayroll.update({ where: { id }, data });
  }

  async remove(id: string, updatedBy?: string) {
    await this.findOne(id);
    return this.prisma.mbcsPayroll.update({
      where: { id },
      data: { isActive: false, ...(updatedBy && { updatedBy }) },
    });
  }

  async calculateTeacherPayroll(teacherId: string, month: string) {
    const teacher = await this.prisma.mbcsTeacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${teacherId} not found`);
    }

    if (teacher.paymentType === 'fixed') {
      return {
        teacherId,
        month,
        paymentType: 'fixed',
        amount: teacher.monthlySalary,
        totalLectures: null,
      };
    } else if (teacher.paymentType === 'lecture_based') {
      const summary = await this.attendanceService.getMonthlySummary(
        teacherId,
        month,
      );

      const amount = summary.totalLectures * (teacher.perLectureRate || 0);

      return {
        teacherId,
        month,
        paymentType: 'lecture_based',
        amount,
        totalLectures: summary.totalLectures,
      };
    }

    throw new BadRequestException('Invalid teacher payment type');
  }

  /**
   * Collect outstanding due on an existing MBCS payroll record (Feature 6B)
   */
  async collectDue(
    payrollId: string,
    dto: CollectPayrollDueDto,
    createdBy: string,
  ) {
    const original = await this.prisma.mbcsPayroll.findFirst({
      where: { id: payrollId, isActive: true, isDueCollection: false },
    });

    if (!original) {
      throw new NotFoundException(`Payroll record ${payrollId} not found`);
    }

    const originalDue = original.dueAmount ?? 0;
    if (originalDue <= 0) {
      throw new BadRequestException(
        `Payroll record ${payrollId} has no outstanding due`,
      );
    }

    const priorCollections = await this.prisma.mbcsPayroll.findMany({
      where: {
        parentPayrollId: payrollId,
        isDueCollection: true,
        isActive: true,
      },
    });
    const priorCollectedTotal = priorCollections.reduce(
      (s, r) => s + r.amount,
      0,
    );

    const remainingDue = Math.max(0, originalDue - priorCollectedTotal);
    if (remainingDue <= 0) {
      throw new BadRequestException(
        `Payroll record ${payrollId} has no remaining due`,
      );
    }

    if (dto.paidAmount > remainingDue) {
      throw new BadRequestException(
        `Payment amount exceeds remaining due of ${remainingDue}`,
      );
    }

    const newDueAmount = Math.max(0, remainingDue - dto.paidAmount);
    const newInvoiceNumber =
      await this.invoiceService.generateInvoiceNumber('mbcs');

    return this.prisma.$transaction(async (tx) => {
      return tx.mbcsPayroll.create({
        data: {
          payableType: original.payableType,
          payableId: original.payableId,
          paymentMonth: original.paymentMonth,
          amount: dto.paidAmount,
          totalLectures: null,
          paymentDate: new Date(dto.paymentDate),
          paymentMethod: dto.paymentMethod as PaymentMethod,
          invoiceNumber: newInvoiceNumber,
          notes: dto.notes,
          createdBy,
          isDueCollection: true,
          parentPayrollId: payrollId,
          dueAmount: newDueAmount,
        },
      });
    });
  }

  private async checkDuplicate(
    payableType: PayableType,
    payableId: string,
    paymentMonth: string,
  ) {
    const existing = await this.prisma.mbcsPayroll.findFirst({
      where: {
        payableType: payableType as PayableType,
        payableId,
        paymentMonth: new Date(paymentMonth),
        isActive: true,
        isDueCollection: false,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Payroll for this ${payableType} already exists for ${paymentMonth}`,
      );
    }
  }
}
