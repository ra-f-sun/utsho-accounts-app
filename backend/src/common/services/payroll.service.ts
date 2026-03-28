import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PayableType, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceService } from './invoice.service';
import { SharedTeacherAttendanceService } from './teacher-attendance.service';
import { PaginationDto } from '../dto/pagination.dto';

type OrgType = 'uac' | 'mbcs';

interface CreatePayrollDto {
  payableType: PayableType;
  payableId: string;
  paymentMonth: string;
  amount: number;
  totalLectures?: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  paidAmount?: number;
}

interface UpdatePayrollDto {
  payableType?: PayableType;
  payableId?: string;
  paymentMonth?: string;
  amount?: number;
  totalLectures?: number;
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  paidAmount?: number;
}

interface CollectPayrollDueDto {
  paidAmount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}

@Injectable()
export class SharedPayrollService {
  constructor(
    private prisma: PrismaService,
    private invoiceService: InvoiceService,
    private attendanceService: SharedTeacherAttendanceService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private payrollModel(org: OrgType): any {
    return org === 'uac' ? this.prisma.uacPayroll : this.prisma.mbcsPayroll;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private teacherModel(org: OrgType): any {
    return org === 'uac' ? this.prisma.uacTeacher : this.prisma.mbcsTeacher;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private staffModel(org: OrgType): any {
    return org === 'uac' ? this.prisma.uacStaff : this.prisma.mbcsStaff;
  }

  async create(org: OrgType, dto: CreatePayrollDto, createdBy: string) {
    await this.checkDuplicate(org, dto.payableType, dto.payableId, dto.paymentMonth);

    if (dto.payableType === PayableType.teacher) {
      const teacher = await this.teacherModel(org).findUnique({
        where: { id: dto.payableId },
      });
      if (!teacher) {
        throw new NotFoundException(`Teacher with ID ${dto.payableId} not found`);
      }
    } else if (dto.payableType === PayableType.staff) {
      const staff = await this.staffModel(org).findUnique({
        where: { id: dto.payableId },
      });
      if (!staff) {
        throw new NotFoundException(`Staff with ID ${dto.payableId} not found`);
      }
    }

    const invoiceNumber = await this.invoiceService.generateInvoiceNumber(org);

    return this.prisma.$transaction(async (tx) => {
      const paidAmount = dto.paidAmount ?? dto.amount;
      const dueAmount = Math.max(0, dto.amount - paidAmount);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payrollDelegate = org === 'uac' ? (tx as any).uacPayroll : (tx as any).mbcsPayroll;

      return payrollDelegate.create({
        data: {
          ...dto,
          payableType: dto.payableType,
          paymentMethod: dto.paymentMethod,
          paymentMonth: new Date(dto.paymentMonth),
          paymentDate: new Date(dto.paymentDate),
          invoiceNumber,
          createdBy,
          paidAmount,
          dueAmount,
        },
      });
    });
  }

  async findAll(
    org: OrgType,
    payableType?: PayableType,
    payableId?: string,
    paymentMonth?: string,
    pagination?: PaginationDto,
  ) {
    const where: {
      isActive: boolean;
      payableType?: PayableType;
      payableId?: string;
      paymentMonth?: Date;
    } = { isActive: true };

    if (payableType) where.payableType = payableType;
    if (payableId) where.payableId = payableId;
    if (paymentMonth) where.paymentMonth = new Date(paymentMonth);

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.payrollModel(org).findMany({
        where,
        orderBy: { paymentDate: 'desc' },
        skip,
        take: limit,
      }),
      this.payrollModel(org).count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(org: OrgType, id: string) {
    const payroll = await this.payrollModel(org).findFirst({
      where: { id, isActive: true },
    });

    if (!payroll) {
      throw new NotFoundException(`Payroll record with ID ${id} not found`);
    }

    return payroll;
  }

  async update(org: OrgType, id: string, dto: UpdatePayrollDto) {
    await this.findOne(org, id);

    const { payableType, paymentMethod, ...rest } = dto;
    const data: Record<string, unknown> = {
      ...rest,
      ...(payableType && { payableType }),
      ...(paymentMethod && { paymentMethod }),
    };
    if (dto.paymentMonth) data.paymentMonth = new Date(dto.paymentMonth);
    if (dto.paymentDate) data.paymentDate = new Date(dto.paymentDate);

    return this.payrollModel(org).update({ where: { id }, data });
  }

  async remove(org: OrgType, id: string, updatedBy?: string) {
    await this.findOne(org, id);
    return this.payrollModel(org).update({
      where: { id },
      data: { isActive: false, ...(updatedBy && { updatedBy }) },
    });
  }

  async calculateTeacherPayroll(org: OrgType, teacherId: string, month: string) {
    const teacher = await this.teacherModel(org).findUnique({
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
        org,
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

  async collectDue(
    org: OrgType,
    payrollId: string,
    dto: CollectPayrollDueDto,
    createdBy: string,
  ) {
    const original = await this.payrollModel(org).findFirst({
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

    const priorCollections = await this.payrollModel(org).findMany({
      where: {
        parentPayrollId: payrollId,
        isDueCollection: true,
        isActive: true,
      },
    });
    const priorCollectedTotal = priorCollections.reduce(
      (s: number, r: { amount: number }) => s + r.amount,
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
    const newInvoiceNumber = await this.invoiceService.generateInvoiceNumber(org);

    return this.prisma.$transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payrollDelegate = org === 'uac' ? (tx as any).uacPayroll : (tx as any).mbcsPayroll;
      return payrollDelegate.create({
        data: {
          payableType: original.payableType,
          payableId: original.payableId,
          paymentMonth: original.paymentMonth,
          amount: dto.paidAmount,
          totalLectures: null,
          paymentDate: new Date(dto.paymentDate),
          paymentMethod: dto.paymentMethod,
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
    org: OrgType,
    payableType: PayableType,
    payableId: string,
    paymentMonth: string,
  ) {
    const existing = await this.payrollModel(org).findFirst({
      where: {
        payableType,
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
