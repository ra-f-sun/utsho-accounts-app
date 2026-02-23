import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsQueryDto, Organization } from './dto/analytics-query.dto';
import dayjs from 'dayjs';

export interface RevenueStats {
  organization: string;
  studentPayments: number;
  teacherPayroll: number;
  staffPayroll: number;
  expenses: number;
  netRevenue: number; // studentPayments - (teacherPayroll + staffPayroll + expenses)
}

export interface MonthlyRevenue {
  month: string; // YYYY-MM
  studentPayments: number;
  teacherPayroll: number;
  staffPayroll: number;
  expenses: number;
  netRevenue: number;
}

export interface OutstandingPayment {
  studentId: string;
  studentName: string;
  class?: number;
  group?: string;
  shift?: string;
  organization: string;
  monthlyFee: number;
  unpaidMonths: number;
  lastPaymentDate?: Date;
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get revenue statistics (total or per organization)
   * Returns summary of student payments, payroll, expenses, and net revenue
   */
  async getRevenueStats(
    filters: AnalyticsQueryDto,
  ): Promise<RevenueStats | RevenueStats[]> {
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : dayjs().startOf('year').toDate();
    const endDate = filters.endDate
      ? new Date(filters.endDate)
      : dayjs().endOf('year').toDate();

    if (filters.organization) {
      // Single organization stats
      return this.getOrgRevenueStats(filters.organization, startDate, endDate);
    } else {
      // All organizations stats
      const [uacStats, mbcsStats, mecStats] = await Promise.all([
        this.getOrgRevenueStats(Organization.UAC, startDate, endDate),
        this.getOrgRevenueStats(Organization.MBCS, startDate, endDate),
        this.getOrgRevenueStats(Organization.MEC, startDate, endDate),
      ]);
      return [uacStats, mbcsStats, mecStats];
    }
  }

  /**
   * Get monthly revenue trend (last 6 months or custom range)
   */
  async getMonthlyRevenueTrend(
    filters: AnalyticsQueryDto,
  ): Promise<MonthlyRevenue[]> {
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : dayjs().subtract(5, 'months').startOf('month').toDate();
    const endDate = filters.endDate
      ? new Date(filters.endDate)
      : dayjs().endOf('month').toDate();

    const months: MonthlyRevenue[] = [];
    let currentMonth = dayjs(startDate);
    const end = dayjs(endDate);

    while (currentMonth.isBefore(end) || currentMonth.isSame(end, 'month')) {
      const monthStart = currentMonth.startOf('month').toDate();
      const monthEnd = currentMonth.endOf('month').toDate();

      const monthStats = await this.getMonthRevenue(
        filters.organization,
        monthStart,
        monthEnd,
      );

      months.push({
        month: currentMonth.format('YYYY-MM'),
        ...monthStats,
      });

      currentMonth = currentMonth.add(1, 'month');
    }

    return months;
  }

  /**
   * Get outstanding (unpaid) students
   */
  async getOutstandingPayments(
    filters: AnalyticsQueryDto,
  ): Promise<OutstandingPayment[]> {
    const outstanding: OutstandingPayment[] = [];

    if (filters.organization) {
      const orgOutstanding = await this.getOrgOutstandingPayments(
        filters.organization,
      );
      outstanding.push(...orgOutstanding);
    } else {
      const [uacOut, mbcsOut, mecOut] = await Promise.all([
        this.getOrgOutstandingPayments(Organization.UAC),
        this.getOrgOutstandingPayments(Organization.MBCS),
        this.getOrgOutstandingPayments(Organization.MEC),
      ]);
      outstanding.push(...uacOut, ...mbcsOut, ...mecOut);
    }

    return outstanding;
  }

  /**
   * Get expense breakdown by type
   */
  async getExpenseBreakdown(filters: AnalyticsQueryDto) {
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : dayjs().startOf('year').toDate();
    const endDate = filters.endDate
      ? new Date(filters.endDate)
      : dayjs().endOf('year').toDate();

    const where: Prisma.ExpenseWhereInput = {
      paymentDate: {
        gte: startDate,
        lte: endDate,
      },
      ...(filters.organization ? { organization: filters.organization } : {}),
    };

    const expenses = await this.prisma.expense.groupBy({
      by: ['expenseType', 'organization'],
      where,
      _sum: {
        amount: true,
      },
    });

    return expenses.map((exp) => ({
      organization: exp.organization,
      expenseType: exp.expenseType,
      total: exp._sum.amount || 0,
    }));
  }

  // ========== HELPER METHODS ==========

  private async getOrgRevenueStats(
    org: Organization,
    startDate: Date,
    endDate: Date,
  ): Promise<RevenueStats> {
    const [studentPayments, teacherPayroll, staffPayroll, expenses] =
      await Promise.all([
        this.getStudentPaymentsTotal(org, startDate, endDate),
        this.getTeacherPayrollTotal(org, startDate, endDate),
        this.getStaffPayrollTotal(org, startDate, endDate),
        this.getExpensesTotal(org, startDate, endDate),
      ]);

    return {
      organization: org,
      studentPayments,
      teacherPayroll,
      staffPayroll,
      expenses,
      netRevenue: studentPayments - (teacherPayroll + staffPayroll + expenses),
    };
  }

  private async getMonthRevenue(
    org: Organization | undefined,
    monthStart: Date,
    monthEnd: Date,
  ): Promise<Omit<MonthlyRevenue, 'month'>> {
    if (org) {
      const [studentPayments, teacherPayroll, staffPayroll, expenses] =
        await Promise.all([
          this.getStudentPaymentsTotal(org, monthStart, monthEnd),
          this.getTeacherPayrollTotal(org, monthStart, monthEnd),
          this.getStaffPayrollTotal(org, monthStart, monthEnd),
          this.getExpensesTotal(org, monthStart, monthEnd),
        ]);

      return {
        studentPayments,
        teacherPayroll,
        staffPayroll,
        expenses,
        netRevenue:
          studentPayments - (teacherPayroll + staffPayroll + expenses),
      };
    } else {
      // All orgs combined
      const [uac, mbcs, mec] = await Promise.all([
        this.getMonthRevenue(Organization.UAC, monthStart, monthEnd),
        this.getMonthRevenue(Organization.MBCS, monthStart, monthEnd),
        this.getMonthRevenue(Organization.MEC, monthStart, monthEnd),
      ]);

      return {
        studentPayments:
          uac.studentPayments + mbcs.studentPayments + mec.studentPayments,
        teacherPayroll:
          uac.teacherPayroll + mbcs.teacherPayroll + mec.teacherPayroll,
        staffPayroll: uac.staffPayroll + mbcs.staffPayroll + mec.staffPayroll,
        expenses: uac.expenses + mbcs.expenses + mec.expenses,
        netRevenue: uac.netRevenue + mbcs.netRevenue + mec.netRevenue,
      };
    }
  }

  private async getStudentPaymentsTotal(
    org: Organization,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const where = {
      paymentDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    let total = 0;

    if (org === Organization.UAC) {
      const result = await this.prisma.uacPayment.aggregate({
        where,
        _sum: { amount: true },
      });
      total = result._sum.amount || 0;
    } else if (org === Organization.MBCS) {
      const result = await this.prisma.mbcsPayment.aggregate({
        where,
        _sum: { amount: true },
      });
      total = result._sum.amount || 0;
    } else if (org === Organization.MEC) {
      const result = await this.prisma.mecPayment.aggregate({
        where,
        _sum: { amount: true },
      });
      total = result._sum.amount || 0;
    }

    return total;
  }

  private async getTeacherPayrollTotal(
    org: Organization,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const where = {
      paymentDate: {
        gte: startDate,
        lte: endDate,
      },
      payableType: 'teacher',
    };

    let total = 0;

    if (org === Organization.UAC) {
      const result = await this.prisma.uacPayroll.aggregate({
        where,
        _sum: { amount: true },
      });
      total = result._sum.amount || 0;
    } else if (org === Organization.MBCS) {
      const result = await this.prisma.mbcsPayroll.aggregate({
        where,
        _sum: { amount: true },
      });
      total = result._sum.amount || 0;
    }

    return total;
  }

  private async getStaffPayrollTotal(
    org: Organization,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const where = {
      paymentDate: {
        gte: startDate,
        lte: endDate,
      },
      payableType: 'staff',
    };

    let total = 0;

    if (org === Organization.UAC) {
      const result = await this.prisma.uacPayroll.aggregate({
        where,
        _sum: { amount: true },
      });
      total = result._sum.amount || 0;
    } else if (org === Organization.MBCS) {
      const result = await this.prisma.mbcsPayroll.aggregate({
        where,
        _sum: { amount: true },
      });
      total = result._sum.amount || 0;
    }

    return total;
  }

  private async getExpensesTotal(
    org: Organization,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const result = await this.prisma.expense.aggregate({
      where: {
        organization: org,
        paymentDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: { amount: true },
    });

    return result._sum.amount || 0;
  }

  private async getOrgOutstandingPayments(
    org: Organization,
  ): Promise<OutstandingPayment[]> {
    const outstanding: OutstandingPayment[] = [];

    if (org === Organization.UAC) {
      const students = await this.prisma.uacStudent.findMany({
        where: { isActive: true },
        include: {
          payments: {
            where: { paymentType: 'tuition' },
            orderBy: { paymentMonth: 'desc' },
            take: 1,
          },
        },
      });

      for (const student of students) {
        const lastPaymentMonth =
          student.payments.length > 0
            ? dayjs(student.payments[0].paymentMonth)
            : null;

        const unpaidMonths = lastPaymentMonth
          ? dayjs().diff(lastPaymentMonth, 'month')
          : student.admissionDate
            ? dayjs().diff(dayjs(student.admissionDate), 'month') + 1
            : dayjs().diff(dayjs(student.createdAt), 'month') + 1;

        if (unpaidMonths > 0) {
          outstanding.push({
            studentId: student.id,
            studentName: student.name,
            class: student.class,
            group: student.group || undefined,
            shift: undefined,
            organization: 'UAC',
            monthlyFee: student.monthlyTuitionFee,
            unpaidMonths,
            lastPaymentDate:
              student.payments.length > 0
                ? student.payments[0].paymentDate
                : undefined,
          });
        }
      }
    } else if (org === Organization.MBCS) {
      const students = await this.prisma.mbcsStudent.findMany({
        where: { isActive: true },
        include: {
          payments: {
            where: { paymentType: 'tuition' },
            orderBy: { paymentMonth: 'desc' },
            take: 1,
          },
        },
      });

      for (const student of students) {
        const lastPaymentMonth =
          student.payments.length > 0
            ? dayjs(student.payments[0].paymentMonth)
            : null;

        const unpaidMonths = lastPaymentMonth
          ? dayjs().diff(lastPaymentMonth, 'month')
          : student.admissionDate
            ? dayjs().diff(dayjs(student.admissionDate), 'month') + 1
            : dayjs().diff(dayjs(student.createdAt), 'month') + 1;

        if (unpaidMonths > 0) {
          outstanding.push({
            studentId: student.id,
            studentName: student.name,
            class: student.class || undefined,
            group: undefined,
            shift: student.shift || undefined,
            organization: 'MBCS',
            monthlyFee: student.monthlyTuitionFee,
            unpaidMonths,
            lastPaymentDate:
              student.payments.length > 0
                ? student.payments[0].paymentDate
                : undefined,
          });
        }
      }
    } else if (org === Organization.MEC) {
      const students = await this.prisma.mecStudent.findMany({
        where: { isActive: true },
        include: {
          payments: {
            orderBy: { paymentMonth: 'desc' },
            take: 1,
          },
        },
      });

      for (const student of students) {
        const lastPaymentMonth =
          student.payments.length > 0
            ? dayjs(student.payments[0].paymentMonth)
            : null;

        const unpaidMonths = lastPaymentMonth
          ? dayjs().diff(lastPaymentMonth, 'month')
          : student.admissionDate
            ? dayjs().diff(dayjs(student.admissionDate), 'month') + 1
            : dayjs().diff(dayjs(student.createdAt), 'month') + 1;

        if (unpaidMonths > 0) {
          outstanding.push({
            studentId: student.id,
            studentName: student.name,
            class: student.class || undefined,
            group: student.group || undefined,
            shift: undefined,
            organization: 'MEC',
            monthlyFee: student.monthlyTuitionFee,
            unpaidMonths,
            lastPaymentDate:
              student.payments.length > 0
                ? student.payments[0].paymentDate
                : undefined,
          });
        }
      }
    }

    return outstanding;
  }
}
