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
      return tx.mbcsPayroll.create({
        data: {
          ...createPayrollDto,
          paymentMonth: new Date(createPayrollDto.paymentMonth),
          paymentDate: new Date(createPayrollDto.paymentDate),
          invoiceNumber,
          createdBy,
        },
      });
    });
  }

  async findAll(
    payableType?: string,
    payableId?: string,
    paymentMonth?: string,
  ) {
    const where: Prisma.MbcsPayrollWhereInput = { isActive: true };

    if (payableType) where.payableType = payableType;
    if (payableId) where.payableId = payableId;
    if (paymentMonth) where.paymentMonth = new Date(paymentMonth);

    return this.prisma.mbcsPayroll.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
    });
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

    const data: Prisma.MbcsPayrollUpdateInput = { ...updatePayrollDto };
    if (updatePayrollDto.paymentMonth) {
      data.paymentMonth = new Date(updatePayrollDto.paymentMonth);
    }
    if (updatePayrollDto.paymentDate) {
      data.paymentDate = new Date(updatePayrollDto.paymentDate);
    }

    return this.prisma.mbcsPayroll.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.mbcsPayroll.update({
      where: { id },
      data: { isActive: false },
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

  private async checkDuplicate(
    payableType: string,
    payableId: string,
    paymentMonth: string,
  ) {
    const existing = await this.prisma.mbcsPayroll.findFirst({
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
