import { apiGet } from "../lib/axios";

export interface RevenueStats {
  organization: string;
  studentPayments: number;
  teacherPayroll: number;
  staffPayroll: number;
  expenses: number;
  netRevenue: number;
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
  lastPaymentDate?: string;
}

export interface ExpenseBreakdown {
  organization: string;
  expenseType: string;
  total: number;
}

export interface AnalyticsFilters {
  organization?: string; // 'uac' | 'mbcs' | 'mec'
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

export const analyticsService = {
  getRevenueStats: (filters?: AnalyticsFilters) =>
    apiGet<RevenueStats | RevenueStats[]>("/analytics/revenue", { params: filters }),

  getMonthlyRevenueTrend: (filters?: AnalyticsFilters) =>
    apiGet<MonthlyRevenue[]>("/analytics/revenue/trend", { params: filters }),

  getOutstandingPayments: (filters?: AnalyticsFilters) =>
    apiGet<OutstandingPayment[]>("/analytics/outstanding", { params: filters }),

  getExpenseBreakdown: (filters?: AnalyticsFilters) =>
    apiGet<ExpenseBreakdown[]>("/analytics/expenses/breakdown", { params: filters }),
};
