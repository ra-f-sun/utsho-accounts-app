import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceService } from '../../common/services/invoice.service';
import { TeacherAttendanceService } from '../teacher-attendance/teacher-attendance.service';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { UpdatePayrollDto } from './dto/update-payroll.dto';

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private invoiceService: InvoiceService,
    private attendanceService: TeacherAttendanceService,
  ) {}

  async create(createPayrollDto: CreatePayrollDto, createdBy: string) {
    // Check for duplicate payroll (same payableType + payableId + month)
    await this.checkDuplicate(
      createPayrollDto.payableType,
      createPayrollDto.payableId,
      createPayrollDto.paymentMonth,
    );

    // Verify teacher or staff exists
    if (createPayrollDto.payableType === 'teacher') {
      const teacher = await this.prisma.uacTeacher.findUnique({
        where: { id: createPayrollDto.payableId },
      });

      if (!teacher) {
        throw new NotFoundException(
          `Teacher with ID ${createPayrollDto.payableId} not found`,
        );
      }
    } else if (createPayrollDto.payableType === 'staff') {
      const staff = await this.prisma.uacStaff.findUnique({
        where: { id: createPayrollDto.payableId },
      });

      if (!staff) {
        throw new NotFoundException(
          `Staff with ID ${createPayrollDto.payableId} not found`,
        );
      }
    }

    // Generate invoice number
    const invoiceNumber =
      await this.invoiceService.generateInvoiceNumber('uac');

    // Create payroll with transaction
    return this.prisma.$transaction(async (tx) => {
      const payroll = await tx.uacPayroll.create({
        data: {
          ...createPayrollDto,
          paymentMonth: new Date(createPayrollDto.paymentMonth),
          paymentDate: new Date(createPayrollDto.paymentDate),
          invoiceNumber,
          createdBy,
        },
      });

      return payroll;
    });
  }

  async findAll(
    payableType?: string,
    payableId?: string,
    paymentMonth?: string,
  ) {
    const where: Prisma.UacPayrollWhereInput = { isActive: true };

    if (payableType) {
      where.payableType = payableType;
    }

    if (payableId) {
      where.payableId = payableId;
    }

    if (paymentMonth) {
      where.paymentMonth = new Date(paymentMonth);
    }

    return this.prisma.uacPayroll.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const payroll = await this.prisma.uacPayroll.findFirst({
      where: { id, isActive: true },
    });

    if (!payroll) {
      throw new NotFoundException(`Payroll record with ID ${id} not found`);
    }

    return payroll;
  }

  async update(id: string, updatePayrollDto: UpdatePayrollDto) {
    // Check if payroll exists
    await this.findOne(id);

    const data: Prisma.UacPayrollUpdateInput = { ...updatePayrollDto };
    if (updatePayrollDto.paymentMonth) {
      data.paymentMonth = new Date(updatePayrollDto.paymentMonth);
    }
    if (updatePayrollDto.paymentDate) {
      data.paymentDate = new Date(updatePayrollDto.paymentDate);
    }

    return this.prisma.uacPayroll.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    // Check if payroll exists
    await this.findOne(id);

    return this.prisma.uacPayroll.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Calculate payroll amount for a teacher based on payment type
   */
  async calculateTeacherPayroll(teacherId: string, month: string) {
    const teacher = await this.prisma.uacTeacher.findUnique({
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
   * Check if payroll already exists for this person + month
   * Prevents duplicate payments
   */
  private async checkDuplicate(
    payableType: string,
    payableId: string,
    paymentMonth: string,
  ) {
    const existing = await this.prisma.uacPayroll.findFirst({
      where: {
        payableType,
        payableId,
        paymentMonth: new Date(paymentMonth),
        isActive: true,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Payroll for this ${payableType} already exists for ${paymentMonth}`,
      );
    }
  }
}
