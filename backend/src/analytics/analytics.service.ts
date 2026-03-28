import { Injectable } from '@nestjs/common';
import { Prisma, PayableType } from '@prisma/client';
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

export interface OutstandingDueSummary {
  organization: string;
  totalOriginalDue: number; // Sum of dueAmount from original invoices with outstanding balance
  totalCollected: number; // Sum of officePaid from due-collection rows
  netOutstandingDue: number; // totalOriginalDue - totalCollected
  studentsWithDue: number; // Count of distinct students with any outstanding due
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
   * Optimized: uses groupBy instead of per-month aggregate loops
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

    const orgs = filters.organization
      ? [filters.organization]
      : [Organization.UAC, Organization.MBCS, Organization.MEC];

    // Fetch all grouped data in parallel — one query per table
    const [
      uacPayments,
      mbcsPayments,
      mecPayments,
      uacPayroll,
      mbcsPayroll,
      expenses,
    ] = await Promise.all([
      orgs.includes(Organization.UAC)
        ? this.prisma.uacPayment.groupBy({
            by: ['paymentMonth'],
            where: {
              isActive: true,
              paymentDate: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
          })
        : Promise.resolve([]),
      orgs.includes(Organization.MBCS)
        ? this.prisma.mbcsPayment.groupBy({
            by: ['paymentMonth'],
            where: {
              isActive: true,
              paymentDate: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
          })
        : Promise.resolve([]),
      orgs.includes(Organization.MEC)
        ? this.prisma.mecPayment.groupBy({
            by: ['paymentMonth'],
            where: {
              isActive: true,
              paymentDate: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
          })
        : Promise.resolve([]),
      orgs.includes(Organization.UAC)
        ? this.prisma.uacPayroll.groupBy({
            by: ['paymentMonth', 'payableType'],
            where: {
              isActive: true,
              paymentDate: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
          })
        : Promise.resolve([]),
      orgs.includes(Organization.MBCS)
        ? this.prisma.mbcsPayroll.groupBy({
            by: ['paymentMonth', 'payableType'],
            where: {
              isActive: true,
              paymentDate: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
          })
        : Promise.resolve([]),
      this.prisma.expense.groupBy({
        by: ['expenseMonth', 'organization'],
        where: {
          isActive: true,
          paymentDate: { gte: startDate, lte: endDate },
          ...(filters.organization
            ? { organization: filters.organization }
            : {}),
        },
        _sum: { amount: true },
      }),
    ]);

    // Index grouped results by month string for O(1) lookup
    const toMonthKey = (d: Date) => dayjs(d).format('YYYY-MM');

    const uacPayMap = new Map<string, number>();
    for (const row of uacPayments) {
      uacPayMap.set(toMonthKey(row.paymentMonth), row._sum.amount ?? 0);
    }

    const mbcsPayMap = new Map<string, number>();
    for (const row of mbcsPayments) {
      mbcsPayMap.set(toMonthKey(row.paymentMonth), row._sum.amount ?? 0);
    }

    const mecPayMap = new Map<string, number>();
    for (const row of mecPayments) {
      mecPayMap.set(toMonthKey(row.paymentMonth), row._sum.amount ?? 0);
    }

    // Payroll maps: key = "YYYY-MM:teacher" or "YYYY-MM:staff"
    const uacPayrollMap = new Map<string, number>();
    for (const row of uacPayroll) {
      const k = `${toMonthKey(row.paymentMonth)}:${row.payableType}`;
      uacPayrollMap.set(k, row._sum.amount ?? 0);
    }

    const mbcsPayrollMap = new Map<string, number>();
    for (const row of mbcsPayroll) {
      const k = `${toMonthKey(row.paymentMonth)}:${row.payableType}`;
      mbcsPayrollMap.set(k, row._sum.amount ?? 0);
    }

    const expenseMap = new Map<string, number>();
    for (const row of expenses) {
      const k = `${toMonthKey(row.expenseMonth)}:${row.organization}`;
      expenseMap.set(k, (expenseMap.get(k) ?? 0) + (row._sum.amount ?? 0));
    }

    // Build month-by-month result
    const result: MonthlyRevenue[] = [];
    let currentMonth = dayjs(startDate);
    const end = dayjs(endDate);

    while (currentMonth.isBefore(end) || currentMonth.isSame(end, 'month')) {
      const m = currentMonth.format('YYYY-MM');

      let studentPayments = 0;
      let teacherPayroll = 0;
      let staffPayroll = 0;
      let expensesTotal = 0;

      for (const org of orgs) {
        if (org === Organization.UAC) {
          studentPayments += uacPayMap.get(m) ?? 0;
          teacherPayroll += uacPayrollMap.get(`${m}:teacher`) ?? 0;
          staffPayroll += uacPayrollMap.get(`${m}:staff`) ?? 0;
          expensesTotal += expenseMap.get(`${m}:${Organization.UAC}`) ?? 0;
        } else if (org === Organization.MBCS) {
          studentPayments += mbcsPayMap.get(m) ?? 0;
          teacherPayroll += mbcsPayrollMap.get(`${m}:teacher`) ?? 0;
          staffPayroll += mbcsPayrollMap.get(`${m}:staff`) ?? 0;
          expensesTotal += expenseMap.get(`${m}:${Organization.MBCS}`) ?? 0;
        } else if (org === Organization.MEC) {
          studentPayments += mecPayMap.get(m) ?? 0;
          // MEC has no payroll
          expensesTotal += expenseMap.get(`${m}:${Organization.MEC}`) ?? 0;
        }
      }

      result.push({
        month: m,
        studentPayments,
        teacherPayroll,
        staffPayroll,
        expenses: expensesTotal,
        netRevenue:
          studentPayments - (teacherPayroll + staffPayroll + expensesTotal),
      });

      currentMonth = currentMonth.add(1, 'month');
    }

    return result;
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
      isActive: true,
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

  /**
   * 6E audit: all revenue queries use `amount` (office copy field).
   * `guardianAmount` is NEVER summed in analytics — it is display-only.
   *
   * Outstanding due summary: uses actual `dueAmount` from payment records
   * (net of already-collected dues) to give a precise "money owed" figure.
   */
  async getOutstandingDueSummary(
    filters: AnalyticsQueryDto,
  ): Promise<OutstandingDueSummary[]> {
    const orgs = filters.organization
      ? [filters.organization]
      : [Organization.UAC, Organization.MBCS, Organization.MEC];

    return Promise.all(orgs.map((org) => this.getOrgOutstandingDue(org)));
  }

  private async getOrgOutstandingDue(
    org: Organization,
  ): Promise<OutstandingDueSummary> {
    let totalOriginalDue = 0;
    let totalCollected = 0;
    let studentsWithDue = 0;

    if (org === Organization.UAC) {
      const invoicesWithDue = await this.prisma.uacPayment.findMany({
        where: { isDueCollection: false, isActive: true, dueAmount: { gt: 0 } },
        select: { invoiceNumber: true, dueAmount: true, studentId: true },
        distinct: ['invoiceNumber'],
      });
      totalOriginalDue = invoicesWithDue.reduce(
        (sum, i) => sum + (i.dueAmount ?? 0),
        0,
      );
      studentsWithDue = new Set(invoicesWithDue.map((i) => i.studentId)).size;
      const collectedResult = await this.prisma.uacPayment.aggregate({
        where: { isDueCollection: true, isActive: true },
        _sum: { officePaid: true },
      });
      totalCollected = collectedResult._sum.officePaid ?? 0;
    } else if (org === Organization.MBCS) {
      const invoicesWithDue = await this.prisma.mbcsPayment.findMany({
        where: { isDueCollection: false, isActive: true, dueAmount: { gt: 0 } },
        select: { invoiceNumber: true, dueAmount: true, studentId: true },
        distinct: ['invoiceNumber'],
      });
      totalOriginalDue = invoicesWithDue.reduce(
        (sum, i) => sum + (i.dueAmount ?? 0),
        0,
      );
      studentsWithDue = new Set(invoicesWithDue.map((i) => i.studentId)).size;
      const collectedResult = await this.prisma.mbcsPayment.aggregate({
        where: { isDueCollection: true, isActive: true },
        _sum: { officePaid: true },
      });
      totalCollected = collectedResult._sum.officePaid ?? 0;
    } else if (org === Organization.MEC) {
      const invoicesWithDue = await this.prisma.mecPayment.findMany({
        where: { isDueCollection: false, isActive: true, dueAmount: { gt: 0 } },
        select: { invoiceNumber: true, dueAmount: true, studentId: true },
        distinct: ['invoiceNumber'],
      });
      totalOriginalDue = invoicesWithDue.reduce(
        (sum, i) => sum + (i.dueAmount ?? 0),
        0,
      );
      studentsWithDue = new Set(invoicesWithDue.map((i) => i.studentId)).size;
      const collectedResult = await this.prisma.mecPayment.aggregate({
        where: { isDueCollection: true, isActive: true },
        _sum: { officePaid: true },
      });
      totalCollected = collectedResult._sum.officePaid ?? 0;
    }

    return {
      organization: org,
      totalOriginalDue,
      totalCollected,
      netOutstandingDue: Math.max(0, totalOriginalDue - totalCollected),
      studentsWithDue,
    };
  }

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

  private async getStudentPaymentsTotal(
    org: Organization,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const where = {
      isActive: true,
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
      isActive: true,
      paymentDate: {
        gte: startDate,
        lte: endDate,
      },
      payableType: PayableType.teacher,
    };

    let total = 0;

    if (org === Organization.UAC) {
      const result = await this.prisma.uacPayroll.aggregate({
        where,
        _sum: { amount: true },
      });
      total = result._sum?.amount ?? 0;
    } else if (org === Organization.MBCS) {
      const result = await this.prisma.mbcsPayroll.aggregate({
        where,
        _sum: { amount: true },
      });
      total = result._sum?.amount ?? 0;
    }

    return total;
  }

  private async getStaffPayrollTotal(
    org: Organization,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const where = {
      isActive: true,
      paymentDate: {
        gte: startDate,
        lte: endDate,
      },
      payableType: PayableType.staff,
    };

    let total = 0;

    if (org === Organization.UAC) {
      const result = await this.prisma.uacPayroll.aggregate({
        where,
        _sum: { amount: true },
      });
      total = result._sum?.amount ?? 0;
    } else if (org === Organization.MBCS) {
      const result = await this.prisma.mbcsPayroll.aggregate({
        where,
        _sum: { amount: true },
      });
      total = result._sum?.amount ?? 0;
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
        isActive: true,
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
        where: { isActive: true, associationEndDate: null },
        include: {
          payments: {
            where: { paymentType: 'tuition', isActive: true },
            orderBy: { paymentMonth: 'desc' },
            take: 1,
          },
        },
      });

      for (const student of students) {
        const payments = student.payments;
        const lastPaymentMonth =
          payments.length > 0 ? dayjs(payments[0].paymentMonth) : null;

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
              payments.length > 0 ? payments[0].paymentDate : undefined,
          });
        }
      }
    } else if (org === Organization.MBCS) {
      const students = await this.prisma.mbcsStudent.findMany({
        where: { isActive: true, associationEndDate: null },
        include: {
          payments: {
            where: { paymentType: 'tuition', isActive: true },
            orderBy: { paymentMonth: 'desc' },
            take: 1,
          },
        },
      });

      for (const student of students) {
        const payments = student.payments;
        const lastPaymentMonth =
          payments.length > 0 ? dayjs(payments[0].paymentMonth) : null;

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
              payments.length > 0 ? payments[0].paymentDate : undefined,
          });
        }
      }
    } else if (org === Organization.MEC) {
      const students = await this.prisma.mecStudent.findMany({
        where: { isActive: true, associationEndDate: null },
        include: {
          payments: {
            where: { isActive: true },
            orderBy: { paymentMonth: 'desc' },
            take: 1,
          },
        },
      });

      for (const student of students) {
        const payments = student.payments;
        const lastPaymentMonth =
          payments.length > 0 ? dayjs(payments[0].paymentMonth) : null;

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
              payments.length > 0 ? payments[0].paymentDate : undefined,
          });
        }
      }
    }

    return outstanding;
  }
}
